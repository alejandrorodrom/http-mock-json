'use strict';

const { runUseCase } = require('../../lib/execute-mock-file');

module.exports = {
  name: '11-status-codes-warnings',
  description: 'Unassigned status codes emit warnings but still allow startup',
  run: () => runUseCase({
    name: '11-status-codes-warnings',
    description: 'Unassigned status codes emit warnings but still allow startup',
    mockRelativePath: 'mocks/11-status-codes-warnings.json',
    expected: {
      outcome: 'success',
      stdoutIncludes: [
        '⚠ Warnings:',
        'File: 11-status-codes-warnings.json',
        'The "statusCode" 299 is not a standard HTTP status code',
        'The "statusCode" 419 is not a standard HTTP status code',
        'The "statusCode" 430 is not a standard HTTP status code',
        'The "statusCode" 509 is not a standard HTTP status code',
        'The "statusCode" 599 is not a standard HTTP status code',
        '[GET] /api/warnings/non-standard'
      ],
      stdoutExcludes: ['✖ Error:']
    }
  })
};
