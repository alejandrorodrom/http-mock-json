'use strict';

const { runUseCase } = require('../../lib/execute-mock-file');

module.exports = {
  name: '17-proxy-request-failed',
  description: 'Mock with unreachable proxy target validates and starts',
  run: () => runUseCase({
    name: '17-proxy-request-failed',
    description: 'Mock with unreachable proxy target validates and starts',
    mockRelativePath: 'mocks/17-proxy-request-failed.json',
    expected: {
      outcome: 'success',
      stdoutIncludes: [
        '[GET] /api/proxy-fail'
      ],
      stdoutExcludes: ['✖ Error:']
    }
  })
};
