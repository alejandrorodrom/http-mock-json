'use strict';

const { runHttpUseCase } = require('../../lib/execute-mock-file');
const { request, expectStatus } = require('../../lib/http-assert');

module.exports = {
  name: 'runtime/proxy-live',
  description: 'HTTP: proxy:true + path rewrite against jsonplaceholder',
  run: () => runHttpUseCase({
    name: 'runtime/proxy-live',
    description: 'HTTP: proxy:true + path rewrite against jsonplaceholder',
    mockRelativePath: 'mocks/09-proxy.json',
    async assert({ baseUrl }) {
      const failures = [];

      const local = await request(`${ baseUrl }/users`);
      failures.push(...expectStatus(local.status, 200, 'local mock fallback'));
      if (!local.body || !Array.isArray(local.body.users)) {
        failures.push('local mock fallback body.users should be an array');
      }

      const live = await request(`${ baseUrl }/users?role=admin`);
      failures.push(...expectStatus(live.status, 200, 'proxy:true live'));
      if (!Array.isArray(live.body)) {
        failures.push('proxy:true should return upstream users array from jsonplaceholder');
      }

      const rewrite = await request(`${ baseUrl }/users?source=billing`);
      failures.push(...expectStatus(rewrite.status, 200, 'proxy path rewrite'));
      if (!rewrite.body || rewrite.body.id !== 1) {
        failures.push('path rewrite should return jsonplaceholder user id=1');
      }

      return failures;
    }
  })
};
