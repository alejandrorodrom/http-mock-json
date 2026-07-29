'use strict';

const { runUseCase } = require('../../lib/execute-mock-file');

module.exports = {
  name: '41-response-encoding',
  description: 'Response encoding mocks load: file and base64',
  run: () => runUseCase({
    name: '41-response-encoding',
    description: 'Response encoding mocks load: file and base64',
    mockRelativePath: 'mocks/41-response-encoding.json',
    expected: {
      outcome: 'success',
      stdoutIncludes: [
        '[GET] /api/encoding/file',
        '[GET] /api/encoding/base64',
        '[GET] /api/encoding/missing',
        '[GET] /api/encoding/escape'
      ],
      stdoutExcludes: ['✖ Error:']
    }
  })
};
