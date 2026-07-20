'use strict';

const { runUseCase } = require('../../lib/execute-mock-file');

module.exports = {
  name: '05-match-params',
  description: 'Request matching by route params (first match wins, else nameResponse)',
  run: () => runUseCase({
    name: '05-match-params',
    description: 'Request matching by route params (first match wins, else nameResponse)',
    mockRelativePath: 'mocks/05-match-params.json',
    expected: {
      outcome: 'success',
      stdoutIncludes: [
        '[GET] /api/profiles/:id'
      ],
      stdoutExcludes: ['✖ Error:']
    }
  })
};
