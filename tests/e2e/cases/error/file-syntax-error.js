'use strict';

const { runUseCase } = require('../../lib/execute-mock-file');

module.exports = {
  name: 'error/file-syntax-error',
  description: 'Broken JSON syntax → JSON syntax error',
  run: () => runUseCase({
    name: 'error/file-syntax-error',
    description: 'Broken JSON syntax → JSON syntax error',
    mockRelativePath: 'mocks/invalid/file-syntax-error.json',
    expected: {
      outcome: 'error',
      stdoutIncludes: [
        '✖ Error:',
        'File: file-syntax-error.json',
        'JSON syntax error: Expected \',\' or \']\' after array element in JSON at position 244'
      ],
      stdoutExcludes: ['Mock server is running']
    }
  })
};
