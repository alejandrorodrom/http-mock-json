'use strict';

const { runHttpUseCase } = require('../../lib/execute-mock-file');
const { request, expectStatus, expectEqual, expectMinDelay } = require('../../lib/http-assert');

module.exports = {
  name: 'runtime/match-query-delay',
  description: 'HTTP: match.query + response delay override vs method delay fallback',
  run: () => runHttpUseCase({
    name: 'runtime/match-query-delay',
    description: 'HTTP: match.query + response delay override vs method delay fallback',
    mockRelativePath: 'mocks/06-match-query-delay.json',
    async assert({ baseUrl }) {
      const failures = [];

      const activeStarted = Date.now();
      const active = await request(`${ baseUrl }/api/search?status=active`);
      const activeElapsed = Date.now() - activeStarted;
      failures.push(...expectStatus(active.status, 200, 'GET /api/search?status=active'));
      failures.push(...expectEqual(
        active.body,
        { results: [{ id: 1, status: 'active' }] },
        'active body'
      ));
      failures.push(...expectMinDelay(activeElapsed, 250, 'active delay (300ms)'));

      const defaultStarted = Date.now();
      const fallback = await request(`${ baseUrl }/api/search`);
      const defaultElapsed = Date.now() - defaultStarted;
      failures.push(...expectStatus(fallback.status, 200, 'GET /api/search'));
      failures.push(...expectEqual(fallback.body, { results: [] }, 'default body'));
      failures.push(...expectMinDelay(defaultElapsed, 50, 'default delay (100ms)'));

      const fast = await request(`${ baseUrl }/api/search?fast=true`);
      failures.push(...expectStatus(fast.status, 200, 'GET /api/search?fast=true'));
      failures.push(...expectEqual(
        fast.body,
        { results: [], cached: true },
        'fast body'
      ));

      return failures;
    }
  })
};
