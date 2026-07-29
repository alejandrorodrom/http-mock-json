'use strict';

const { runUseCase } = require('../../lib/execute-mock-file');

module.exports = {
  name: 'error/response-errors',
  description: 'Response-level validation: name, statusCode, body, headers, delay',
  run: () => runUseCase({
    name: 'error/response-errors',
    description: 'Response-level validation: name, statusCode, body, headers, delay',
    mockRelativePath: 'mocks/invalid/response-errors.json',
    expected: {
      outcome: 'error',
      stdoutIncludes: [
        '✖ Error:',
        'File: response-errors.json',
        'The response must be an object',
        'Missing property "name"',
        'Missing property "statusCode"',
        'The "statusCode" "not-a-number" is not a valid number',
        'Missing property "body"',
        'The "headers" property must be an object',
        'The "delay" "fast" is not a valid number',
        'The "delay" must be greater than or equal to 0',
        'The "encoding" property must be one of: file, base64',
        'The "body" property must be a string when encoding is "file"',
        'The "encoding" property cannot be used together with "proxy" or "action"',
        'The "body" property must be a non-empty path string when encoding is "file"'
      ],
      stdoutExcludes: ['Mock server is running']
    }
  })
};
