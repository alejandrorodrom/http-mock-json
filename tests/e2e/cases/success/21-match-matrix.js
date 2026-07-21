'use strict';

const { runUseCase } = require('../../lib/execute-mock-file');

module.exports = {
  name: '21-match-matrix',
  description:
    'Dense match matrix: many responses/matches on one resource + controlled error branches',
  run: () => runUseCase({
    name: '21-match-matrix',
    description:
      'Dense match matrix: many responses/matches on one resource + controlled error branches',
    mockRelativePath: 'mocks/21-match-matrix.json',
    expected: {
      outcome: 'success',
      stdoutIncludes: [
        '[PATCH] /api/v1/tickets/:ticketId',
        '[POST] /api/v1/tickets'
      ],
      stdoutExcludes: ['✖ Error:']
    }
  })
};
