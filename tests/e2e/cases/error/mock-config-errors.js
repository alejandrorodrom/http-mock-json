'use strict';

const fs = require('fs');
const path = require('path');
const { runUnitUseCase, PROJECT_ROOT } = require('../../lib/execute-mock-file');
const { createWorkspace } = require('../../lib/server-harness');

const writeJson = (filePath, value) => {
  fs.writeFileSync(filePath, `${ JSON.stringify(value, null, 2) }\n`, 'utf8');
};

const writeOkMock = (mocksDir) => {
  writeJson(path.join(mocksDir, 'ok.json'), {
    ping: {
      GET: {
        nameResponse: 'ok',
        responses: [{ name: 'ok', statusCode: 200, body: { ok: true } }]
      }
    }
  });
};

module.exports = {
  name: 'error/mock-config-errors',
  description: 'Exhaustive mock.config.json validation and discovery errors',
  run: () => runUnitUseCase({
    name: 'error/mock-config-errors',
    description: 'Exhaustive mock.config.json validation and discovery errors',
    expectedOutcome: 'error',
    async assert() {
      const { getMocksData } = require(
        path.join(PROJECT_ROOT, 'dist/src/cli/commands/start/files.js')
      );
      const failures = [];

      const assertInvalid = (setup, expectedSnippets) => {
        const { workspaceDir, cleanup } = createWorkspace(null, { emptyMocksDir: true });
        const mocksDir = path.join(workspaceDir, 'mocks');

        try {
          setup(mocksDir);
          writeOkMock(mocksDir);

          const originalLog = console.log;
          let logged = '';
          console.log = (...args) => {
            logged += `${ args.join(' ') }\n`;
          };

          try {
            getMocksData(mocksDir);
            failures.push('Expected getMocksData to throw Invalid mock configuration');
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            if (message !== 'Invalid mock configuration') {
              failures.push(`Unexpected error message: ${ message }`);
            }
            for (const snippet of expectedSnippets) {
              if (!logged.includes(snippet)) {
                failures.push(`Expected log to include: ${ JSON.stringify(snippet) }\nLogs:\n${ logged }`);
              }
            }
          } finally {
            console.log = originalLog;
          }
        } finally {
          cleanup();
        }
      };

      assertInvalid((mocksDir) => {
        writeJson(path.join(mocksDir, 'mock.config.json'), {
          prefix: '/only-in-folders',
          delay: -1,
          proxy: true,
          headers: { 'X-Bad': 123 },
          strictDuplicates: 'yes',
          port: 70000,
          folders: {
            'bad/name': 'not-an-object',
            broken: {
              prefix: '',
              delay: 'nope',
              proxy: true,
              headers: ['nope'],
              enabled: 'yes',
              include: 'auth.json',
              exclude: [''],
              stripPrefix: 'yes',
              proxyUnmatched: 'not-a-url',
              storeNamespace: ''
            },
            'needs-prefix': {
              stripPrefix: true,
              proxyUnmatched: 'http://127.0.0.1:9'
            },
            'bad-chars': {
              prefix: 'api users!'
            },
            'with-params': {
              prefix: '/api/:tenant'
            },
            'empty-include-item': {
              prefix: '/api/x',
              include: [123]
            }
          }
        });
      }, [
        'The "prefix" is only allowed inside "folders"',
        'The "delay" must be greater than or equal to 0',
        'The "proxy" must be a URL string or an object with "target"',
        'The "headers.X-Bad" must be a string',
        'The "strictDuplicates" must be a boolean',
        'The "port" must be between 1 and 65535',
        'The folder name "bad/name" is invalid',
        'The "folders.bad/name" must be an object',
        'The "folders.broken.prefix" must be a non-empty path',
        'The "folders.broken.delay" "nope" is not a valid number',
        'The "folders.broken.headers" must be an object',
        'The "folders.broken.enabled" must be a boolean',
        'The "folders.broken.include" must be an array of strings',
        'The "folders.broken.exclude[0]" must be a non-empty string',
        'The "folders.broken.stripPrefix" must be a boolean',
        'The "folders.broken.proxyUnmatched" must be a valid http or https URL',
        'The "folders.broken.storeNamespace" must be a non-empty string using letters, numbers, "-", "_", and "."',
        'The "folders.needs-prefix.stripPrefix" requires "folders.needs-prefix.prefix"',
        'The "folders.needs-prefix.proxyUnmatched" requires "folders.needs-prefix.prefix"',
        'Invalid "folders.bad-chars.prefix"',
        'The "folders.with-params.prefix" cannot contain route parameters',
        'The "folders.empty-include-item.include[0]" must be a non-empty string'
      ]);

      assertInvalid((mocksDir) => {
        writeJson(path.join(mocksDir, 'mock.config.json'), {
          port: 3000.5
        });
      }, [
        'The "port" must be an integer'
      ]);

      assertInvalid((mocksDir) => {
        writeJson(path.join(mocksDir, 'mock.config.json'), {
          delay: 'abc',
          proxy: 42,
          headers: 'nope',
          port: 'nope',
          folders: []
        });
      }, [
        'The "delay" "abc" is not a valid number',
        'The "proxy" must be a URL string or an object with "target"',
        'The "headers" must be an object',
        'The "port" must be a valid number',
        'The "folders" must be an object'
      ]);

      assertInvalid((mocksDir) => {
        writeJson(path.join(mocksDir, 'mock.config.json'), {
          folders: {
            broken: {
              prefix: 10,
              proxy: { target: 1 },
              storeNamespace: 'bad ns'
            }
          }
        });
      }, [
        'The "folders.broken.prefix" must be a string',
        'The "proxy.target" must be a valid http or https URL',
        'The "folders.broken.storeNamespace" must be a non-empty string using letters, numbers, "-", "_", and "."'
      ]);

      assertInvalid((mocksDir) => {
        fs.writeFileSync(path.join(mocksDir, 'mock.config.json'), '[1,2,3]\n', 'utf8');
      }, [
        'The file must contain a valid JSON object'
      ]);

      assertInvalid((mocksDir) => {
        fs.writeFileSync(path.join(mocksDir, 'mock.config.json'), '{ not json\n', 'utf8');
      }, [
        'JSON syntax error:'
      ]);

      assertInvalid((mocksDir) => {
        writeJson(path.join(mocksDir, 'mock.config.json'), {
          folders: {
            missing: { prefix: '/api/missing' }
          }
        });
      }, [
        'The folder "missing" does not exist inside mocks'
      ]);

      assertInvalid((mocksDir) => {
        fs.mkdirSync(path.join(mocksDir, 'users'), { recursive: true });
        writeJson(path.join(mocksDir, 'mock.config.json'), {
          strictDuplicates: true,
          folders: {
            users: { prefix: '/api/users' }
          }
        });
        writeJson(path.join(mocksDir, 'users', 'a.json'), {
          login: {
            GET: {
              nameResponse: 'ok',
              responses: [{ name: 'ok', statusCode: 200, body: { a: 1 } }]
            }
          }
        });
        writeJson(path.join(mocksDir, 'users', 'b.json'), {
          login: {
            GET: {
              nameResponse: 'ok',
              responses: [{ name: 'ok', statusCode: 200, body: { b: 1 } }]
            }
          }
        });
      }, [
        'Duplicate route [GET] /api/users/login'
      ]);

      return failures;
    }
  })
};
