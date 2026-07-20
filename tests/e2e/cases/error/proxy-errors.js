'use strict';

const { runUseCase } = require('../../lib/execute-mock-file');

module.exports = {
  name: 'error/proxy-errors',
  description: 'Invalid proxy URLs, shapes, missing target and non-string path',
  run: () => runUseCase({
    name: 'error/proxy-errors',
    description: 'Invalid proxy URLs, shapes, missing target and non-string path',
    mockRelativePath: 'mocks/invalid/proxy-errors.json',
    expected: {
      outcome: 'error',
      stdoutIncludes: [
        '✖ Error:',
        'File: proxy-errors.json',
        'The "proxy" must be a valid http or https URL',
        'The "proxy" must be a URL string, true, or an object with "target"',
        'The "proxy.target" property is required',
        'The "proxy.target" must be a valid http or https URL',
        'The "proxy.path" must be a string'
      ],
      stdoutExcludes: ['Mock server is running']
    }
  })
};
