'use strict';

const fs = require('fs');
const path = require('path');
const {
  createWorkspace,
  startMockServer
} = require('../../lib/server-harness');
const {
  request,
  expectStatus,
  expectEqual
} = require('../../lib/http-assert');

/**
 * @param {string} workspaceDir
 * @param {string} relativeMocksDir
 * @param {string} via
 */
function writeHealthMock(workspaceDir, relativeMocksDir, via) {
  const mocksDir = path.join(workspaceDir, relativeMocksDir);
  fs.mkdirSync(mocksDir, { recursive: true });
  fs.writeFileSync(
    path.join(mocksDir, 'health.json'),
    `${ JSON.stringify({
      ping: {
        GET: {
          nameResponse: 'ok',
          responses: [
            {
              name: 'ok',
              statusCode: 200,
              body: { ok: true, via }
            }
          ]
        }
      }
    }, null, 2) }\n`,
    'utf8'
  );
}

module.exports = {
  name: 'system/start-custom-path',
  description: 'CLI start -f uses the mocks directory path (custom name + nested)',
  async run() {
    const startedAt = Date.now();
    const failures = [];

    // 1) Custom directory name: -f api-mocks → ./api-mocks
    {
      const { workspaceDir, cleanup } = createWorkspace(null, { skipMocksDir: true });
      const cliPath = 'api-mocks';
      writeHealthMock(workspaceDir, cliPath, 'custom-name');

      let server;

      try {
        server = await startMockServer({
          workspaceDir,
          cleanup,
          cleanupOnStop: false,
          cliPath,
          timeoutMs: 20000
        });

        if (!server.stdout.includes('[GET] /ping')) {
          failures.push('[custom-name] Expected registered route [GET] /ping in stdout');
        }

        const result = await request(`${ server.baseUrl }/ping`, {
          method: 'GET'
        });

        failures.push(...expectStatus(result.status, 200, '[custom-name] GET /ping'));
        failures.push(...expectEqual(result.body?.via, 'custom-name', '[custom-name] body.via'));
      } catch (error) {
        failures.push(`[custom-name] ${ error instanceof Error ? error.message : String(error) }`);
      } finally {
        if (server) {
          await server.stop();
        }
        cleanup();
      }
    }

    // 2) Nested path: -f apps/folder1/mocks → ./apps/folder1/mocks
    {
      const { workspaceDir, cleanup } = createWorkspace(null, { skipMocksDir: true });
      const cliPath = path.join('apps', 'folder1', 'mocks');
      writeHealthMock(workspaceDir, cliPath, 'custom-path');

      let server;

      try {
        server = await startMockServer({
          workspaceDir,
          cleanup,
          cleanupOnStop: false,
          cliPath,
          timeoutMs: 20000
        });

        if (!server.stdout.includes('[GET] /ping')) {
          failures.push('[nested] Expected registered route [GET] /ping in stdout');
        }

        const result = await request(`${ server.baseUrl }/ping`, {
          method: 'GET'
        });

        failures.push(...expectStatus(result.status, 200, '[nested] GET /ping'));
        failures.push(...expectEqual(result.body?.via, 'custom-path', '[nested] body.via'));
      } catch (error) {
        failures.push(`[nested] ${ error instanceof Error ? error.message : String(error) }`);
      } finally {
        if (server) {
          await server.stop();
        }
        cleanup();
      }
    }

    return {
      name: 'system/start-custom-path',
      description: 'CLI start -f uses the mocks directory path (custom name + nested)',
      passed: failures.length === 0,
      failures,
      durationMs: Date.now() - startedAt,
      expectedOutcome: 'success'
    };
  }
};
