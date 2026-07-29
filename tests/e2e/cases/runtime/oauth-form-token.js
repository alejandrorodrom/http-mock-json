'use strict';

const path = require('path');
const fs = require('fs');
const { createWorkspace, startMockServer } = require('../../lib/server-harness');
const { expectStatus, expectEqual } = require('../../lib/http-assert');

const formBody = (fields) => new URLSearchParams(fields).toString();

module.exports = {
  name: 'runtime/oauth-form-token',
  description: 'HTTP: OAuth2 as:form validation + match.body on urlencoded grants',
  async run() {
    const startedAt = Date.now();
    const failures = [];
    const repoRoot = path.resolve(__dirname, '../../../..');
    const { workspaceDir, cleanup } = createWorkspace(null, { emptyMocksDir: true });
    const mocksDir = path.join(workspaceDir, 'mocks');
    fs.copyFileSync(
      path.join(repoRoot, 'mocks/48-oauth-form-token.json'),
      path.join(mocksDir, '48-oauth-form-token.json')
    );

    let server;

    try {
      server = await startMockServer({
        workspaceDir,
        cleanup,
        cleanupOnStop: false,
        timeoutMs: 20000
      });

      const base = server.baseUrl;
      const headers = { 'Content-Type': 'application/x-www-form-urlencoded' };

      const passwordOk = await fetch(`${ base }/oauth/token`, {
        method: 'POST',
        headers,
        body: formBody({
          grant_type: 'password',
          client_id: 'web_app',
          username: 'ada',
          password: 'secret',
          scope: 'openid profile'
        })
      });
      failures.push(...expectStatus(passwordOk.status, 200, 'password ok status'));
      failures.push(...expectEqual(
        (await passwordOk.json()).access_token,
        'access_ada_ok',
        'password ok token'
      ));

      const passwordBad = await fetch(`${ base }/oauth/token`, {
        method: 'POST',
        headers,
        body: formBody({
          grant_type: 'password',
          client_id: 'web_app',
          username: 'ada',
          password: 'wrong'
        })
      });
      const passwordBadJson = await passwordBad.json();
      failures.push(...expectStatus(passwordBad.status, 401, 'password bad status'));
      failures.push(...expectEqual(passwordBadJson.error, 'invalid_grant', 'password bad error'));

      const refreshReuse = await fetch(`${ base }/oauth/token`, {
        method: 'POST',
        headers,
        body: formBody({
          grant_type: 'refresh_token',
          client_id: 'web_app',
          refresh_token: 'rt_reused'
        })
      });
      failures.push(...expectStatus(refreshReuse.status, 401, 'refresh reuse status'));

      const refreshOk = await fetch(`${ base }/oauth/token`, {
        method: 'POST',
        headers,
        body: formBody({
          grant_type: 'refresh_token',
          client_id: 'web_app',
          refresh_token: 'rt_ada_ok'
        })
      });
      failures.push(...expectStatus(refreshOk.status, 200, 'refresh ok status'));
      failures.push(...expectEqual(
        (await refreshOk.json()).access_token,
        'access_rotated',
        'refresh ok token'
      ));

      const clientOk = await fetch(`${ base }/oauth/token`, {
        method: 'POST',
        headers,
        body: formBody({
          grant_type: 'client_credentials',
          client_id: 'svc_payments',
          client_secret: 'supersecret'
        })
      });
      failures.push(...expectStatus(clientOk.status, 200, 'client credentials status'));
      failures.push(...expectEqual(
        (await clientOk.json()).access_token,
        'access_svc_payments',
        'client credentials token'
      ));

      const clientFallback = await fetch(`${ base }/oauth/token`, {
        method: 'POST',
        headers,
        body: formBody({
          grant_type: 'client_credentials',
          client_id: 'svc_other',
          client_secret: 'supersecret'
        })
      });
      failures.push(...expectStatus(clientFallback.status, 200, 'client fallback status'));
      failures.push(...expectEqual(
        (await clientFallback.json()).access_token,
        'access_fallback',
        'client fallback token'
      ));

      const invalidGrant = await fetch(`${ base }/oauth/token`, {
        method: 'POST',
        headers,
        body: formBody({
          grant_type: 'authorization_code',
          client_id: 'web_app'
        })
      });
      const invalidGrantJson = await invalidGrant.json();
      failures.push(...expectStatus(invalidGrant.status, 400, 'invalid grant_type status'));
      failures.push(...expectEqual(
        Boolean(invalidGrantJson.errors && invalidGrantJson.errors.grant_type),
        true,
        'invalid grant_type map key'
      ));

      const asMismatch = await fetch(`${ base }/oauth/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grant_type: 'password',
          client_id: 'web_app',
          username: 'ada',
          password: 'secret'
        })
      });
      failures.push(...expectStatus(asMismatch.status, 400, 'json vs form mismatch status'));

      const revokeOk = await fetch(`${ base }/oauth/revoke`, {
        method: 'POST',
        headers,
        body: formBody({
          token: 'access_ada_ok',
          token_type_hint: 'access_token',
          client_id: 'web_app'
        })
      });
      failures.push(...expectStatus(revokeOk.status, 200, 'revoke ok status'));
      failures.push(...expectEqual(await revokeOk.json(), { revoked: true }, 'revoke ok body'));

      const revokeUnknown = await fetch(`${ base }/oauth/revoke`, {
        method: 'POST',
        headers,
        body: formBody({
          token: 'access_unknown',
          client_id: 'web_app'
        })
      });
      failures.push(...expectStatus(revokeUnknown.status, 200, 'revoke unknown status'));
      failures.push(...expectEqual(
        (await revokeUnknown.json()).revoked,
        false,
        'revoke unknown body'
      ));
    } catch (error) {
      failures.push(error instanceof Error ? error.message : String(error));
    } finally {
      if (server) {
        await server.stop();
      }
      cleanup();
    }

    return {
      name: 'runtime/oauth-form-token',
      description: 'HTTP: OAuth2 as:form validation + match.body on urlencoded grants',
      passed: failures.length === 0,
      failures,
      durationMs: Date.now() - startedAt,
      expectedOutcome: 'success'
    };
  }
};
