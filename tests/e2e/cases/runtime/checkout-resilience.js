'use strict';

/**
 * Checkout / payments resilience patterns inspired by Stripe docs:
 * card declines, idempotency key reuse (409), rate limit 429 + Retry-After,
 * provider 503, and combined query+body match for happy-path checkout.
 */

const { runHttpUseCase } = require('../../lib/execute-mock-file');
const {
  request,
  expectStatus,
  expectEqual,
  expectHeader,
  expectMinDelay
} = require('../../lib/http-assert');

module.exports = {
  name: 'runtime/checkout-resilience',
  description: 'HTTP: checkout 402/409/429/503 + idempotency + Retry-After',
  run: () => runHttpUseCase({
    name: 'runtime/checkout-resilience',
    description: 'HTTP: checkout 402/409/429/503 + idempotency + Retry-After',
    mockRelativePath: 'mocks/19-checkout-resilience.json',
    timeoutMs: 20000,
    async assert({ baseUrl }) {
      const failures = [];

      const rateStarted = Date.now();
      const rateLimited = await request(
        `${ baseUrl }/api/v1/checkout/sessions?scenario=rate_limit`,
        { method: 'POST', json: { amount: 100 } }
      );
      failures.push(...expectMinDelay(Date.now() - rateStarted, 180, '429 delay'));
      failures.push(...expectStatus(rateLimited.status, 429, 'rate limit'));
      failures.push(...expectHeader(rateLimited.headers, 'retry-after', '2', 'Retry-After'));
      failures.push(...expectEqual(rateLimited.body.code, 'RATE_LIMITED', 'rate code'));

      const unavailable = await request(
        `${ baseUrl }/api/v1/checkout/sessions?scenario=maintenance`,
        { method: 'POST', json: { amount: 100 } }
      );
      failures.push(...expectStatus(unavailable.status, 503, 'maintenance'));
      failures.push(...expectHeader(unavailable.headers, 'retry-after', '30', '503 Retry-After'));
      failures.push(...expectEqual(unavailable.body.code, 'PROVIDER_UNAVAILABLE', '503 code'));

      const declined = await request(`${ baseUrl }/api/v1/checkout/sessions`, {
        method: 'POST',
        json: {
          paymentMethod: 'card',
          card: { number: '4000000000000002' }
        }
      });
      failures.push(...expectStatus(declined.status, 402, 'card declined'));
      failures.push(...expectEqual(declined.body.code, 'CARD_DECLINED', 'decline code'));

      const funds = await request(`${ baseUrl }/api/v1/checkout/sessions`, {
        method: 'POST',
        json: {
          paymentMethod: 'card',
          card: { number: '4000000000009995' }
        }
      });
      failures.push(...expectStatus(funds.status, 402, 'insufficient funds'));
      failures.push(...expectEqual(funds.body.declineCode, 'insufficient_funds', 'funds decline'));

      const replay = await request(`${ baseUrl }/api/v1/checkout/sessions`, {
        method: 'POST',
        json: { idempotencyKey: 'idem_replay_001', amount: 2500 }
      });
      failures.push(...expectStatus(replay.status, 200, 'idempotent replay'));
      failures.push(...expectHeader(replay.headers, 'idempotent-replayed', 'true', 'replayed header'));
      failures.push(...expectEqual(replay.body.replayed, true, 'replayed body'));

      const idemConflict = await request(`${ baseUrl }/api/v1/checkout/sessions`, {
        method: 'POST',
        json: { idempotencyKey: 'idem_conflict_001', amount: 9999 }
      });
      failures.push(...expectStatus(idemConflict.status, 409, 'idempotency conflict'));
      failures.push(...expectEqual(
        idemConflict.body.code,
        'IDEMPOTENCY_KEY_MISMATCH',
        'idempotency code'
      ));

      const inventory = await request(
        `${ baseUrl }/api/v1/checkout/sessions?source=web`,
        {
          method: 'POST',
          json: { sku: 'SKU-OOS', quantity: 1 }
        }
      );
      failures.push(...expectStatus(inventory.status, 409, 'inventory conflict'));
      failures.push(...expectEqual(inventory.body.code, 'INVENTORY_CONFLICT', 'inventory code'));

      const okStarted = Date.now();
      const created = await request(
        `${ baseUrl }/api/v1/checkout/sessions?source=web`,
        {
          method: 'POST',
          json: { paymentMethod: 'card', amount: 2500, currency: 'usd' }
        }
      );
      failures.push(...expectMinDelay(Date.now() - okStarted, 200, 'checkout latency'));
      failures.push(...expectStatus(created.status, 201, 'checkout created'));
      failures.push(...expectEqual(created.body.id, 'cs_ok_001', 'session id'));

      const fallback = await request(`${ baseUrl }/api/v1/checkout/sessions`, {
        method: 'POST',
        json: { amount: 1 }
      });
      failures.push(...expectStatus(fallback.status, 400, 'bad-request fallback'));
      failures.push(...expectEqual(fallback.body.code, 'BAD_REQUEST', 'bad request code'));

      const session = await request(
        `${ baseUrl }/api/v1/checkout/sessions/cs_ok_001?expand=payment`
      );
      failures.push(...expectStatus(session.status, 200, 'session expand'));
      failures.push(...expectEqual(session.body.payment.status, 'succeeded', 'payment status'));

      const pendingStarted = Date.now();
      const pending = await request(`${ baseUrl }/api/v1/checkout/sessions/cs_pending_001`);
      failures.push(...expectMinDelay(Date.now() - pendingStarted, 250, 'processing delay'));
      failures.push(...expectStatus(pending.status, 200, 'processing session'));
      failures.push(...expectEqual(pending.body.status, 'processing', 'processing status'));

      const missing = await request(`${ baseUrl }/api/v1/checkout/sessions/cs_missing`);
      failures.push(...expectStatus(missing.status, 404, 'session not found'));

      return failures;
    }
  })
};
