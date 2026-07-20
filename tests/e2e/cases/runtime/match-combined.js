'use strict';

const { runHttpUseCase } = require('../../lib/execute-mock-file');
const { request, expectStatus, expectEqual } = require('../../lib/http-assert');

module.exports = {
  name: 'runtime/match-combined',
  description: 'HTTP: combined params+query+body must all match',
  run: () => runHttpUseCase({
    name: 'runtime/match-combined',
    description: 'HTTP: combined params+query+body must all match',
    mockRelativePath: 'mocks/08-match-combined.json',
    async assert({ baseUrl }) {
      const failures = [];

      const adminWeb = await request(`${ baseUrl }/api/accounts/1?source=web`, {
        method: 'PUT',
        json: { role: 'admin', extra: true }
      });
      failures.push(...expectStatus(adminWeb.status, 200, 'admin-web'));
      failures.push(...expectEqual(
        adminWeb.body,
        { id: 1, role: 'admin', source: 'web', updated: true },
        'admin-web body'
      ));

      const partial = await request(`${ baseUrl }/api/accounts/1?source=web`, {
        method: 'PUT',
        json: { role: 'member' }
      });
      failures.push(...expectStatus(partial.status, 403, 'partial match → forbidden'));
      failures.push(...expectEqual(
        partial.body,
        {
          message: 'All match conditions required: params.id, query.source, body.role'
        },
        'forbidden body'
      ));

      const checkout = await request(`${ baseUrl }/api/checkout?source=web`, {
        method: 'POST',
        json: { plan: 'premium', coupon: 'SAVE10' }
      });
      failures.push(...expectStatus(checkout.status, 200, 'checkout premium-web'));
      failures.push(...expectEqual(
        checkout.body,
        { ok: true, discount: 10, plan: 'premium', source: 'web' },
        'checkout body'
      ));

      return failures;
    }
  })
};
