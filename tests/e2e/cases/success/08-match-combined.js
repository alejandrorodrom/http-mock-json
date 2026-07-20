'use strict';

const { runUseCase } = require('../../lib/execute-mock-file');

module.exports = {
  name: '08-match-combined',
  description: 'Combined match (params + query + body) in the same response',
  run: () => runUseCase({
    name: '08-match-combined',
    description: 'Combined match (params + query + body) in the same response',
    mockRelativePath: 'mocks/08-match-combined.json',
    expected: {
      outcome: 'success',
      stdoutIncludes: [
        '[PUT] /api/accounts/:id',
        '[POST] /api/checkout'
      ],
      stdoutExcludes: ['✖ Error:']
    }
  })
};
