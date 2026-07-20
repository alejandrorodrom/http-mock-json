'use strict';

const { runHttpUseCase } = require('../../lib/execute-mock-file');
const { request, expectStatus, expectHeader, expectEqual } = require('../../lib/http-assert');

module.exports = {
  name: 'runtime/headers-and-null-body',
  description: 'HTTP: custom headers + 204 null body',
  run: () => runHttpUseCase({
    name: 'runtime/headers-and-null-body',
    description: 'HTTP: custom headers + 204 null body',
    mockRelativePath: [
      'mocks/02-custom-headers.json',
      'mocks/03-null-body.json'
    ],
    async assert({ baseUrl }) {
      const failures = [];

      const users = await request(`${ baseUrl }/api/users`);
      failures.push(...expectStatus(users.status, 200, 'GET /api/users'));
      failures.push(...expectHeader(users.headers, 'x-custom-header', 'custom-value', 'X-Custom-Header'));
      failures.push(...expectHeader(users.headers, 'x-total-count', '2', 'X-Total-Count'));

      const deleted = await request(`${ baseUrl }/api/users/1`, { method: 'DELETE' });
      failures.push(...expectStatus(deleted.status, 204, 'DELETE /api/users/1'));
      failures.push(...expectEqual(deleted.body, null, '204 body'));

      return failures;
    }
  })
};
