'use strict';

const { runUseCase } = require('../../lib/execute-mock-file');

module.exports = {
  name: '02-custom-headers',
  description: 'Custom response headers (Content-Type, WWW-Authenticate, CORS)',
  run: () => runUseCase({
    name: '02-custom-headers',
    description: 'Custom response headers (Content-Type, WWW-Authenticate, CORS)',
    mockRelativePath: 'mocks/02-custom-headers.json',
    expected: {
      outcome: 'success',
      stdoutIncludes: [
        '[GET] /api/users',
        '[GET] /api/cors-demo'
      ],
      stdoutExcludes: ['✖ Error:']
    }
  })
};
