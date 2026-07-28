'use strict';

const { runUseCase } = require('../../lib/execute-mock-file');

module.exports = {
  name: 'error/match-errors',
  description: 'Invalid match shapes: empty, wrong types, empty params/query, invalid call',
  run: () => runUseCase({
    name: 'error/match-errors',
    description: 'Invalid match shapes: empty, wrong types, empty params/query, invalid call',
    mockRelativePath: 'mocks/invalid/match-errors.json',
    expected: {
      outcome: 'error',
      stdoutIncludes: [
        '✖ Error:',
        'File: match-errors.json',
        'The "match" property must be an object',
        'The "match" property must include "params", "query", "body" and/or "call"',
        'The "match.params" property must be an object',
        'The "match.params" property must not be empty',
        'The "match.query" property must be an object',
        'The "match.query" property must not be empty',
        'The "match.call" property must be a positive integer (>= 1) or an object',
        'The "match.call" object must include "index" and/or "reset": true',
        'A "match.call" with only "reset": true must also include "params", "query" and/or "body"',
        'All "match.call.by" values in a method must be identical',
        'The "match.call.index" property must be a positive integer (>= 1)',
        'The "match.call.loop" property must be a boolean',
        'The "match.call.reset" property must be a boolean',
        'The "match.call.by" property must be an object',
        'The "match.call.by" property must include exactly one of "body", "query", or "params"',
        'The "match.call.by.body" property must be a non-empty string'
      ],
      stdoutExcludes: ['Mock server is running']
    }
  })
};
