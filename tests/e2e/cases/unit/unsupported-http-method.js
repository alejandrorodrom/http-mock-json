'use strict';

const path = require('path');
const { runUnitUseCase, PROJECT_ROOT } = require('../../lib/execute-mock-file');

module.exports = {
  name: 'unit/unsupported-http-method',
  description: 'Api model throws Unsupported HTTP method for OPTIONS',
  run: () => runUnitUseCase({
    name: 'unit/unsupported-http-method',
    description: 'Api model throws Unsupported HTTP method for OPTIONS',
    expectedOutcome: 'error',
    async assert() {
      const { Api } = require(path.join(PROJECT_ROOT, 'dist/src/models/api.model.js'));
      const failures = [];

      try {
        // eslint-disable-next-line no-new
        new Api({
          route: 'api/test',
          method: 'OPTIONS',
          nameResponse: 'ok',
          responses: [{ name: 'ok', status: 200, headers: {}, body: {} }]
        });
        failures.push('Expected Api constructor to throw for OPTIONS');
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (!message.includes('Unsupported HTTP method: "OPTIONS"')) {
          failures.push(`Unexpected error message: ${ message }`);
        }
      }

      return failures;
    }
  })
};
