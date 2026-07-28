'use strict';

const fs = require('fs');
const path = require('path');
const { runUnitUseCase, PROJECT_ROOT } = require('../../lib/execute-mock-file');
const { createWorkspace } = require('../../lib/server-harness');

/**
 * Smoke checks that invalid mock.config still fails through getMocksData.
 * Exhaustive snippets live in error/mock-config-errors.
 */
module.exports = {
  name: 'unit/mock-config-invalid',
  description: 'Invalid mock.config.json throws Invalid mock configuration (smoke)',
  run: () => runUnitUseCase({
    name: 'unit/mock-config-invalid',
    description: 'Invalid mock.config.json throws Invalid mock configuration (smoke)',
    expectedOutcome: 'error',
    async assert() {
      const { getMocksData } = require(
        path.join(PROJECT_ROOT, 'dist/src/cli/commands/start/files.js')
      );
      const failures = [];
      const { workspaceDir, cleanup } = createWorkspace(null, { emptyMocksDir: true });
      const mocksDir = path.join(workspaceDir, 'mocks');

      try {
        fs.writeFileSync(
          path.join(mocksDir, 'mock.config.json'),
          `${ JSON.stringify({ delay: -1, proxy: true }, null, 2) }\n`,
          'utf8'
        );
        fs.writeFileSync(
          path.join(mocksDir, 'ok.json'),
          `${ JSON.stringify({
            ping: {
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
          if (!logged.includes('must be greater than or equal to 0')) {
            failures.push(`Expected delay error in logs:\n${ logged }`);
          }
        } finally {
          console.log = originalLog;
        }
      } finally {
        cleanup();
      }

      return failures;
    }
  })
};
