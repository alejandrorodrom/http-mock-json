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
  expectEqual,
  expectMinDelay,
  expectHeader
} = require('../../lib/http-assert');

module.exports = {
  name: 'runtime/mock-config-folders',
  description: 'HTTP: folder prefix, delay and headers from mock.config.json',
  async run() {
    const startedAt = Date.now();
    const failures = [];
    const { workspaceDir, cleanup } = createWorkspace(null, { emptyMocksDir: true });
    const mocksDir = path.join(workspaceDir, 'mocks');

    fs.mkdirSync(path.join(mocksDir, 'users'), { recursive: true });

    fs.writeFileSync(
      path.join(mocksDir, 'mock.config.json'),
      `${ JSON.stringify({
        headers: {
          'X-Mock-Env': 'local'
        },
        folders: {
          users: {
            prefix: '/api/users',
            delay: 120,
            headers: {
              'X-Service': 'users'
            }
          }
        }
      }, null, 2) }\n`,
      'utf8'
    );

    fs.writeFileSync(
      path.join(mocksDir, 'users', 'auth.json'),
      `${ JSON.stringify({
        login: {
          POST: {
            nameResponse: 'ok',
            responses: [
              {
                name: 'ok',
                statusCode: 200,
                headers: { 'X-Request-Id': 'req-1' },
                body: { token: 'folder-ok' }
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
        timeoutMs: 20000
      });

      if (!server.stdout.includes('[POST] /api/users/login')) {
        failures.push('Expected registered route [POST] /api/users/login in stdout');
      }

      const started = Date.now();
      const response = await request(`${ server.baseUrl }/api/users/login`, {
        method: 'POST',
        json: {}
      });
      const elapsed = Date.now() - started;

      failures.push(...expectStatus(response.status, 200, 'POST /api/users/login'));
      failures.push(...expectEqual(response.body, { token: 'folder-ok' }, 'login body'));
      failures.push(...expectMinDelay(elapsed, 80, 'folder delay (~120ms)'));
      failures.push(...expectHeader(response.headers, 'x-mock-env', 'local', 'root default header'));
      failures.push(...expectHeader(response.headers, 'x-service', 'users', 'folder default header'));
      failures.push(...expectHeader(response.headers, 'x-request-id', 'req-1', 'response header'));
    } catch (error) {
      failures.push(error instanceof Error ? error.message : String(error));
    } finally {
      if (server) {
        await server.stop();
      }
      cleanup();
    }

    return {
      name: 'runtime/mock-config-folders',
      description: 'HTTP: folder prefix, delay and headers from mock.config.json',
      passed: failures.length === 0,
      failures,
      durationMs: Date.now() - startedAt,
      expectedOutcome: 'success'
    };
  }
};
