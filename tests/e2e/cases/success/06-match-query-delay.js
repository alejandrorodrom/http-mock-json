'use strict';

const { runUseCase } = require('../../lib/execute-mock-file');

module.exports = {
  name: '06-match-query-delay',
  description: 'Match by query params + method/response delay (including delay: 0)',
  run: () => runUseCase({
    name: '06-match-query-delay',
    description: 'Match by query params + method/response delay (including delay: 0)',
    mockRelativePath: 'mocks/06-match-query-delay.json',
    expected: {
      outcome: 'success',
      stdoutIncludes: [
        '[GET] /api/search'
      ],
      stdoutExcludes: ['✖ Error:']
    }
  })
};
