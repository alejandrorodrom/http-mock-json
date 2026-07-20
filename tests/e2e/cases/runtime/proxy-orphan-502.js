'use strict';

const { runHttpUseCase } = require('../../lib/execute-mock-file');
const { request, expectStatus, expectEqual } = require('../../lib/http-assert');

module.exports = {
  name: 'runtime/proxy-orphan-502',
  description: 'HTTP: proxy:true without method/--proxy target returns runtime 502 JSON',
  run: () => runHttpUseCase({
    name: 'runtime/proxy-orphan-502',
    description: 'HTTP: proxy:true without method/--proxy target returns runtime 502 JSON',
    mockRelativePath: 'mocks/16-runtime-proxy-orphan.json',
    async assert({ baseUrl }) {
      const failures = [];

      const orphan = await request(`${ baseUrl }/api/proxy-orphan?live=true`);
      failures.push(...expectStatus(orphan.status, 502, 'orphan proxy'));
      failures.push(...expectEqual(
        orphan.body,
        {
          message: 'Proxy is set to true but no method-level proxy or --proxy target is configured'
        },
        'orphan proxy body'
      ));

      const fallback = await request(`${ baseUrl }/api/proxy-orphan`);
      failures.push(...expectStatus(fallback.status, 200, 'local fallback'));

      return failures;
    }
  })
};
