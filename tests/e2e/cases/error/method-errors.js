'use strict';

const { runUseCase } = require('../../lib/execute-mock-file');

module.exports = {
  name: 'error/method-errors',
  description: 'Invalid methods, missing fields, delay/proxy mistakes at method level',
  run: () => runUseCase({
    name: 'error/method-errors',
    description: 'Invalid methods, missing fields, delay/proxy mistakes at method level',
    mockRelativePath: 'mocks/invalid/method-errors.json',
    expected: {
      outcome: 'error',
      stdoutIncludes: [
        '✖ Error:',
        'File: method-errors.json',
        'Invalid HTTP method. Valid methods: GET, POST, PUT, PATCH, DELETE',
        'The method must be an object',
        'Missing property "nameResponse"',
        'Missing property "responses"',
        'The responses array is empty',
        'The "nameResponse" "NotFound" does not exist in responses',
        'The "delay" "slow" is not a valid number',
        'The "delay" must be greater than or equal to 0',
        'The "proxy" must be a URL string or an object with "target"',
        'The "proxy" must be a valid http or https URL',
        'The "proxy.target" property is required',
        'The "proxy.target" must be a valid http or https URL',
        'The "proxy.path" must be a string'
      ],
      stdoutExcludes: ['Mock server is running']
    }
  })
};
