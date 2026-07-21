'use strict';

const { runUseCase } = require('../../lib/execute-mock-file');

module.exports = {
  name: '10-status-codes-standard',
  description: 'IANA-registered HTTP status codes accepted without warnings',
  run: () => runUseCase({
    name: '10-status-codes-standard',
    description: 'IANA-registered HTTP status codes accepted without warnings',
    mockRelativePath: 'mocks/10-status-codes-standard.json',
    expected: {
      outcome: 'success',
      stdoutIncludes: [
        '[GET] /api/status/200',
        '[POST] /api/status/201',
        '[DELETE] /api/status/204',
        '[GET] /api/status/308',
        '[GET] /api/status/418',
        '[GET] /api/status/422',
        '[GET] /api/status/429',
        '[GET] /api/status/451',
        '[GET] /api/status/504',
        '[GET] /api/status/511'
      ],
      stdoutExcludes: [
        '✖ Error:',
        '⚠ Warnings:'
      ]
    }
  })
};
