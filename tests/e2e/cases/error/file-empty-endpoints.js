'use strict';

const { runUseCase } = require('../../lib/execute-mock-file');

module.exports = {
  name: 'error/file-empty-endpoints',
  description: 'Empty JSON object → file has no endpoints',
  run: () => runUseCase({
    name: 'error/file-empty-endpoints',
    description: 'Empty JSON object → file has no endpoints',
    mockRelativePath: 'mocks/invalid/file-empty-endpoints.json',
    expected: {
      outcome: 'error',
      stdoutIncludes: [
        '✖ Error:',
        'File: file-empty-endpoints.json',
        'The file does not contain any endpoints'
      ],
      stdoutExcludes: ['Mock server is running']
    }
  })
};
