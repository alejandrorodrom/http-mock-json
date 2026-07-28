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

module.exports = {
  name: 'system/start-custom-path',
  description: 'CLI start -f apps/folder1 loads apps/folder1/mocks',
  async run() {
    const startedAt = Date.now();
    const failures = [];
    const { workspaceDir, cleanup } = createWorkspace(null, { skipMocksDir: true });
    const cliPath = path.join('apps', 'folder1');
    const mocksDir = path.join(workspaceDir, cliPath, 'mocks');

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
                body: { ok: true, via: 'custom-path' }
              }
            ]
          }
        }
      }, null, 2) }\n`,
      'utf8'
    );

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
        failures.push('Expected registered route [GET] /ping in stdout');
      }

      const result = await request(`${ server.baseUrl }/ping`, {
        method: 'GET'
      });

      failures.push(...expectStatus(result.status, 200, 'GET /ping via custom -f'));
      failures.push(...expectEqual(result.body?.via, 'custom-path', 'body.via'));
    } catch (error) {
      failures.push(error instanceof Error ? error.message : String(error));
    } finally {
      if (server) {
        await server.stop();
      }
      cleanup();
    }

    return {
      name: 'system/start-custom-path',
      description: 'CLI start -f apps/folder1 loads apps/folder1/mocks',
      passed: failures.length === 0,
      failures,
      durationMs: Date.now() - startedAt,
      expectedOutcome: 'success'
    };
  }
};
