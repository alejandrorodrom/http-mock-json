'use strict';

const { runHttpUseCase } = require('../../lib/execute-mock-file');
const {
  request,
  expectStatus,
  expectEqual,
  expectHeader,
  expectMinDelay
} = require('../../lib/http-assert');

module.exports = {
  name: 'runtime/request-matrix',
  description: 'HTTP: request + match + delay + proxy + combined match permutations',
  run: () => runHttpUseCase({
    name: 'runtime/request-matrix',
    description: 'HTTP: request + match + delay + proxy + combined match permutations',
    mockRelativePath: 'mocks/23-request-matrix.json',
    timeoutMs: 45000,
    async assert({ baseUrl }) {
      const failures = [];

      // 1) request + delay (success path)
      const loginStarted = Date.now();
      const loginOk = await request(`${ baseUrl }/api/v1/auth/login`, {
        method: 'POST',
        json: { email: 'ok@example.com', password: 'secret123' }
      });
      failures.push(...expectMinDelay(Date.now() - loginStarted, 100, 'login response delay'));
      failures.push(...expectStatus(loginOk.status, 200, 'login ok'));
      failures.push(...expectHeader(loginOk.headers, 'x-auth', 'session', 'login header'));
      failures.push(...expectEqual(loginOk.body, { token: 'jwt-ok' }, 'login body'));

      // 2) request + match + delay (matched response delay)
      const lockedStarted = Date.now();
      const locked = await request(`${ baseUrl }/api/v1/auth/login`, {
        method: 'POST',
        json: { email: 'locked@example.com', password: 'secret123' }
      });
      failures.push(...expectMinDelay(Date.now() - lockedStarted, 160, 'login match+delay locked'));
      failures.push(...expectStatus(locked.status, 423, 'login match locked after valid request'));
      failures.push(...expectEqual(locked.body, { code: 'ACCOUNT_LOCKED' }, 'locked body'));

      // request + match (method delay fallback: mfa has no response delay → method 50)
      const mfaStarted = Date.now();
      const mfa = await request(`${ baseUrl }/api/v1/auth/login`, {
        method: 'POST',
        json: { email: 'mfa@example.com', password: 'secret123' }
      });
      failures.push(...expectMinDelay(Date.now() - mfaStarted, 40, 'login match method-delay fallback'));
      failures.push(...expectStatus(mfa.status, 401, 'login match mfa'));

      // 3) request fail + invalidResponse + delay
      const invalidStarted = Date.now();
      const loginInvalid = await request(`${ baseUrl }/api/v1/auth/login`, {
        method: 'POST',
        json: { email: 'bad', password: 'x', otp: '12' }
      });
      failures.push(...expectMinDelay(Date.now() - invalidStarted, 120, 'login invalidResponse delay'));
      failures.push(...expectStatus(loginInvalid.status, 422, 'login validation stops before match'));
      failures.push(...expectEqual(
        loginInvalid.body.errors.map((e) => e.field).sort(),
        ['email', 'otp', 'password'].sort(),
        'login validation fields'
      ));

      const catalogMatch = await request(`${ baseUrl }/api/v1/catalog?q=pro&page=1`);
      failures.push(...expectStatus(catalogMatch.status, 200, 'catalog match query'));
      failures.push(...expectEqual(catalogMatch.body.matched, 'pro', 'catalog matched pro'));

      const catalogFallback = await request(`${ baseUrl }/api/v1/catalog?q=zz`);
      failures.push(...expectStatus(catalogFallback.status, 200, 'catalog fallback'));
      failures.push(...expectEqual(catalogFallback.body.matched, 'fallback', 'catalog fallback body'));

      const catalogInvalid = await request(`${ baseUrl }/api/v1/catalog?q=a&page=0`);
      failures.push(...expectStatus(catalogInvalid.status, 400, 'catalog request before match'));

      const checkoutOk = await request(`${ baseUrl }/api/v1/checkout`, {
        method: 'POST',
        json: {
          cartId: '550e8400-e29b-41d4-a716-446655440000',
          items: [{ sku: 'A', qty: 2 }]
        }
      });
      failures.push(...expectStatus(checkoutOk.status, 201, 'checkout ok'));
      failures.push(...expectHeader(checkoutOk.headers, 'location', '/api/v1/orders/100', 'checkout location'));

      const checkoutCoupon = await request(`${ baseUrl }/api/v1/checkout`, {
        method: 'POST',
        json: {
          cartId: '550e8400-e29b-41d4-a716-446655440000',
          items: [{ sku: 'A', qty: 1 }],
          coupon: 'SAVE20'
        }
      });
      failures.push(...expectStatus(checkoutCoupon.status, 201, 'checkout match coupon'));
      failures.push(...expectEqual(checkoutCoupon.body.discount, 20, 'coupon discount'));

      const checkoutConflict = await request(`${ baseUrl }/api/v1/checkout`, {
        method: 'POST',
        json: {
          cartId: '11111111-1111-4111-8111-111111111111',
          items: [{ sku: 'OUT', qty: 1 }]
        }
      });
      failures.push(...expectStatus(checkoutConflict.status, 409, 'checkout inventory match'));

      const checkoutBad = await request(`${ baseUrl }/api/v1/checkout`, {
        method: 'POST',
        json: {
          cartId: 'bad',
          items: [],
          coupon: '@@'
        }
      });
      failures.push(...expectStatus(checkoutBad.status, 400, 'checkout invalidResponse map'));
      failures.push(...expectEqual(
        checkoutBad.body.message,
        'Checkout validation failed',
        'checkout bad message'
      ));

      const proxyBlocked = await request(`${ baseUrl }/api/v1/proxy-guard`, {
        method: 'POST',
        json: { title: 'x' }
      });
      failures.push(...expectStatus(proxyBlocked.status, 422, 'proxy blocked by request validation'));

      const proxyMock = await request(`${ baseUrl }/api/v1/proxy-guard`, {
        method: 'POST',
        json: { title: 'mock-title' }
      });
      failures.push(...expectStatus(proxyMock.status, 200, 'proxy-guard mock after valid'));
      failures.push(...expectEqual(proxyMock.body, { source: 'mock' }, 'proxy-guard mock body'));

      // 4) request + match + proxy (live upstream)
      const proxyLive = await request(`${ baseUrl }/api/v1/proxy-guard`, {
        method: 'POST',
        json: { title: 'live-post', body: 'from-mock', userId: 1 }
      });
      failures.push(...expectStatus(proxyLive.status, 201, 'request+match+proxy live'));
      if (!proxyLive.body || proxyLive.body.title !== 'live-post') {
        failures.push(
          `proxy live body.title expected "live-post", received ${ JSON.stringify(proxyLive.body) }`
        );
      }

      // 5) request + match.params + match.query + match.body + delay
      const ticketStarted = Date.now();
      const ticketAdmin = await request(
        `${ baseUrl }/api/v1/tickets/t1?actor=admin&channel=web`,
        { method: 'PATCH', json: { status: 'closed', note: 'done' } }
      );
      failures.push(...expectMinDelay(Date.now() - ticketStarted, 140, 'ticket match+delay'));
      failures.push(...expectStatus(ticketAdmin.status, 200, 'ticket admin-web-close'));
      failures.push(...expectHeader(ticketAdmin.headers, 'x-match', 'admin-web-close', 'ticket header'));
      failures.push(...expectEqual(ticketAdmin.body, { matched: 'admin-web-close' }, 'ticket body'));

      const ticketAgent = await request(
        `${ baseUrl }/api/v1/tickets/t2?actor=agent`,
        { method: 'PATCH', json: { status: 'open' } }
      );
      failures.push(...expectStatus(ticketAgent.status, 200, 'ticket agent match'));
      failures.push(...expectEqual(ticketAgent.body.matched, 'agent-app-open', 'ticket agent body'));

      const ticketFallback = await request(
        `${ baseUrl }/api/v1/tickets/t9?actor=admin&channel=web`,
        { method: 'PATCH', json: { status: 'closed' } }
      );
      failures.push(...expectStatus(ticketFallback.status, 200, 'ticket fallback'));
      failures.push(...expectEqual(ticketFallback.body.matched, 'fallback', 'ticket fallback body'));

      const ticketInvalidStarted = Date.now();
      const ticketInvalid = await request(
        `${ baseUrl }/api/v1/tickets/t1?actor=admin&channel=web`,
        { method: 'PATCH', json: { status: 'unknown' } }
      );
      failures.push(...expectMinDelay(Date.now() - ticketInvalidStarted, 90, 'ticket invalidResponse delay'));
      failures.push(...expectStatus(ticketInvalid.status, 422, 'ticket request blocks match'));

      const typesOk = await request(`${ baseUrl }/api/v1/types`, {
        method: 'POST',
        json: {
          flag: true,
          count: 3,
          label: 'x',
          meta: { a: 1 },
          tags: ['a', 'b']
        }
      });
      failures.push(...expectStatus(typesOk.status, 200, 'types matrix ok'));

      const typesBad = await request(`${ baseUrl }/api/v1/types`, {
        method: 'POST',
        json: {
          flag: 'true',
          count: '3',
          label: 1,
          meta: [],
          tags: [1, 2, 3, 4]
        }
      });
      failures.push(...expectStatus(typesBad.status, 400, 'types matrix invalid'));
      failures.push(...expectEqual(
        typesBad.body.errors.map((e) => e.path).sort(),
        ['count', 'flag', 'label', 'meta', 'tags', 'tags.0', 'tags.1', 'tags.2', 'tags.3'].sort(),
        'types error paths'
      ));

      return failures;
    }
  })
};
