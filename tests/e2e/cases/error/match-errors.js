'use strict';

const { runUseCase } = require('../../lib/execute-mock-file');

module.exports = {
  name: 'error/match-errors',
  description: 'Invalid match shapes: empty, wrong types, empty params/query',
  run: () => runUseCase({
    name: 'error/match-errors',
    description: 'Invalid match shapes: empty, wrong types, empty params/query',
    mockRelativePath: 'mocks/invalid/match-errors.json',
    expected: {
      outcome: 'error',
      stdoutIncludes: [
        '✖ Error:',
        'File: match-errors.json',
        'The "match" property must be an object',
        'The "match" property must include "params", "query" and/or "body"',
        'The "match.params" property must be an object',
        'The "match.params" property must not be empty',
        'The "match.query" property must be an object',
        'The "match.query" property must not be empty'
      ],
      stdoutExcludes: ['Mock server is running']
    }
  })
};
