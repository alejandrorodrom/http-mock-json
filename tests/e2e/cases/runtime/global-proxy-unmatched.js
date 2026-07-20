'use strict';

const { runHttpUseCase } = require('../../lib/execute-mock-file');
const { request, expectStatus } = require('../../lib/http-assert');

module.exports = {
  name: 'runtime/global-proxy-unmatched',
  description: 'HTTP: unmatched routes are forwarded when CLI --proxy is set',
  run: () => runHttpUseCase({
    name: 'runtime/global-proxy-unmatched',
    description: 'HTTP: unmatched routes are forwarded when CLI --proxy is set',
    mockRelativePath: 'mocks/01-basic-multiple-responses.json',
    proxy: 'https://jsonplaceholder.typicode.com',
    async assert({ baseUrl }) {
      const failures = [];

      const mocked = await request(`${ baseUrl }/data/animals`);
      failures.push(...expectStatus(mocked.status, 404, 'matched mock still uses local response'));

      const upstream = await request(`${ baseUrl }/posts/1`);
      failures.push(...expectStatus(upstream.status, 200, 'unmatched /posts/1 via --proxy'));
      if (!upstream.body || upstream.body.id !== 1) {
        failures.push('unmatched global proxy should return jsonplaceholder post id=1');
      }

      return failures;
    }
  })
};
