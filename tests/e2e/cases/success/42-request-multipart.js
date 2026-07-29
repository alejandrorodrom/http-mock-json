'use strict';

const { runUseCase } = require('../../lib/execute-mock-file');

module.exports = {
  name: '42-request-multipart',
  description: 'Multipart/raw/text request mocks load',
  run: () => runUseCase({
    name: '42-request-multipart',
    description: 'Multipart/raw/text request mocks load',
    mockRelativePath: 'mocks/42-request-multipart.json',
    expected: {
      outcome: 'success',
      stdoutIncludes: [
        '[POST] /api/upload',
        '[PUT] /api/raw',
        '[POST] /api/text',
        '[GET] /api/headers-gate',
        '[PUT] /api/raw-zip',
        '[POST] /api/raw-string',
        '[POST] /api/json-type-field'
      ],
      stdoutExcludes: ['✖ Error:']
    }
  })
};
