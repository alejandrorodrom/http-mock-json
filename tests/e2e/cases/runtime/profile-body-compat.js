'use strict';

const path = require('path');
const fs = require('fs');
const { createWorkspace, startMockServer } = require('../../lib/server-harness');
const { expectStatus, expectEqual } = require('../../lib/http-assert');

const PNG = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
  0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52
]);

const buildMultipart = (fields, files) => {
  const boundary = '----profileBodyCompat';
  const chunks = [];

  for (const [name, value] of Object.entries(fields)) {
    chunks.push(
      `--${ boundary }\r\n`
      + `Content-Disposition: form-data; name="${ name }"\r\n\r\n`
      + `${ value }\r\n`
    );
  }

  for (const file of files) {
    chunks.push(
      `--${ boundary }\r\n`
      + `Content-Disposition: form-data; name="${ file.name }"; filename="${ file.filename }"\r\n`
      + `Content-Type: ${ file.contentType }\r\n\r\n`
    );
    chunks.push(file.body);
    chunks.push('\r\n');
  }

  chunks.push(`--${ boundary }--\r\n`);
  return {
    boundary,
    body: Buffer.concat(chunks.map((part) => (Buffer.isBuffer(part) ? part : Buffer.from(part))))
  };
};

module.exports = {
  name: 'runtime/profile-body-compat',
  description: 'HTTP: real profile flow — multipart create, avatar file, raw put, validation',
  async run() {
    const startedAt = Date.now();
    const failures = [];
    const repoRoot = path.resolve(__dirname, '../../../..');
    const { workspaceDir, cleanup } = createWorkspace(null, { emptyMocksDir: true });
    const mocksDir = path.join(workspaceDir, 'mocks');
    const assetsDir = path.join(mocksDir, 'assets');
    fs.mkdirSync(assetsDir, { recursive: true });
    fs.copyFileSync(
      path.join(repoRoot, 'mocks/assets/sample.png'),
      path.join(assetsDir, 'sample.png')
    );
    fs.copyFileSync(
      path.join(repoRoot, 'mocks/44-profile-body-compat.json'),
      path.join(mocksDir, '44-profile-body-compat.json')
    );

    let server;

    try {
      server = await startMockServer({
        workspaceDir,
        cleanup,
        cleanupOnStop: false,
        timeoutMs: 25000
      });

      const base = server.baseUrl;
      const samplePng = fs.readFileSync(path.join(assetsDir, 'sample.png'));

      const okForm = buildMultipart(
        {
          name: 'Ada',
          email: 'ada@example.com',
          age: '30',
          role: 'member'
        },
        [
          {
            name: 'avatar',
            filename: 'ada.png',
            contentType: 'image/png',
            body: PNG
          }
        ]
      );
      const created = await fetch(`${ base }/api/profiles`, {
        method: 'POST',
        headers: { 'Content-Type': `multipart/form-data; boundary=${ okForm.boundary }` },
        body: okForm.body
      });
      const createdJson = await created.json();
      failures.push(...expectStatus(created.status, 201, 'profile create'));
      failures.push(...expectEqual(
        createdJson.avatarUrl,
        '/api/profiles/prof_1/avatar',
        'profile avatarUrl'
      ));

      const taken = buildMultipart(
        {
          name: 'Taken',
          email: 'taken@example.com',
          role: 'member'
        },
        [
          {
            name: 'avatar',
            filename: 't.png',
            contentType: 'image/png',
            body: PNG
          }
        ]
      );
      const dup = await fetch(`${ base }/api/profiles`, {
        method: 'POST',
        headers: { 'Content-Type': `multipart/form-data; boundary=${ taken.boundary }` },
        body: taken.body
      });
      failures.push(...expectStatus(dup.status, 409, 'profile duplicate email'));

      const bad = buildMultipart(
        {
          name: 'A',
          email: 'bad',
          role: 'guest'
        },
        []
      );
      const invalid = await fetch(`${ base }/api/profiles`, {
        method: 'POST',
        headers: { 'Content-Type': `multipart/form-data; boundary=${ bad.boundary }` },
        body: bad.body
      });
      const invalidJson = await invalid.json();
      failures.push(...expectStatus(invalid.status, 422, 'profile validation'));
      if (!invalidJson.fields || typeof invalidJson.fields !== 'object') {
        failures.push(`profile validation fields missing: ${ JSON.stringify(invalidJson) }`);
      }

      const avatar = await fetch(`${ base }/api/profiles/prof_1/avatar`);
      const avatarBuf = Buffer.from(await avatar.arrayBuffer());
      failures.push(...expectStatus(avatar.status, 200, 'avatar get'));
      if (!avatarBuf.equals(samplePng)) {
        failures.push('avatar file bytes mismatch');
      }

      const rawOk = await fetch(`${ base }/api/profiles/prof_1/avatar`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'image/png',
          'x-upload-token': 'token-ok'
        },
        body: PNG
      });
      failures.push(...expectStatus(rawOk.status, 200, 'avatar raw put'));

      const rawBad = await fetch(`${ base }/api/profiles/prof_1/avatar`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-upload-token': 'token-ok'
        },
        body: JSON.stringify({ no: true })
      });
      failures.push(...expectStatus(rawBad.status, 415, 'avatar raw as mismatch'));

      const admin = await fetch(`${ base }/api/profiles/prof_1`, {
        headers: { 'x-role': 'admin' }
      });
      const adminJson = await admin.json();
      failures.push(...expectStatus(admin.status, 200, 'profile admin'));
      if (!adminJson.internalNotes) {
        failures.push('admin profile should include internalNotes');
      }

      const pub = await fetch(`${ base }/api/profiles/prof_1`);
      const pubJson = await pub.json();
      failures.push(...expectStatus(pub.status, 200, 'profile public'));
      if (pubJson.internalNotes) {
        failures.push('public profile must not include internalNotes');
      }
    } catch (error) {
      failures.push(error instanceof Error ? error.message : String(error));
    } finally {
      if (server) {
        await server.stop();
      }
      cleanup();
    }

    return {
      name: 'runtime/profile-body-compat',
      description: 'HTTP: real profile flow — multipart create, avatar file, raw put, validation',
      passed: failures.length === 0,
      failures,
      durationMs: Date.now() - startedAt,
      expectedOutcome: 'success'
    };
  }
};
