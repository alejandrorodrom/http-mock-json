'use strict';

const { runHttpUseCase } = require('../../lib/execute-mock-file');
const { request, expectStatus } = require('../../lib/http-assert');

module.exports = {
  name: 'runtime/all-http-methods',
  description: 'HTTP: GET/POST/PUT/PATCH/DELETE are all reachable for a param route',
  run: () => runHttpUseCase({
    name: 'runtime/all-http-methods',
    description: 'HTTP: GET/POST/PUT/PATCH/DELETE are all reachable for a param route',
    mockRelativePath: 'mocks/04-params-and-methods.json',
    async assert({ baseUrl }) {
      const failures = [];
      const base = `${ baseUrl }/data/animals/1`;

      failures.push(...expectStatus((await request(base)).status, 200, 'GET'));
      failures.push(...expectStatus((await request(base, { method: 'POST', json: {} })).status, 201, 'POST'));
      failures.push(...expectStatus((await request(base, { method: 'PUT', json: {} })).status, 200, 'PUT'));
      failures.push(...expectStatus((await request(base, { method: 'PATCH', json: {} })).status, 200, 'PATCH'));
      failures.push(...expectStatus((await request(base, { method: 'DELETE' })).status, 204, 'DELETE'));

      const brands = await request(`${ baseUrl }/data/brands`);
      failures.push(...expectStatus(brands.status, 200, 'GET /data/brands nameResponse BrandsList3'));
      if (!brands.body || brands.body.example !== 'data3') {
        failures.push('BrandsList3 fallback body.example should be "data3"');
      }

      return failures;
    }
  })
};
