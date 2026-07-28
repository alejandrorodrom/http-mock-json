'use strict';

const {
  createWorkspace,
  startMockServer,
  MOCK_CONFIG_FIXTURE
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
  description: 'HTTP: folder prefix, delay and headers from mocks/mock-config',
  async run() {
    const startedAt = Date.now();
    const failures = [];
    const { workspaceDir, cleanup } = createWorkspace(null, {
      copyTree: MOCK_CONFIG_FIXTURE
    });

    let server;

    try {
      server = await startMockServer({
        workspaceDir,
        cleanup,
        cleanupOnStop: false,
        cliPath: MOCK_CONFIG_FIXTURE,
        timeoutMs: 20000
      });

      if (!server.stdout.includes('[POST] /api/auth/login')) {
        failures.push('Expected registered route [POST] /api/auth/login in stdout');
      }

      const started = Date.now();
      const response = await request(`${ server.baseUrl }/api/auth/login`, {
        method: 'POST',
        json: { email: 'a@b.com', password: 'secret1' }
      });
      const elapsed = Date.now() - started;

      failures.push(...expectStatus(response.status, 200, 'POST /api/auth/login'));
      failures.push(...expectEqual(response.body, { token: 'tok_demo' }, 'login body'));
      failures.push(...expectMinDelay(elapsed, 60, 'folder delay (~90ms)'));
      failures.push(...expectHeader(response.headers, 'x-mock-app', 'food-delivery', 'root default header'));
      failures.push(...expectHeader(response.headers, 'x-service', 'auth', 'folder default header'));
      failures.push(...expectHeader(response.headers, 'x-request-id', 'login-1', 'response header'));
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
      description: 'HTTP: folder prefix, delay and headers from mocks/mock-config',
      passed: failures.length === 0,
      failures,
      durationMs: Date.now() - startedAt,
      expectedOutcome: 'success'
    };
  }
};
