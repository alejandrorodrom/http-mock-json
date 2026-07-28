'use strict';

const { runHttpUseCase } = require('../../lib/execute-mock-file');
const { request, expectStatus, expectEqual } = require('../../lib/http-assert');

module.exports = {
  name: 'runtime/match-call',
  description: 'HTTP: match.call index/by/loop/reset + query/params/nested/missing/request/combined',
  run: () => runHttpUseCase({
    name: 'runtime/match-call',
    description: 'HTTP: match.call index/by/loop/reset + query/params/nested/missing/request/combined',
    mockRelativePath: 'mocks/40-match-call.json',
    async assert({ baseUrl }) {
      const failures = [];

      // --- shorthand + reset ---
      const attempt1 = await request(`${ baseUrl }/api/auth/login`, {
        method: 'POST',
        json: { email: 'user@example.com', password: 'wrong' }
      });
      failures.push(...expectStatus(attempt1.status, 401, 'login attempt 1'));
      failures.push(...expectEqual(
        attempt1.body,
        { error: 'INVALID_CREDENTIALS', attemptsLeft: 2 },
        'login attempt 1 body'
      ));

      const attempt2 = await request(`${ baseUrl }/api/auth/login`, {
        method: 'POST',
        json: { email: 'user@example.com', password: 'wrong' }
      });
      failures.push(...expectStatus(attempt2.status, 401, 'login attempt 2'));
      failures.push(...expectEqual(
        attempt2.body,
        { error: 'INVALID_CREDENTIALS', attemptsLeft: 1 },
        'login attempt 2 body'
      ));

      const locked = await request(`${ baseUrl }/api/auth/login`, {
        method: 'POST',
        json: { email: 'user@example.com', password: 'wrong' }
      });
      failures.push(...expectStatus(locked.status, 423, 'login locked'));
      failures.push(...expectEqual(
        locked.body,
        { error: 'ACCOUNT_LOCKED' },
        'login locked body'
      ));

      const success = await request(`${ baseUrl }/api/auth/login`, {
        method: 'POST',
        json: { email: 'user@example.com', password: 'correct' }
      });
      failures.push(...expectStatus(success.status, 200, 'login success resets counter'));
      failures.push(...expectEqual(
        success.body,
        { token: 'mock-jwt-token' },
        'login success body'
      ));

      const afterReset = await request(`${ baseUrl }/api/auth/login`, {
        method: 'POST',
        json: { email: 'user@example.com', password: 'wrong' }
      });
      failures.push(...expectStatus(afterReset.status, 401, 'login attempt 1 after reset'));
      failures.push(...expectEqual(
        afterReset.body,
        { error: 'INVALID_CREDENTIALS', attemptsLeft: 2 },
        'login attempt 1 after reset body'
      ));

      // --- by.body (independent counters) ---
      const alice1 = await request(`${ baseUrl }/api/auth/login-by`, {
        method: 'POST',
        json: { email: 'alice@example.com', password: 'wrong' }
      });
      failures.push(...expectStatus(alice1.status, 401, 'alice attempt 1'));
      failures.push(...expectEqual(
        alice1.body,
        { error: 'INVALID_CREDENTIALS', attemptsLeft: 2, scope: 'per-email' },
        'alice attempt 1 body'
      ));

      const bob1 = await request(`${ baseUrl }/api/auth/login-by`, {
        method: 'POST',
        json: { email: 'bob@example.com', password: 'wrong' }
      });
      failures.push(...expectStatus(bob1.status, 401, 'bob attempt 1 (independent)'));
      failures.push(...expectEqual(
        bob1.body,
        { error: 'INVALID_CREDENTIALS', attemptsLeft: 2, scope: 'per-email' },
        'bob attempt 1 body'
      ));

      const alice2 = await request(`${ baseUrl }/api/auth/login-by`, {
        method: 'POST',
        json: { email: 'alice@example.com', password: 'wrong' }
      });
      failures.push(...expectStatus(alice2.status, 401, 'alice attempt 2'));
      failures.push(...expectEqual(
        alice2.body,
        { error: 'INVALID_CREDENTIALS', attemptsLeft: 1, scope: 'per-email' },
        'alice attempt 2 body'
      ));

      const aliceOk = await request(`${ baseUrl }/api/auth/login-by`, {
        method: 'POST',
        json: { email: 'alice@example.com', password: 'correct' }
      });
      failures.push(...expectStatus(aliceOk.status, 200, 'alice success reset'));
      failures.push(...expectEqual(
        aliceOk.body,
        { token: 'per-email-token' },
        'alice success body'
      ));

      const aliceAgain = await request(`${ baseUrl }/api/auth/login-by`, {
        method: 'POST',
        json: { email: 'alice@example.com', password: 'wrong' }
      });
      failures.push(...expectStatus(aliceAgain.status, 401, 'alice attempt 1 after reset'));
      failures.push(...expectEqual(
        aliceAgain.body,
        { error: 'INVALID_CREDENTIALS', attemptsLeft: 2, scope: 'per-email' },
        'alice after reset body'
      ));

      const bob2 = await request(`${ baseUrl }/api/auth/login-by`, {
        method: 'POST',
        json: { email: 'bob@example.com', password: 'wrong' }
      });
      failures.push(...expectStatus(bob2.status, 401, 'bob attempt 2 still independent'));
      failures.push(...expectEqual(
        bob2.body,
        { error: 'INVALID_CREDENTIALS', attemptsLeft: 1, scope: 'per-email' },
        'bob attempt 2 body'
      ));

      // --- by.body nested path ---
      const nested1 = await request(`${ baseUrl }/api/auth/login-nested`, {
        method: 'POST',
        json: { user: { email: 'nested@example.com' }, password: 'wrong' }
      });
      failures.push(...expectStatus(nested1.status, 401, 'nested by attempt 1'));
      failures.push(...expectEqual(
        nested1.body,
        { error: 'INVALID_CREDENTIALS', scope: 'nested-email', attemptsLeft: 1 },
        'nested attempt 1 body'
      ));

      const nestedOther = await request(`${ baseUrl }/api/auth/login-nested`, {
        method: 'POST',
        json: { user: { email: 'other@example.com' }, password: 'wrong' }
      });
      failures.push(...expectStatus(nestedOther.status, 401, 'nested other user attempt 1'));
      failures.push(...expectEqual(
        nestedOther.body,
        { error: 'INVALID_CREDENTIALS', scope: 'nested-email', attemptsLeft: 1 },
        'nested other body'
      ));

      const nestedLock = await request(`${ baseUrl }/api/auth/login-nested`, {
        method: 'POST',
        json: { user: { email: 'nested@example.com' }, password: 'wrong' }
      });
      failures.push(...expectStatus(nestedLock.status, 423, 'nested lock'));
      failures.push(...expectEqual(
        nestedLock.body,
        { error: 'ACCOUNT_LOCKED', scope: 'nested-email' },
        'nested lock body'
      ));

      // --- by missing → no index match, counter not advanced ---
      const missingBy = await request(`${ baseUrl }/api/auth/login-missing-by`, {
        method: 'POST',
        json: { password: 'wrong' }
      });
      failures.push(...expectStatus(missingBy.status, 400, 'missing by → nameResponse'));
      failures.push(...expectEqual(
        missingBy.body,
        { error: 'EMAIL_REQUIRED_FOR_CALL_SCOPE' },
        'missing by body'
      ));

      const missingByAgain = await request(`${ baseUrl }/api/auth/login-missing-by`, {
        method: 'POST',
        json: { password: 'wrong' }
      });
      failures.push(...expectStatus(missingByAgain.status, 400, 'missing by again (still no counter)'));

      const withEmail = await request(`${ baseUrl }/api/auth/login-missing-by`, {
        method: 'POST',
        json: { email: 'now@example.com', password: 'wrong' }
      });
      failures.push(...expectStatus(withEmail.status, 401, 'by present → call index 1'));
      failures.push(...expectEqual(
        withEmail.body,
        { error: 'ATTEMPT_1' },
        'by present body'
      ));

      // --- request invalid does not advance call counter ---
      const invalidPayload = await request(`${ baseUrl }/api/auth/login-validated`, {
        method: 'POST',
        json: { email: 'bad', password: 'x' }
      });
      failures.push(...expectStatus(invalidPayload.status, 422, 'validated invalid payload'));
      if (invalidPayload.body?.message !== 'Invalid login') {
        failures.push(
          `validated invalid message: expected "Invalid login", got ${ JSON.stringify(invalidPayload.body) }`
        );
      }
      if (!Array.isArray(invalidPayload.body?.errors) || invalidPayload.body.errors.length < 1) {
        failures.push('validated invalid body should include non-empty errors array');
      }

      const stillFirst = await request(`${ baseUrl }/api/auth/login-validated`, {
        method: 'POST',
        json: { email: 'ok@example.com', password: 'wrong' }
      });
      failures.push(...expectStatus(stillFirst.status, 401, 'validated still call 1 after invalid'));
      failures.push(...expectEqual(
        stillFirst.body,
        { error: 'INVALID_CREDENTIALS', attemptsLeft: 2, scope: 'validated' },
        'validated call 1 body'
      ));

      const validated2 = await request(`${ baseUrl }/api/auth/login-validated`, {
        method: 'POST',
        json: { email: 'ok@example.com', password: 'wrong' }
      });
      failures.push(...expectStatus(validated2.status, 401, 'validated call 2'));
      failures.push(...expectEqual(
        validated2.body,
        { error: 'INVALID_CREDENTIALS', attemptsLeft: 1, scope: 'validated' },
        'validated call 2 body'
      ));

      // --- by.query ---
      const otpAlice1 = await request(`${ baseUrl }/api/otp?user=alice`);
      failures.push(...expectStatus(otpAlice1.status, 200, 'otp alice 1'));
      failures.push(...expectEqual(otpAlice1.body, { sent: true, attempt: 1 }, 'otp alice 1 body'));

      const otpBob1 = await request(`${ baseUrl }/api/otp?user=bob`);
      failures.push(...expectStatus(otpBob1.status, 200, 'otp bob 1 independent'));
      failures.push(...expectEqual(otpBob1.body, { sent: true, attempt: 1 }, 'otp bob 1 body'));

      const otpAlice2 = await request(`${ baseUrl }/api/otp?user=alice`);
      failures.push(...expectStatus(otpAlice2.status, 200, 'otp alice 2'));
      failures.push(...expectEqual(otpAlice2.body, { sent: true, attempt: 2 }, 'otp alice 2 body'));

      const otpAliceLimit = await request(`${ baseUrl }/api/otp?user=alice`);
      failures.push(...expectStatus(otpAliceLimit.status, 429, 'otp alice limit'));
      failures.push(...expectEqual(otpAliceLimit.body, { error: 'OTP_LIMIT' }, 'otp alice limit body'));

      // --- by.params ---
      const pingAcme1 = await request(`${ baseUrl }/api/tenants/acme/ping`);
      failures.push(...expectStatus(pingAcme1.status, 200, 'ping acme 1'));
      failures.push(...expectEqual(pingAcme1.body, { pong: 1 }, 'ping acme 1 body'));

      const pingBeta1 = await request(`${ baseUrl }/api/tenants/beta/ping`);
      failures.push(...expectStatus(pingBeta1.status, 200, 'ping beta 1 independent'));
      failures.push(...expectEqual(pingBeta1.body, { pong: 1 }, 'ping beta 1 body'));

      const pingAcme2 = await request(`${ baseUrl }/api/tenants/acme/ping`);
      failures.push(...expectStatus(pingAcme2.status, 200, 'ping acme 2'));
      failures.push(...expectEqual(pingAcme2.body, { pong: 2 }, 'ping acme 2 body'));

      const pingAcmeLimit = await request(`${ baseUrl }/api/tenants/acme/ping`);
      failures.push(...expectStatus(pingAcmeLimit.status, 429, 'ping acme limit'));
      failures.push(...expectEqual(pingAcmeLimit.body, { error: 'PING_LIMIT' }, 'ping acme limit body'));

      // --- call + params + query + body ---
      const step1 = await request(`${ baseUrl }/api/orgs/acme/actions?op=retry`, {
        method: 'POST',
        json: { phase: 'run' }
      });
      failures.push(...expectStatus(step1.status, 200, 'combined step 1'));
      failures.push(...expectEqual(step1.body, { step: 1 }, 'combined step 1 body'));

      const step2 = await request(`${ baseUrl }/api/orgs/acme/actions?op=retry`, {
        method: 'POST',
        json: { phase: 'run' }
      });
      failures.push(...expectStatus(step2.status, 200, 'combined step 2'));
      failures.push(...expectEqual(step2.body, { step: 2 }, 'combined step 2 body'));

      const stepDone = await request(`${ baseUrl }/api/orgs/acme/actions?op=retry`, {
        method: 'POST',
        json: { phase: 'run' }
      });
      failures.push(...expectStatus(stepDone.status, 200, 'combined fallback'));
      failures.push(...expectEqual(stepDone.body, { step: 'done' }, 'combined fallback body'));

      // non-matching params/query still advances the (global) counter
      const otherOrg = await request(`${ baseUrl }/api/orgs/other/actions?op=retry`, {
        method: 'POST',
        json: { phase: 'run' }
      });
      failures.push(...expectStatus(otherOrg.status, 200, 'other org advances counter → fallback'));
      failures.push(...expectEqual(otherOrg.body, { step: 'done' }, 'other org body'));

      // --- flaky shorthand ---
      const flakyFail = await request(`${ baseUrl }/api/flaky`);
      failures.push(...expectStatus(flakyFail.status, 503, 'flaky first call'));
      failures.push(...expectEqual(flakyFail.body, { ok: false }, 'flaky first body'));

      const flakyOk = await request(`${ baseUrl }/api/flaky`);
      failures.push(...expectStatus(flakyOk.status, 200, 'flaky second call'));
      failures.push(...expectEqual(flakyOk.body, { ok: true }, 'flaky second body'));

      // --- loop ---
      const loop1 = await request(`${ baseUrl }/api/flaky-loop`);
      failures.push(...expectStatus(loop1.status, 503, 'loop call 1'));
      failures.push(...expectEqual(loop1.body, { ok: false, wave: 1 }, 'loop call 1 body'));

      const loop2 = await request(`${ baseUrl }/api/flaky-loop`);
      failures.push(...expectStatus(loop2.status, 200, 'loop call 2'));
      failures.push(...expectEqual(loop2.body, { ok: true, wave: 2 }, 'loop call 2 body'));

      const loop3 = await request(`${ baseUrl }/api/flaky-loop`);
      failures.push(...expectStatus(loop3.status, 503, 'loop call 3 wraps to 1'));
      failures.push(...expectEqual(loop3.body, { ok: false, wave: 1 }, 'loop call 3 body'));

      const loop4 = await request(`${ baseUrl }/api/flaky-loop`);
      failures.push(...expectStatus(loop4.status, 200, 'loop call 4 wraps to 2'));
      failures.push(...expectEqual(loop4.body, { ok: true, wave: 2 }, 'loop call 4 body'));

      return failures;
    }
  })
};
