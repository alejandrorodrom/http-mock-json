'use strict';

const { runUseCase } = require('../../lib/execute-mock-file');

module.exports = {
  name: '23-request-matrix',
  description: 'Request + match + delay + proxy combinations load cleanly',
  run: () => runUseCase({
    name: '23-request-matrix',
    description: 'Request + match + delay + proxy combinations load cleanly',
    mockRelativePath: 'mocks/23-request-matrix.json',
    expected: {
      outcome: 'success',
      stdoutIncludes: [
        '[POST] /api/v1/auth/login',
        '[GET] /api/v1/catalog',
        '[POST] /api/v1/checkout',
        '[POST] /api/v1/proxy-guard',
        '[PATCH] /api/v1/tickets/:id',
        '[POST] /api/v1/types'
      ],
      stdoutExcludes: ['✖ Error:']
    }
  })
};
