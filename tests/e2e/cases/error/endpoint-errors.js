'use strict';

const { runUseCase } = require('../../lib/execute-mock-file');

module.exports = {
  name: 'error/endpoint-errors',
  description: 'Invalid path chars, non-object endpoint, empty methods',
  run: () => runUseCase({
    name: 'error/endpoint-errors',
    description: 'Invalid path chars, non-object endpoint, empty methods',
    mockRelativePath: 'mocks/invalid/endpoint-errors.json',
    expected: {
      outcome: 'error',
      stdoutIncludes: [
        '✖ Error:',
        'File: endpoint-errors.json',
        'Invalid path. Allowed characters: letters, numbers, "-", "_", ".", "~", "/", and parameters like ":id".',
        'Must be an object',
        'Does not contain any HTTP methods'
      ],
      stdoutExcludes: ['Mock server is running']
    }
  })
};
