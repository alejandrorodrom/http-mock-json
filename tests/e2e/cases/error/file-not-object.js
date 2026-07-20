'use strict';

const { runUseCase } = require('../../lib/execute-mock-file');

module.exports = {
  name: 'error/file-not-object',
  description: 'Root JSON array → file must be a JSON object',
  run: () => runUseCase({
    name: 'error/file-not-object',
    description: 'Root JSON array → file must be a JSON object',
    mockRelativePath: 'mocks/invalid/file-not-object.json',
    expected: {
      outcome: 'error',
      stdoutIncludes: [
        '✖ Error:',
        'File: file-not-object.json',
        'The file must contain a valid JSON object'
      ],
      stdoutExcludes: ['Mock server is running']
    }
  })
};
