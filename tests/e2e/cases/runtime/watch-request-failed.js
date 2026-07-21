'use strict';

const fs = require('fs');
const path = require('path');
const { runHttpUseCase } = require('../../lib/execute-mock-file');

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = {
  name: 'runtime/watch-request-failed',
  description: 'Watch mode: breaking request config prevents restart',
  run: () => runHttpUseCase({
    name: 'runtime/watch-request-failed',
    description: 'Watch mode: breaking request config prevents restart',
    mockRelativePath: 'mocks/22-request.json',
    timeoutMs: 20000,
    async assert({ mocksDir, getStdout }) {
      const failures = [];
      const mockFile = path.join(mocksDir, '22-request.json');

      await sleep(800);

      const broken = {
        'api/watch-request': {
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
      };

      fs.writeFileSync(mockFile, `${ JSON.stringify(broken, null, 2) }\n`, 'utf8');

      const deadline = Date.now() + 12000;
      const expectedRestart =
        'Mock server could not be restarted due to an invalid mock configuration. Please fix the mocks and run the command again.';
      const expectedValidation =
        'The "request.body.email.format" must be one of: email, uuid, url, date';

      while (Date.now() < deadline) {
        const stdout = getStdout();
        if (stdout.includes(expectedRestart) && stdout.includes(expectedValidation)) {
          if (stdout.includes('Invalid mock configuration')) {
            failures.push(
              'Expected "Invalid mock configuration" to stay internal (not printed again)'
            );
          }
          return failures;
        }
        await sleep(100);
      }

      failures.push(
        `Expected watch request-validation restart failure.\nLast stdout:\n${ getStdout() }`
      );
      return failures;
    }
  })
};
