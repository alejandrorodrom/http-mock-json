'use strict';

const fs = require('fs');
const path = require('path');
const { runUnitUseCase, PROJECT_ROOT } = require('../../lib/execute-mock-file');
const { createWorkspace } = require('../../lib/server-harness');

module.exports = {
  name: 'unit/invalid-mock-configuration',
  description: 'getMocksData throws Invalid mock configuration after logging validation errors',
  run: () => runUnitUseCase({
    name: 'unit/invalid-mock-configuration',
    description: 'getMocksData throws Invalid mock configuration after logging validation errors',
    expectedOutcome: 'error',
    async assert() {
      const { getMocksData } = require(
        path.join(PROJECT_ROOT, 'dist/src/cli/commands/start/files.js')
      );
      const { workspaceDir, cleanup } = createWorkspace(null, { emptyMocksDir: true });
      const mocksDir = path.join(workspaceDir, 'mocks');
      const failures = [];

      try {
        fs.writeFileSync(
          path.join(mocksDir, 'broken-request.json'),
          `${ JSON.stringify({
            'api/unit': {
              POST: {
                nameResponse: 'ok',
                request: {
                  body: {
                    email: { type: 'string', format: 'phone' }
                  }
                },
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

        try {
          getMocksData(mocksDir);
          failures.push('Expected getMocksData to throw Invalid mock configuration');
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          if (message !== 'Invalid mock configuration') {
            failures.push(`Unexpected error message: ${ message }`);
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
