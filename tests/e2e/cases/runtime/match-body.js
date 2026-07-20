'use strict';

const { runHttpUseCase } = require('../../lib/execute-mock-file');
const { request, expectStatus, expectEqual, expectHeader } = require('../../lib/http-assert');

module.exports = {
  name: 'runtime/match-body',
  description: 'HTTP: match.body partial deep match + nameResponse fallback',
  run: () => runHttpUseCase({
    name: 'runtime/match-body',
    description: 'HTTP: match.body partial deep match + nameResponse fallback',
    mockRelativePath: 'mocks/07-match-body.json',
    async assert({ baseUrl }) {
      const failures = [];

      const ok = await request(`${ baseUrl }/api/login`, {
        method: 'POST',
        json: {
          email: 'admin@example.com',
          password: 'secret',
          remember: true
        }
      });
      failures.push(...expectStatus(ok.status, 200, 'login success'));
      failures.push(...expectEqual(ok.body, { token: 'mock-jwt-token' }, 'login success body'));

      const invalid = await request(`${ baseUrl }/api/login`, {
        method: 'POST',
        json: {
          email: 'admin@example.com',
          password: 'wrong'
        }
      });
      failures.push(...expectStatus(invalid.status, 401, 'login invalid'));
      failures.push(...expectEqual(
        invalid.body,
        { message: 'Invalid credentials' },
        'login invalid body'
      ));

      const created = await request(`${ baseUrl }/api/orders`, {
        method: 'POST',
        json: {
          customerId: 1,
          items: [{ sku: 'SKU-100', qty: 2 }],
          note: 'extra field allowed by partial match'
        }
      });
      failures.push(...expectStatus(created.status, 201, 'order created'));
      failures.push(...expectHeader(created.headers, 'location', '/api/orders/20', 'order Location'));
      failures.push(...expectEqual(
        created.body,
        { id: 20, status: 'created' },
        'order created body'
      ));

      const validation = await request(`${ baseUrl }/api/orders`, {
        method: 'POST',
        json: { customerId: 2 }
      });
      failures.push(...expectStatus(validation.status, 422, 'order validation'));

      return failures;
    }
  })
};
