'use strict';

const { runHttpUseCase } = require('../../lib/execute-mock-file');
const { request, expectStatus, expectEqual } = require('../../lib/http-assert');

module.exports = {
  name: 'runtime/request-saas',
  description: 'HTTP: real SaaS flows with request validation + business match errors',
  run: () => runHttpUseCase({
    name: 'runtime/request-saas',
    description: 'HTTP: real SaaS flows with request validation + business match errors',
    mockRelativePath: 'mocks/24-request-saas.json',
    timeoutMs: 20000,
    async assert({ baseUrl }) {
      const failures = [];

      const signupOk = await request(`${ baseUrl }/api/saas/signup`, {
        method: 'POST',
        json: {
          email: 'new@acme.com',
          password: 'super-secret',
          company: 'Acme',
          plan: 'pro',
          seats: 5,
          website: 'https://acme.com',
          billing: { country: 'ES', vat: 'ESA12345678' }
        }
      });
      failures.push(...expectStatus(signupOk.status, 201, 'saas signup ok'));
      failures.push(...expectEqual(signupOk.body.status, 'active', 'saas signup status'));

      const signupTaken = await request(`${ baseUrl }/api/saas/signup`, {
        method: 'POST',
        json: {
          email: 'taken@acme.com',
          password: 'super-secret',
          company: 'Acme',
          plan: 'free',
          billing: { country: 'ES' }
        }
      });
      failures.push(...expectStatus(signupTaken.status, 409, 'saas signup email taken after valid'));
      failures.push(...expectEqual(signupTaken.body, { code: 'EMAIL_TAKEN' }, 'saas taken body'));

      const signupInvalid = await request(`${ baseUrl }/api/saas/signup`, {
        method: 'POST',
        json: {
          email: 'bad',
          password: 'short',
          company: 'A',
          plan: 'enterprise',
          seats: 0,
          billing: { country: 'ESP', vat: 'bad' }
        }
      });
      failures.push(...expectStatus(signupInvalid.status, 422, 'saas signup validation'));
      failures.push(...expectEqual(
        signupInvalid.body.message,
        'Signup validation failed',
        'saas signup validation message'
      ));
      failures.push(...expectEqual(
        signupInvalid.body.errors.some((e) => e.field === 'email' && e.message === 'Use a valid work email'),
        true,
        'saas custom email message'
      ));

      const inviteOk = await request(`${ baseUrl }/api/saas/orgs/org_1/members`, {
        method: 'POST',
        json: { email: 'member@acme.com', role: 'member' }
      });
      failures.push(...expectStatus(inviteOk.status, 201, 'saas invite ok'));

      const inviteForbidden = await request(`${ baseUrl }/api/saas/orgs/org_2/members`, {
        method: 'POST',
        json: { email: 'x@acme.com', role: 'owner' }
      });
      failures.push(...expectStatus(inviteForbidden.status, 403, 'saas invite forbidden match'));

      const inviteNotFound = await request(`${ baseUrl }/api/saas/orgs/missing/members`, {
        method: 'POST',
        json: { email: 'x@acme.com', role: 'member' }
      });
      failures.push(...expectStatus(inviteNotFound.status, 404, 'saas invite fallback not-found'));

      const inviteInvalid = await request(`${ baseUrl }/api/saas/orgs/org_1/members`, {
        method: 'POST',
        json: { email: 'bad', role: 'root' }
      });
      failures.push(...expectStatus(inviteInvalid.status, 422, 'saas invite validation before match'));

      const webhookOk = await request(`${ baseUrl }/api/saas/webhooks`, {
        method: 'POST',
        json: {
          url: 'https://hooks.example.com/saas',
          events: ['invoice.paid', 'member.joined'],
          secret: '1234567890abcdef'
        }
      });
      failures.push(...expectStatus(webhookOk.status, 201, 'saas webhook ok'));

      const webhookBad = await request(`${ baseUrl }/api/saas/webhooks`, {
        method: 'POST',
        json: {
          url: 'ftp://x',
          events: ['unknown'],
          secret: 'short'
        }
      });
      failures.push(...expectStatus(webhookBad.status, 400, 'saas webhook default 400 map'));
      failures.push(...expectEqual(
        typeof webhookBad.body.errors === 'object' && !Array.isArray(webhookBad.body.errors),
        true,
        'saas webhook errors map'
      ));

      const reportOk = await request(
        `${ baseUrl }/api/saas/reports?from=2024-01-01&to=2024-12-31&format=csv`
      );
      failures.push(...expectStatus(reportOk.status, 200, 'saas report ok'));
      failures.push(...expectEqual(reportOk.body, { rows: 12 }, 'saas report body'));

      const reportBad = await request(`${ baseUrl }/api/saas/reports?from=bad&to=also-bad&format=xml`);
      failures.push(...expectStatus(reportBad.status, 400, 'saas report invalidResponse'));
      failures.push(...expectEqual(
        reportBad.body.message,
        'Invalid report query',
        'saas report message'
      ));
      failures.push(...expectEqual(
        Object.keys(reportBad.body.fields).sort(),
        ['query.format', 'query.from', 'query.to'].sort(),
        'saas report field keys'
      ));

      return failures;
    }
  })
};
