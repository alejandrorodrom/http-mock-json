'use strict';

const path = require('path');
const { runUnitUseCase, PROJECT_ROOT } = require('../../lib/execute-mock-file');

module.exports = {
  name: 'unit/fallback-response-missing',
  description: 'selectResponse throws when nameResponse fallback is missing',
  run: () => runUnitUseCase({
    name: 'unit/fallback-response-missing',
    description: 'selectResponse throws when nameResponse fallback is missing',
    expectedOutcome: 'error',
    async assert() {
      const { selectResponse } = require(path.join(PROJECT_ROOT, 'dist/src/scripts/match.script.js'));
      const failures = [];

      const fakeReq = {
        params: {},
        query: {},
        body: {}
      };

      try {
        selectResponse(
          [{ name: 'ok', status: 200, headers: {}, body: {} }],
          'missing',
          fakeReq
        );
        failures.push('Expected selectResponse to throw for missing fallback');
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (!message.includes('Fallback response "missing" was not found in the responses array')) {
          failures.push(`Unexpected error message: ${ message }`);
        }
      }

      return failures;
    }
  })
};
