'use strict';

const fs = require('fs');
const path = require('path');
const { PROJECT_ROOT } = require('../../lib/execute-mock-file');
const { createWorkspace, startMockServer } = require('../../lib/server-harness');
const { request, expectStatus, expectEqual } = require('../../lib/http-assert');

const buildMultipart = (fields, files) => {
  const boundary = '----httpMockJsonPresetBoundary';
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
  name: 'runtime/add-presets',
  description: 'HTTP runtime for add --preset scaffolds (scenarios, auth, list, upload, relations, hybrid)',
  async run() {
    const startedAt = Date.now();
    const failures = [];

    const { structureScenariosMock } = require(
      path.join(PROJECT_ROOT, 'dist/src/cli/commands/add/structure-scenarios-mock.js')
    );
    const { structureAuthLoginMock } = require(
      path.join(PROJECT_ROOT, 'dist/src/cli/commands/add/structure-auth-login-mock.js')
    );
    const { structurePaginatedListMock } = require(
      path.join(PROJECT_ROOT, 'dist/src/cli/commands/add/structure-paginated-list-mock.js')
    );
    const { structureUploadMock } = require(
      path.join(PROJECT_ROOT, 'dist/src/cli/commands/add/structure-upload-mock.js')
    );
    const { structureRelationsMock } = require(
      path.join(PROJECT_ROOT, 'dist/src/cli/commands/add/structure-relations-mock.js')
    );
    const { structureProxyHybridMock } = require(
      path.join(PROJECT_ROOT, 'dist/src/cli/commands/add/structure-proxy-hybrid-mock.js')
    );

    const { workspaceDir, mocksDir, cleanup } = createWorkspace(null);
    let stop = null;

    try {
      fs.writeFileSync(
        path.join(mocksDir, 'preset-scenarios.json'),
        JSON.stringify(structureScenariosMock('demo'), null, 2)
      );
      fs.writeFileSync(
        path.join(mocksDir, 'preset-auth.json'),
        JSON.stringify(structureAuthLoginMock('api/auth/login'), null, 2)
      );
      fs.writeFileSync(
        path.join(mocksDir, 'preset-list.json'),
        JSON.stringify(structurePaginatedListMock('api/items'), null, 2)
      );
      fs.writeFileSync(
        path.join(mocksDir, 'preset-upload.json'),
        JSON.stringify(structureUploadMock('api/uploads'), null, 2)
      );
      fs.writeFileSync(
        path.join(mocksDir, 'preset-rel.json'),
        JSON.stringify(structureRelationsMock('api/users'), null, 2)
      );

      const hybrid = structureProxyHybridMock('api/notes');
      hybrid['api/notes/live'].GET.nameResponse = 'offline';
      fs.writeFileSync(
        path.join(mocksDir, 'preset-hybrid.json'),
        JSON.stringify(hybrid, null, 2)
      );

      const started = await startMockServer({
        workspaceDir,
        cleanup: () => undefined,
        resolveWhen: (stdout) => stdout.includes('Mock server is running')
      });
      stop = started.stop;
      const base = `http://127.0.0.1:${ started.port }`;

      // scenarios
      {
        const ok = await request(`${ base }/demo?scenario=ok`);
        failures.push(...expectStatus(ok.status, 200, 'scenarios ok'));
        failures.push(...expectEqual(ok.body?.scenario, 'ok', 'scenarios ok body'));

        const missing = await request(`${ base }/demo?scenario=missing`);
        failures.push(...expectStatus(missing.status, 404, 'scenarios missing'));

        const fallback = await request(`${ base }/demo`);
        failures.push(...expectStatus(fallback.status, 200, 'scenarios fallback'));
        failures.push(...expectEqual(
          Boolean(fallback.body?.note),
          true,
          'scenarios fallback note'
        ));
      }

      // auth-login
      {
        const success = await request(`${ base }/api/auth/login`, {
          method: 'POST',
          json: { email: 'user@example.com', password: 'password123' }
        });
        failures.push(...expectStatus(success.status, 200, 'auth success'));
        failures.push(...expectEqual(success.body?.token, 'tok_demo', 'auth token'));

        const forbidden = await request(`${ base }/api/auth/login`, {
          method: 'POST',
          json: { email: 'blocked@example.com', password: 'password123' }
        });
        failures.push(...expectStatus(forbidden.status, 403, 'auth forbidden'));

        const unauthorized = await request(`${ base }/api/auth/login`, {
          method: 'POST',
          json: { email: 'other@example.com', password: 'password123' }
        });
        failures.push(...expectStatus(unauthorized.status, 401, 'auth unauthorized'));

        const invalid = await request(`${ base }/api/auth/login`, {
          method: 'POST',
          json: { email: 'bad', password: 'x' }
        });
        failures.push(...expectStatus(invalid.status, 400, 'auth invalid'));
      }

      // paginated-list (seed: 2 active, 2 draft, 1 archived)
      {
        const page = await request(`${ base }/api/items?page=1&pageSize=2&status=active`);
        failures.push(...expectStatus(page.status, 200, 'list page'));
        if (!Array.isArray(page.body?.data) || page.body.data.length !== 2) {
          failures.push(
            `list page: expected 2 active items, got ${ JSON.stringify(page.body?.data) }`
          );
        }
        failures.push(...expectEqual(page.body?.total, 2, 'list active total'));

        const search = await request(`${ base }/api/items?q=alp`);
        failures.push(...expectStatus(search.status, 200, 'list search'));
        if (!Array.isArray(search.body?.data) || search.body.data.length < 1) {
          failures.push(`list search: expected Alpha hit, got ${ JSON.stringify(search.body) }`);
        }
      }

      // upload
      {
        const multipart = buildMultipart(
          { title: 'logo' },
          [{
            name: 'file',
            filename: 'logo.txt',
            contentType: 'text/plain',
            body: Buffer.from('hi')
          }]
        );
        const created = await request(`${ base }/api/uploads`, {
          method: 'POST',
          headers: {
            'Content-Type': `multipart/form-data; boundary=${ multipart.boundary }`
          },
          body: multipart.body
        });
        failures.push(...expectStatus(created.status, 201, 'upload create'));
        failures.push(...expectEqual(
          created.body?.downloadUrl,
          '/api/uploads/file_1',
          'upload downloadUrl'
        ));

        const download = await request(`${ base }/api/uploads/file_1`, { as: 'buffer' });
        failures.push(...expectStatus(download.status, 200, 'upload download'));
        const text = Buffer.isBuffer(download.body)
          ? download.body.toString('utf8')
          : String(download.body ?? '');
        if (text !== 'hello upload') {
          failures.push(`upload download: expected "hello upload", got ${ JSON.stringify(text) }`);
        }
      }

      // relations
      {
        const ada = await request(`${ base }/api/users/1?expand=posts`);
        failures.push(...expectStatus(ada.status, 200, 'relations user expand'));
        failures.push(...expectEqual(ada.body?.name, 'Ada', 'relations user name'));
        if (!Array.isArray(ada.body?.posts) || ada.body.posts.length < 1) {
          failures.push(
            `relations expand: expected Ada.posts, got ${ JSON.stringify(ada.body) }`
          );
        }

        const del = await request(`${ base }/api/users/1`, { method: 'DELETE' });
        failures.push(...expectStatus(del.status, 409, 'relations delete restrict'));
      }

      // proxy-hybrid local + offline sibling (no upstream network)
      {
        const local = await request(`${ base }/api/notes`);
        failures.push(...expectStatus(local.status, 200, 'hybrid local'));
        failures.push(...expectEqual(local.body?.source, 'mock', 'hybrid local source'));

        const offline = await request(`${ base }/api/notes/live`);
        failures.push(...expectStatus(offline.status, 503, 'hybrid offline'));
      }
    } catch (error) {
      failures.push(error instanceof Error ? error.message : String(error));
    } finally {
      if (stop) {
        await stop();
      }
      cleanup();
    }

    return {
      name: 'runtime/add-presets',
      description: 'HTTP runtime for add --preset scaffolds (scenarios, auth, list, upload, relations, hybrid)',
      passed: failures.length === 0,
      failures,
      durationMs: Date.now() - startedAt,
      expectedOutcome: 'success'
    };
  }
};
