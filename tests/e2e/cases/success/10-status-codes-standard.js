'use strict';

const { runUseCase } = require('../../lib/execute-mock-file');

module.exports = {
  name: '10-status-codes-standard',
  description: 'All standard HTTP status codes accepted by the validator',
  run: () => runUseCase({
    name: '10-status-codes-standard',
    description: 'All standard HTTP status codes accepted by the validator',
    mockRelativePath: 'mocks/10-status-codes-standard.json',
    expected: {
      outcome: 'success',
      stdoutIncludes: [
        '[GET] /api/status/200',
        '[POST] /api/status/201',
        '[DELETE] /api/status/204',
        '[GET] /api/status/404',
        '[GET] /api/status/500'
      ],
      stdoutExcludes: [
        '✖ Error:',
        '⚠ Warnings:'
      ]
    }
  })
};
