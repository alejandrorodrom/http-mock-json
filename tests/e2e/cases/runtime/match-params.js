'use strict';

const { runHttpUseCase } = require('../../lib/execute-mock-file');
const { request, expectStatus, expectEqual } = require('../../lib/http-assert');

module.exports = {
  name: 'runtime/match-params',
  description: 'HTTP: match.params selects found/admin, otherwise nameResponse not-found',
  run: () => runHttpUseCase({
    name: 'runtime/match-params',
    description: 'HTTP: match.params selects found/admin, otherwise nameResponse not-found',
    mockRelativePath: 'mocks/05-match-params.json',
    async assert({ baseUrl }) {
      const failures = [];

      const found = await request(`${ baseUrl }/api/profiles/1`);
      failures.push(...expectStatus(found.status, 200, 'GET /api/profiles/1'));
      failures.push(...expectEqual(found.body, { id: 1, name: 'Juan Pérez' }, 'GET /api/profiles/1 body'));

      const admin = await request(`${ baseUrl }/api/profiles/99`);
      failures.push(...expectStatus(admin.status, 200, 'GET /api/profiles/99'));
      failures.push(...expectEqual(
        admin.body,
        { id: 99, name: 'Admin User', role: 'admin' },
        'GET /api/profiles/99 body'
      ));

      const missing = await request(`${ baseUrl }/api/profiles/42`);
      failures.push(...expectStatus(missing.status, 404, 'GET /api/profiles/42'));
      failures.push(...expectEqual(
        missing.body,
        { message: 'User not found' },
        'GET /api/profiles/42 body'
      ));

      return failures;
    }
  })
};
