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
        // Prefix only: JSON.parse wording differs across Node 18 / 20 / 21+
        'JSON syntax error:'
      ],
      stdoutExcludes: ['Mock server is running']
    }
  })
};
