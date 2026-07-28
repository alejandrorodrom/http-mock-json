'use strict';

const fs = require('fs');
const path = require('path');
const { runUnitUseCase, PROJECT_ROOT } = require('../../lib/execute-mock-file');
const { createWorkspace } = require('../../lib/server-harness');

module.exports = {
  name: 'unit/mock-config-folders',
  description: 'getMocksData applies folder prefix/delay/headers from mock.config.json',
  run: () => runUnitUseCase({
    name: 'unit/mock-config-folders',
    description: 'getMocksData applies folder prefix/delay/headers from mock.config.json',
    expectedOutcome: 'success',
    async assert() {
      const { getMocksData } = require(
        path.join(PROJECT_ROOT, 'dist/src/cli/commands/start/files.js')
      );
      const { workspaceDir, cleanup } = createWorkspace(null, { emptyMocksDir: true });
      const mocksDir = path.join(workspaceDir, 'mocks');
      const failures = [];

      try {
        fs.mkdirSync(path.join(mocksDir, 'users'), { recursive: true });

        fs.writeFileSync(
          path.join(mocksDir, 'mock.config.json'),
          `${ JSON.stringify({
            delay: 50,
            headers: {
              'X-Mock-Env': 'local'
            },
            folders: {
              users: {
                prefix: '/api/users',
                delay: 200,
                headers: {
                  'X-Service': 'users'
                }
              }
            }
          }, null, 2) }\n`,
          'utf8'
        );

        fs.writeFileSync(
          path.join(mocksDir, 'users', 'login.json'),
          `${ JSON.stringify({
            login: {
              POST: {
                nameResponse: 'ok',
                responses: [
                  {
                    name: 'ok',
                    statusCode: 200,
                    headers: { 'X-Override': 'response' },
                    body: { token: 'abc' }
                  }
                ]
              }
            }
          }, null, 2) }\n`,
          'utf8'
        );

        fs.writeFileSync(
          path.join(mocksDir, 'root-health.json'),
          `${ JSON.stringify({
            health: {
              GET: {
                nameResponse: 'ok',
                responses: [
                  { name: 'ok', statusCode: 200, body: { ok: true } }
                ]
              }
            }
          }, null, 2) }\n`,
          'utf8'
        );

        const originalLog = console.log;
        console.log = () => undefined;

        let result;
        try {
          result = getMocksData(mocksDir);
        } finally {
          console.log = originalLog;
        }

        const loginApi = result.apis.find(api => api.route === '/api/users/login' && api.method === 'post');
        const healthApi = result.apis.find(api => api.route === '/health' && api.method === 'get');

        if (!loginApi) {
          failures.push(`Expected /api/users/login. Got routes: ${ result.apis.map(api => api.route).join(', ') }`);
        } else if (loginApi.delay !== 200) {
          failures.push(`Expected users folder delay 200, got ${ loginApi.delay }`);
        } else {
          const headers = loginApi.responses[0]?.headers ?? {};
          if (headers['X-Mock-Env'] !== 'local') {
            failures.push(`Expected merged root header X-Mock-Env=local, got ${ JSON.stringify(headers) }`);
          }
          if (headers['X-Service'] !== 'users') {
            failures.push(`Expected folder header X-Service=users, got ${ JSON.stringify(headers) }`);
          }
          if (headers['X-Override'] !== 'response') {
            failures.push(`Expected response header X-Override=response, got ${ JSON.stringify(headers) }`);
          }
        }

        if (!healthApi) {
          failures.push('Expected /health from root mock file');
        } else if (healthApi.delay !== 50) {
          failures.push(`Expected root delay 50, got ${ healthApi.delay }`);
        } else if (healthApi.responses[0]?.headers?.['X-Mock-Env'] !== 'local') {
          failures.push(
            `Expected root health header X-Mock-Env=local, got ${ JSON.stringify(healthApi.responses[0]?.headers) }`
          );
        }
      } finally {
        cleanup();
      }

      return failures;
    }
  })
};
