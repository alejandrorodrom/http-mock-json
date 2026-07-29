'use strict';

const path = require('path');
const fs = require('fs');
const { createWorkspace, startMockServer } = require('../../lib/server-harness');
const { expectStatus, expectEqual } = require('../../lib/http-assert');

const buildMultipart = (fields, files) => {
  const boundary = '----httpMockJsonBoundary';
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
    body: Buffer.concat(chunks.map((part) => Buffer.isBuffer(part) ? part : Buffer.from(part)))
  };
};

module.exports = {
  name: 'runtime/request-multipart',
  description: 'HTTP: multipart/file/raw/text validation, edge MIME/type-field/limits',
  async run() {
    const startedAt = Date.now();
    const failures = [];
    const repoRoot = path.resolve(__dirname, '../../../..');
    const { workspaceDir, cleanup } = createWorkspace(null, { emptyMocksDir: true });
    const mocksDir = path.join(workspaceDir, 'mocks');
    fs.copyFileSync(
      path.join(repoRoot, 'mocks/42-request-multipart.json'),
      path.join(mocksDir, '42-request-multipart.json')
    );

    let server;

    try {
      server = await startMockServer({
        workspaceDir,
        cleanup,
        cleanupOnStop: false,
        timeoutMs: 20000
      });

      const png = Buffer.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d
      ]);

      const okMultipart = buildMultipart(
        { title: 'hello' },
        [{ name: 'avatar', filename: 'a.png', contentType: 'image/png', body: png }]
      );
      const okRes = await fetch(`${ server.baseUrl }/api/upload`, {
        method: 'POST',
        headers: { 'Content-Type': `multipart/form-data; boundary=${ okMultipart.boundary }` },
        body: okMultipart.body
      });
      const okJson = await okRes.json();
      failures.push(...expectStatus(okRes.status, 201, 'multipart valid status'));
      failures.push(...expectEqual(okJson, { ok: true }, 'multipart valid body'));

      const matchMultipart = buildMultipart(
        { title: 'logo' },
        [{ name: 'avatar', filename: 'logo.png', contentType: 'image/png', body: png }]
      );
      const matchRes = await fetch(`${ server.baseUrl }/api/upload`, {
        method: 'POST',
        headers: { 'Content-Type': `multipart/form-data; boundary=${ matchMultipart.boundary }` },
        body: matchMultipart.body
      });
      const matchJson = await matchRes.json();
      failures.push(...expectStatus(matchRes.status, 201, 'multipart match status'));
      failures.push(...expectEqual(matchJson, { matched: 'png' }, 'multipart match body'));

      const asMismatch = await fetch(`${ server.baseUrl }/api/upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'x' })
      });
      failures.push(...expectStatus(asMismatch.status, 400, 'as mismatch status'));

      const rawOk = await fetch(`${ server.baseUrl }/api/raw`, {
        method: 'PUT',
        headers: { 'Content-Type': 'image/png' },
        body: png
      });
      failures.push(...expectStatus(rawOk.status, 200, 'raw png status'));

      const rawBad = await fetch(`${ server.baseUrl }/api/raw`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ no: true })
      });
      failures.push(...expectStatus(rawBad.status, 415, 'raw as mismatch status'));

      const textOk = await fetch(`${ server.baseUrl }/api/text`, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: 'hi'
      });
      failures.push(...expectStatus(textOk.status, 200, 'text ok status'));

      const textMatch = await fetch(`${ server.baseUrl }/api/text`, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: 'hello'
      });
      const textMatchJson = await textMatch.json();
      failures.push(...expectStatus(textMatch.status, 200, 'text match.body status'));
      failures.push(...expectEqual(textMatchJson, { matched: 'hello' }, 'text match.body body'));

      const textBad = await fetch(`${ server.baseUrl }/api/text`, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: 'x'
      });
      failures.push(...expectStatus(textBad.status, 400, 'text minLength status'));

      const admin = await fetch(`${ server.baseUrl }/api/headers-gate`, {
        headers: { 'x-role': 'admin' }
      });
      const adminJson = await admin.json();
      failures.push(...expectStatus(admin.status, 200, 'headers match status'));
      failures.push(...expectEqual(adminJson, { role: 'admin' }, 'headers match body'));

      const guest = await fetch(`${ server.baseUrl }/api/headers-gate`);
      const guestJson = await guest.json();
      failures.push(...expectStatus(guest.status, 200, 'headers fallback status'));
      failures.push(...expectEqual(guestJson, { role: 'guest' }, 'headers fallback body'));

      const zipBody = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x00, 0x00]);
      const zipOk = await fetch(`${ server.baseUrl }/api/raw-zip`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/zip' },
        body: zipBody
      });
      failures.push(...expectStatus(zipOk.status, 200, 'raw zip custom mime status'));

      const zipWrongMime = await fetch(`${ server.baseUrl }/api/raw-zip`, {
        method: 'PUT',
        headers: { 'Content-Type': 'image/png' },
        body: png
      });
      failures.push(...expectStatus(zipWrongMime.status, 400, 'raw zip format mismatch status'));

      const rawStringOk = await fetch(`${ server.baseUrl }/api/raw-string`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/xml' },
        body: '<ok/>'
      });
      failures.push(...expectStatus(rawStringOk.status, 200, 'raw string body status'));

      const rawStringShort = await fetch(`${ server.baseUrl }/api/raw-string`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/xml' },
        body: 'x'
      });
      failures.push(...expectStatus(rawStringShort.status, 400, 'raw string minLength status'));

      const typeFieldOk = await fetch(`${ server.baseUrl }/api/json-type-field`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'user' })
      });
      const typeFieldOkJson = await typeFieldOk.json();
      failures.push(...expectStatus(typeFieldOk.status, 200, 'json field named type status'));
      failures.push(...expectEqual(typeFieldOkJson, { ok: true }, 'json field named type body'));

      const typeFieldMissing = await fetch(`${ server.baseUrl }/api/json-type-field`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      failures.push(...expectStatus(typeFieldMissing.status, 400, 'json field named type required status'));

      const tooManyFiles = buildMultipart(
        { title: 'bulk' },
        Array.from({ length: 21 }, (_, index) => ({
          name: 'avatar',
          filename: `f${ index }.png`,
          contentType: 'image/png',
          body: png
        }))
      );
      const tooManyRes = await fetch(`${ server.baseUrl }/api/upload`, {
        method: 'POST',
        headers: { 'Content-Type': `multipart/form-data; boundary=${ tooManyFiles.boundary }` },
        body: tooManyFiles.body
      });
      const tooManyJson = await tooManyRes.json();
      failures.push(...expectStatus(tooManyRes.status, 400, 'multipart files limit status'));
      failures.push(...expectEqual(tooManyJson.message, 'Invalid upload', 'multipart files limit uses error.response'));
      failures.push(...expectEqual(
        Array.isArray(tooManyJson.errors)
          && tooManyJson.errors.some((item) => (
            item && typeof item.message === 'string' && item.message.includes('files limit')
          )),
        true,
        'multipart files limit issue message'
      ));

      const oversize = Buffer.alloc((10 * 1024 * 1024) + 1, 1);
      const oversizeRes = await fetch(`${ server.baseUrl }/api/raw-zip`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/zip' },
        body: oversize
      });
      failures.push(...expectStatus(oversizeRes.status, 413, 'raw body oversize status'));
    } catch (error) {
      failures.push(error instanceof Error ? error.message : String(error));
    } finally {
      if (server) {
        await server.stop();
      }
      cleanup();
    }

    return {
      name: 'runtime/request-multipart',
      description: 'HTTP: multipart/file/raw/text validation, edge MIME/type-field/limits',
      passed: failures.length === 0,
      failures,
      durationMs: Date.now() - startedAt,
      expectedOutcome: 'success'
    };
  }
};
