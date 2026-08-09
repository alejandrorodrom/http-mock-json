'use strict';

const fs = require('fs');
const path = require('path');
const { PROJECT_ROOT } = require('../../lib/execute-mock-file');
const { createWorkspace, startMockServer } = require('../../lib/server-harness');
const { request, expectStatus, expectEqual } = require('../../lib/http-assert');
const { stripAnsi } = require('../../lib/strip-ansi');

const FIXTURE = path.join(
  PROJECT_ROOT,
  'tests/e2e/fixtures/openapi/pets-with-request.yaml'
);

const buildMultipart = (fields, files) => {
  const boundary = '----httpMockJsonImportBoundary';
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
  name: 'runtime/import-openapi-request',
  description: 'Imported OpenAPI request rules enforce payload/query/headers/multipart at runtime',
  async run() {
    const startedAt = Date.now();
    const failures = [];
    const { importOpenApi } = require(
      path.join(PROJECT_ROOT, 'dist/src/cli/commands/import/import-openapi.js')
    );

    const { workspaceDir, cleanup } = createWorkspace(null, { skipMocksDir: true });
    const previousCwd = process.cwd();
    const logs = [];
    const originalLog = console.log;
    let server;

    console.log = (...args) => {
      logs.push(stripAnsi(args.map(String).join(' ')));
    };

    try {
      process.chdir(workspaceDir);

      await importOpenApi({
        path: 'mocks',
        openapi: FIXTURE,
        serverPrefix: false,
        overwrite: true
      });

      const petsFile = path.join(workspaceDir, 'mocks', 'pets.json');
      if (!fs.existsSync(petsFile)) {
        failures.push(`Expected imported mocks/pets.json at ${ petsFile }`);
      } else {
        const pets = JSON.parse(fs.readFileSync(petsFile, 'utf8'));
        if (!pets.pets?.POST?.request?.payload?.email) {
          failures.push('Imported POST /pets must include request.payload.email');
        }
        if (pets.uploads?.POST?.request?.as !== 'multipart') {
          failures.push('Imported POST /uploads must have as: multipart');
        }
      }

      if (failures.length === 0) {
        server = await startMockServer({
          workspaceDir,
          cleanup,
          cleanupOnStop: false,
          cliPath: 'mocks',
          timeoutMs: 25000
        });

        const invalid = await request(`${ server.baseUrl }/pets`, {
          method: 'POST',
          json: { name: 'x', email: 'not-an-email' }
        });
        failures.push(...expectStatus(invalid.status, 400, 'invalid email → 400'));
        if (!invalid.body || typeof invalid.body !== 'object') {
          failures.push(
            `Expected JSON error body for invalid POST, got: ${ JSON.stringify(invalid.body) }`
          );
        }

        const missing = await request(`${ server.baseUrl }/pets`, {
          method: 'POST',
          json: { name: 'ok-name' }
        });
        failures.push(...expectStatus(missing.status, 400, 'missing email → 400'));

        const shortName = await request(`${ server.baseUrl }/pets`, {
          method: 'POST',
          json: { name: 'x', email: 'owner@example.com' }
        });
        failures.push(...expectStatus(shortName.status, 400, 'minLength name → 400'));

        const ageOutOfRange = await request(`${ server.baseUrl }/pets`, {
          method: 'POST',
          json: { name: 'doggie', email: 'owner@example.com', age: 99 }
        });
        failures.push(...expectStatus(ageOutOfRange.status, 400, 'age max → 400'));

        const valid = await request(`${ server.baseUrl }/pets`, {
          method: 'POST',
          json: { name: 'doggie', email: 'owner@example.com', age: 3 }
        });
        failures.push(...expectStatus(valid.status, 201, 'valid create → 201'));
        failures.push(...expectEqual(valid.body?.name, 'doggie', 'created name'));

        const badQuery = await request(`${ server.baseUrl }/pets?status=nope`);
        failures.push(...expectStatus(badQuery.status, 400, 'invalid enum query → 400'));

        const okQuery = await request(`${ server.baseUrl }/pets?status=available`);
        failures.push(...expectStatus(okQuery.status, 200, 'valid enum query → 200'));

        const badHeader = await request(`${ server.baseUrl }/pets`, {
          headers: { 'X-Request-Id': 'not-a-uuid' }
        });
        failures.push(...expectStatus(badHeader.status, 400, 'invalid uuid header → 400'));

        const okHeader = await request(`${ server.baseUrl }/pets`, {
          headers: { 'X-Request-Id': '123e4567-e89b-12d3-a456-426614174000' }
        });
        failures.push(...expectStatus(okHeader.status, 200, 'valid uuid header → 200'));

        const missingFile = buildMultipart({ note: 'hi' }, []);
        const multipartMissing = await request(`${ server.baseUrl }/uploads`, {
          method: 'POST',
          headers: { 'Content-Type': `multipart/form-data; boundary=${ missingFile.boundary }` },
          body: missingFile.body
        });
        failures.push(...expectStatus(multipartMissing.status, 400, 'multipart missing file → 400'));

        const png = Buffer.from(
          'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
          'base64'
        );
        const withFile = buildMultipart(
          {},
          [{ name: 'file', filename: 'a.png', contentType: 'image/png', body: png }]
        );
        const multipartOk = await request(`${ server.baseUrl }/uploads`, {
          method: 'POST',
          headers: { 'Content-Type': `multipart/form-data; boundary=${ withFile.boundary }` },
          body: withFile.body
        });
        failures.push(...expectStatus(multipartOk.status, 200, 'multipart with file → 200'));

        const wrongAs = await request(`${ server.baseUrl }/token`, {
          method: 'POST',
          json: { username: 'ab', password: 'secret' }
        });
        failures.push(...expectStatus(wrongAs.status, 400, 'JSON body on as:form → 400'));

        const formOk = await request(`${ server.baseUrl }/token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: 'username=ab&password=secret'
        });
        failures.push(...expectStatus(formOk.status, 200, 'form-urlencoded valid → 200'));

        const formShort = await request(`${ server.baseUrl }/token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: 'username=a&password=secret'
        });
        failures.push(...expectStatus(formShort.status, 400, 'form minLength username → 400'));
      }
    } catch (error) {
      failures.push(error instanceof Error ? error.message : String(error));
    } finally {
      console.log = originalLog;
      process.chdir(previousCwd);
      if (server) {
        await server.stop();
      }
      cleanup();
    }

    return {
      name: 'runtime/import-openapi-request',
      description: 'Imported OpenAPI request rules enforce payload/query/headers/multipart at runtime',
      passed: failures.length === 0,
      failures,
      durationMs: Date.now() - startedAt,
      expectedOutcome: 'success'
    };
  }
};
