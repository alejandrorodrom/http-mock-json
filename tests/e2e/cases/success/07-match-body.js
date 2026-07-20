'use strict';

const { runUseCase } = require('../../lib/execute-mock-file');

module.exports = {
  name: '07-match-body',
  description: 'Match by request body (partial deep match)',
  run: () => runUseCase({
    name: '07-match-body',
    description: 'Match by request body (partial deep match)',
    mockRelativePath: 'mocks/07-match-body.json',
    expected: {
      outcome: 'success',
      stdoutIncludes: [
        '[POST] /api/login',
        '[POST] /api/orders'
      ],
      stdoutExcludes: ['✖ Error:']
    }
  })
};
