'use strict';

const fs = require('fs');
const path = require('path');
const { runUnitUseCase, PROJECT_ROOT } = require('../../lib/execute-mock-file');
const { createWorkspace } = require('../../lib/server-harness');

const writeJson = (filePath, value) => {
  fs.writeFileSync(filePath, `${ JSON.stringify(value, null, 2) }\n`, 'utf8');
};

const minimalGet = (route, body = { ok: true }) => ({
  [route]: {
    GET: {
      nameResponse: 'ok',
      responses: [
        { name: 'ok', statusCode: 200, body }
      ]
    }
  }
});

module.exports = {
  name: 'unit/mock-config-filters',
  description: 'enabled, include/exclude and strictDuplicates in mock.config.json',
  run: () => runUnitUseCase({
    name: 'unit/mock-config-filters',
    description: 'enabled, include/exclude and strictDuplicates in mock.config.json',
    expectedOutcome: 'success',
    async assert() {
      const { getMocksData } = require(
        path.join(PROJECT_ROOT, 'dist/src/cli/commands/start/files.js')
      );
      const failures = [];

      const withSilentGetMocksData = (mocksDir) => {
        const originalLog = console.log;
        console.log = () => undefined;
        try {
          return getMocksData(mocksDir);
        } finally {
          console.log = originalLog;
        }
      };

      {
        const { workspaceDir, cleanup } = createWorkspace(null, { emptyMocksDir: true });
        const mocksDir = path.join(workspaceDir, 'mocks');

        try {
          fs.mkdirSync(path.join(mocksDir, 'users'), { recursive: true });
          fs.mkdirSync(path.join(mocksDir, 'users-v2'), { recursive: true });

          writeJson(path.join(mocksDir, 'mock.config.json'), {
            folders: {
              users: {
                prefix: '/api/users',
                include: ['auth.json']
              },
              'users-v2': {
                prefix: '/api/users',
                enabled: false
              }
            }
          });

          writeJson(path.join(mocksDir, 'users', 'auth.json'), minimalGet('login', { token: 'a' }));
          writeJson(path.join(mocksDir, 'users', 'profile.json'), minimalGet('profile'));
          writeJson(
            path.join(mocksDir, 'users-v2', 'login.json'),
            minimalGet('login', { token: 'v2' })
          );

          const result = withSilentGetMocksData(mocksDir);
          const routes = result.apis.map(api => `${ api.method }:${ api.route }`).sort();

          if (routes.length !== 1 || routes[0] !== 'get:/api/users/login') {
            failures.push(`Expected only get:/api/users/login, got ${ routes.join(', ') }`);
          }
        } finally {
          cleanup();
        }
      }

      {
        const { workspaceDir, cleanup } = createWorkspace(null, { emptyMocksDir: true });
        const mocksDir = path.join(workspaceDir, 'mocks');

        try {
          fs.mkdirSync(path.join(mocksDir, 'users'), { recursive: true });

          writeJson(path.join(mocksDir, 'mock.config.json'), {
            folders: {
              users: {
                prefix: '/api/users',
                exclude: ['*-draft.json']
              }
            }
          });

          writeJson(path.join(mocksDir, 'users', 'auth.json'), minimalGet('login', { token: 'a' }));
          writeJson(path.join(mocksDir, 'users', 'auth-draft.json'), minimalGet('draft'));
          writeJson(path.join(mocksDir, 'users', 'profile.json'), minimalGet('profile'));

          const result = withSilentGetMocksData(mocksDir);
          const routes = result.apis.map(api => `${ api.method }:${ api.route }`).sort();

          if (
            routes.length !== 2
            || !routes.includes('get:/api/users/login')
            || !routes.includes('get:/api/users/profile')
            || routes.includes('get:/api/users/draft')
          ) {
            failures.push(
              `exclude-only should skip draft and keep auth+profile, got ${ routes.join(', ') }`
            );
          }
        } finally {
          cleanup();
        }
      }

      {
        const { workspaceDir, cleanup } = createWorkspace(null, { emptyMocksDir: true });
        const mocksDir = path.join(workspaceDir, 'mocks');

        try {
          fs.mkdirSync(path.join(mocksDir, 'users'), { recursive: true });
          fs.mkdirSync(path.join(mocksDir, 'users-v2'), { recursive: true });

          writeJson(path.join(mocksDir, 'mock.config.json'), {
            strictDuplicates: true,
            folders: {
              users: { prefix: '/api/users' },
              'users-v2': { prefix: '/api/users', enabled: false }
            }
          });

          writeJson(path.join(mocksDir, 'users', 'a.json'), minimalGet('login'));
          writeJson(path.join(mocksDir, 'users-v2', 'b.json'), minimalGet('login'));

          const result = withSilentGetMocksData(mocksDir);
          if (result.apis.length !== 1) {
            failures.push(
              `Disabled folder should not collide; expected 1 api, got ${ result.apis.length }`
            );
          }
        } finally {
          cleanup();
        }
      }

      {
        const { workspaceDir, cleanup } = createWorkspace(null, { emptyMocksDir: true });
        const mocksDir = path.join(workspaceDir, 'mocks');

        try {
          fs.mkdirSync(path.join(mocksDir, 'users'), { recursive: true });

          writeJson(path.join(mocksDir, 'mock.config.json'), {
            strictDuplicates: true,
            folders: {
              users: { prefix: '/api/users' }
            }
          });

          writeJson(path.join(mocksDir, 'users', 'a.json'), minimalGet('login'));
          writeJson(path.join(mocksDir, 'users', 'b.json'), minimalGet('login'));

          const originalLog = console.log;
          let logged = '';
          console.log = (...args) => {
            logged += `${ args.join(' ') }\n`;
          };

          try {
            getMocksData(mocksDir);
            failures.push('Expected strictDuplicates to throw Invalid mock configuration');
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            if (message !== 'Invalid mock configuration') {
              failures.push(`Unexpected error: ${ message }`);
            }
            if (!logged.includes('Duplicate route [GET] /api/users/login')) {
              failures.push(`Expected duplicate route error in logs:\n${ logged }`);
            }
          } finally {
            console.log = originalLog;
          }
        } finally {
          cleanup();
        }
      }

      return failures;
    }
  })
};
