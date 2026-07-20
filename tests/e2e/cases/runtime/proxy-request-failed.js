'use strict';

const { runHttpUseCase } = require('../../lib/execute-mock-file');
const { request, expectStatus } = require('../../lib/http-assert');

module.exports = {
  name: 'runtime/proxy-request-failed',
  description: 'HTTP: upstream connection failure returns Proxy request failed (502)',
  run: () => runHttpUseCase({
    name: 'runtime/proxy-request-failed',
    description: 'HTTP: upstream connection failure returns Proxy request failed (502)',
    mockRelativePath: 'mocks/17-proxy-request-failed.json',
    async assert({ baseUrl }) {
      const failures = [];
      const response = await request(`${ baseUrl }/api/proxy-fail`);

      failures.push(...expectStatus(response.status, 502, 'proxy fail status'));

      if (!response.body || response.body.message !== 'Proxy request failed') {
        failures.push(
          `Expected body.message "Proxy request failed", received ${ JSON.stringify(response.body) }`
        );
      }

      if (!response.body || !response.body.target || !String(response.body.target).includes('127.0.0.1:1')) {
        failures.push('Expected body.target to include 127.0.0.1:1');
      }

      return failures;
    }
  })
};
