'use strict';

const { runUseCase } = require('../../lib/execute-mock-file');

module.exports = {
  name: 'error/method-responses-not-array',
  description: 'responses is an object instead of an array',
  run: () => runUseCase({
    name: 'error/method-responses-not-array',
    description: 'responses is an object instead of an array',
    mockRelativePath: 'mocks/invalid/method-responses-not-array.json',
    expected: {
      outcome: 'error',
      stdoutIncludes: [
        '✖ Error:',
        'File: method-responses-not-array.json',
        'The "responses" property must be an array',
        'Error processing file: methodData.responses is not iterable'
      ],
      stdoutExcludes: ['Mock server is running']
    }
  })
};
