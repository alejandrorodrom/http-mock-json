'use strict';

const fs = require('fs');
const path = require('path');
const { runUnitUseCase, PROJECT_ROOT } = require('../../lib/execute-mock-file');
const { createWorkspace } = require('../../lib/server-harness');

const writeJson = (filePath, value) => {
  fs.writeFileSync(filePath, `${ JSON.stringify(value, null, 2) }\n`, 'utf8');
};

module.exports = {
  name: 'unit/mock-config-advanced',
  description: 'storeNamespace, stripPrefix bake-in, port and proxyUnmatched mounts',
  run: () => runUnitUseCase({
    name: 'unit/mock-config-advanced',
    description: 'storeNamespace, stripPrefix bake-in, port and proxyUnmatched mounts',
    expectedOutcome: 'success',
    async assert() {
      const { getMocksData } = require(
        path.join(PROJECT_ROOT, 'dist/src/cli/commands/start/files.js')
      );
      const {
        getProxyUnmatchedMounts,
        resolveMockPort,
        applyStoreNamespace
      } = require(
        path.join(PROJECT_ROOT, 'dist/src/scripts/mock-config.script.js')
      );
      const failures = [];

      if (applyStoreNamespace('session', 'users') !== 'users:session') {
        failures.push('applyStoreNamespace should prefix bare ids');
      }
      if (applyStoreNamespace('users:session', 'users') !== 'users:session') {
        failures.push('applyStoreNamespace should keep already namespaced ids');
      }
      if (resolveMockPort(4000, { port: 3500 }) !== 4000) {
        failures.push('CLI port should override config port');
      }
      if (resolveMockPort(undefined, { port: 3500 }) !== 3500) {
        failures.push('config port should apply when CLI port is omitted');
      }
      if (resolveMockPort(undefined, null) !== 3001) {
        failures.push('default port should be 3001');
      }

      const mounts = getProxyUnmatchedMounts({
        folders: {
          users: {
            prefix: 'api/users',
            proxyUnmatched: 'http://127.0.0.1:9999',
            stripPrefix: true
          },
          disabled: {
            prefix: 'api/x',
            proxyUnmatched: 'http://127.0.0.1:9999',
            enabled: false
          }
        }
      });

      if (mounts.length !== 1 || mounts[0].prefix !== '/api/users') {
        failures.push(`Expected one unmatched mount at /api/users, got ${ JSON.stringify(mounts) }`);
      } else if (mounts[0].stripPrefix !== '/api/users') {
        failures.push(`Expected stripPrefix /api/users, got ${ mounts[0].stripPrefix }`);
      }

      const { workspaceDir, cleanup } = createWorkspace(null, { emptyMocksDir: true });
      const mocksDir = path.join(workspaceDir, 'mocks');

      try {
        fs.mkdirSync(path.join(mocksDir, 'users'), { recursive: true });

        writeJson(path.join(mocksDir, 'mock.config.json'), {
          folders: {
            users: {
              prefix: '/api/users',
              stripPrefix: true,
              storeNamespace: 'users',
              proxy: 'http://127.0.0.1:9999'
            }
          }
        });

        writeJson(path.join(mocksDir, 'users', 'notes.json'), {
          notes: {
            store: {
              id: 'notes',
              key: 'id',
              seed: [{ id: 1, title: 'One' }]
            },
            GET: {
              nameResponse: 'ok',
              responses: [
                { name: 'ok', statusCode: 200, action: 'list', body: [] }
              ]
            }
          },
          'notes/:id': {
            store: { id: 'notes' },
            GET: {
              nameResponse: 'ok',
              responses: [
                { name: 'ok', proxy: true }
              ]
            }
          }
        });

        const originalLog = console.log;
        console.log = () => undefined;
        let result;
        try {
          result = getMocksData(mocksDir);
        } finally {
          console.log = originalLog;
        }

        if (!result.stores.some(store => store.id === 'users:notes')) {
          failures.push(
            `Expected namespaced store users:notes, got ${ result.stores.map(s => s.id).join(', ') }`
          );
        }

        const listApi = result.apis.find(api => api.route === '/api/users/notes' && api.method === 'get');
        if (!listApi || listApi.storeId !== 'users:notes') {
          failures.push(`Expected list api storeId users:notes, got ${ listApi?.storeId }`);
        }

        const proxyApi = result.apis.find(api => api.route === '/api/users/notes/:id');
        if (!proxyApi || proxyApi.stripPrefix !== '/api/users') {
          failures.push(`Expected stripPrefix /api/users on proxy api, got ${ proxyApi?.stripPrefix }`);
        }
      } finally {
        cleanup();
      }

      return failures;
    }
  })
};
