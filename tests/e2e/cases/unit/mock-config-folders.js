'use strict';

const path = require('path');
const { runUnitUseCase, PROJECT_ROOT } = require('../../lib/execute-mock-file');
const {
  createWorkspace,
  MOCK_CONFIG_FIXTURE
} = require('../../lib/server-harness');

module.exports = {
  name: 'unit/mock-config-folders',
  description: 'getMocksData applies folder prefix/delay/headers from mocks/mock-config',
  run: () => runUnitUseCase({
    name: 'unit/mock-config-folders',
    description: 'getMocksData applies folder prefix/delay/headers from mocks/mock-config',
    expectedOutcome: 'success',
    async assert() {
      const { getMocksData } = require(
        path.join(PROJECT_ROOT, 'dist/src/cli/commands/start/files.js')
      );
      const { mocksDir, cleanup } = createWorkspace(null, {
        copyTree: MOCK_CONFIG_FIXTURE
      });
      const failures = [];

      try {
        const originalLog = console.log;
        console.log = () => undefined;

        let result;
        try {
          result = getMocksData(mocksDir);
        } finally {
          console.log = originalLog;
        }

        const loginApi = result.apis.find(
          api => api.route === '/api/auth/login' && api.method === 'post'
        );
        const healthApi = result.apis.find(
          api => api.route === '/health' && api.method === 'get'
        );

        if (!loginApi) {
          failures.push(
            `Expected /api/auth/login. Got routes: ${ result.apis.map(api => api.route).join(', ') }`
          );
        } else if (loginApi.delay !== 90) {
          failures.push(`Expected auth folder delay 90, got ${ loginApi.delay }`);
        } else {
          const headers = loginApi.responses[0]?.headers ?? {};
          if (headers['X-Mock-App'] !== 'food-delivery') {
            failures.push(
              `Expected merged root header X-Mock-App=food-delivery, got ${ JSON.stringify(headers) }`
            );
          }
          if (headers['X-Service'] !== 'auth') {
            failures.push(
              `Expected folder header X-Service=auth, got ${ JSON.stringify(headers) }`
            );
          }
          if (headers['X-Request-Id'] !== 'login-1') {
            failures.push(
              `Expected response header X-Request-Id=login-1, got ${ JSON.stringify(headers) }`
            );
          }
        }

        if (!healthApi) {
          failures.push('Expected /health from root mock file');
        } else if (healthApi.delay !== 40) {
          failures.push(`Expected root delay 40, got ${ healthApi.delay }`);
        } else if (healthApi.responses[0]?.headers?.['X-Mock-App'] !== 'food-delivery') {
          failures.push(
            `Expected root health header X-Mock-App=food-delivery, got ${ JSON.stringify(healthApi.responses[0]?.headers) }`
          );
        }
      } finally {
        cleanup();
      }

      return failures;
    }
  })
};
