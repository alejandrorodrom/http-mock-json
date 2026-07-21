'use strict';

/**
 * Exhaustive match matrix on shared endpoints:
 * - params + query + body combinations
 * - first-match-wins with overlapping rules
 * - every controlled error branch (401/403/404/409/410/422/429)
 * - nameResponse fallback when nothing matches
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
  name: 'runtime/match-matrix',
  description: 'HTTP: multi-match matrix + first-wins + all error branches',
  run: () => runHttpUseCase({
    name: 'runtime/match-matrix',
    description: 'HTTP: multi-match matrix + first-wins + all error branches',
    mockRelativePath: 'mocks/21-match-matrix.json',
    timeoutMs: 20000,
    async assert({ baseUrl }) {
      const failures = [];

      const resolveWeb = await request(
        `${ baseUrl }/api/v1/tickets/t_1?actor=admin&channel=web`,
        {
          method: 'PATCH',
          json: { status: 'resolved', resolution: 'fixed', note: 'extra ok' }
        }
      );
      failures.push(...expectStatus(resolveWeb.status, 200, 'resolve-admin-web'));
      failures.push(...expectHeader(resolveWeb.headers, 'x-match', 'resolve-admin-web', 'web match'));
      failures.push(...expectEqual(resolveWeb.body.status, 'resolved', 'web status'));

      const resolveApp = await request(
        `${ baseUrl }/api/v1/tickets/t_1?actor=admin&channel=app`,
        { method: 'PATCH', json: { status: 'resolved' } }
      );
      failures.push(...expectStatus(resolveApp.status, 200, 'resolve-admin-app'));
      failures.push(...expectHeader(resolveApp.headers, 'x-match', 'resolve-admin-app', 'app match'));
      failures.push(...expectEqual(resolveApp.body.channel, 'app', 'app channel'));

      const reopenStarted = Date.now();
      const reopen = await request(
        `${ baseUrl }/api/v1/tickets/t_2?actor=agent`,
        {
          method: 'PATCH',
          json: { status: 'open', reason: 'customer_reply' }
        }
      );
      failures.push(...expectMinDelay(Date.now() - reopenStarted, 100, 'reopen delay'));
      failures.push(...expectStatus(reopen.status, 200, 'reopen-agent'));
      failures.push(...expectHeader(reopen.headers, 'x-match', 'reopen-agent', 'reopen match'));

      // Overlapping matches: more specific second rule must NOT win
      const firstWins = await request(
        `${ baseUrl }/api/v1/tickets/t_3?actor=admin`,
        {
          method: 'PATCH',
          json: { assignee: 'user_9', priority: 'high' }
        }
      );
      failures.push(...expectStatus(firstWins.status, 200, 'overlap first-wins status'));
      failures.push(...expectHeader(
        firstWins.headers,
        'x-match',
        'assign-overlap-first-wins',
        'overlap first-wins header'
      ));
      failures.push(...expectEqual(firstWins.body.matched, 'first', 'overlap first body'));

      const validation = await request(
        `${ baseUrl }/api/v1/tickets/t_1?actor=admin&channel=web`,
        { method: 'PATCH', json: { status: '' } }
      );
      failures.push(...expectStatus(validation.status, 422, 'validation empty status'));
      failures.push(...expectHeader(
        validation.headers,
        'x-match',
        'validation-empty-status',
        'validation match'
      ));
      failures.push(...expectEqual(validation.body.code, 'VALIDATION_FAILED', 'validation code'));
      failures.push(...expectEqual(
        validation.body.errors?.[0]?.field,
        'status',
        'validation field'
      ));

      const conflict = await request(
        `${ baseUrl }/api/v1/tickets/t_1?actor=admin&channel=web`,
        {
          method: 'PATCH',
          json: { status: 'resolved', version: 1 }
        }
      );
      failures.push(...expectStatus(conflict.status, 409, 'version conflict'));
      failures.push(...expectEqual(conflict.body.code, 'VERSION_CONFLICT', 'conflict code'));
      failures.push(...expectEqual(conflict.body.currentVersion, 2, 'currentVersion'));

      const forbidden = await request(
        `${ baseUrl }/api/v1/tickets/t_1?actor=member`,
        { method: 'PATCH', json: { status: 'resolved' } }
      );
      failures.push(...expectStatus(forbidden.status, 403, 'forbidden member'));
      failures.push(...expectEqual(forbidden.body.code, 'INSUFFICIENT_ROLE', 'forbidden code'));

      const missing = await request(
        `${ baseUrl }/api/v1/tickets/t_missing?actor=admin&channel=web`,
        { method: 'PATCH', json: { status: 'resolved' } }
      );
      failures.push(...expectStatus(missing.status, 404, 'ticket not found'));
      failures.push(...expectEqual(missing.body.code, 'TICKET_NOT_FOUND', 'not-found code'));

      const gone = await request(
        `${ baseUrl }/api/v1/tickets/t_archived?actor=admin&channel=web`,
        { method: 'PATCH', json: { status: 'resolved' } }
      );
      failures.push(...expectStatus(gone.status, 410, 'ticket gone'));
      failures.push(...expectEqual(gone.body.code, 'TICKET_GONE', 'gone code'));

      const rateStarted = Date.now();
      const rateLimited = await request(
        `${ baseUrl }/api/v1/tickets/t_1?actor=admin&channel=web&burst=true`,
        {
          method: 'PATCH',
          json: { status: 'resolved', resolution: 'fixed' }
        }
      );
      failures.push(...expectMinDelay(Date.now() - rateStarted, 80, '429 delay'));
      failures.push(...expectStatus(rateLimited.status, 429, 'rate limited'));
      failures.push(...expectHeader(rateLimited.headers, 'retry-after', '3', 'Retry-After'));
      failures.push(...expectEqual(rateLimited.body.code, 'RATE_LIMITED', 'rate code'));

      // Partial match (missing query.channel) → nameResponse unauthorized
      const unauthorized = await request(
        `${ baseUrl }/api/v1/tickets/t_1?actor=admin`,
        { method: 'PATCH', json: { status: 'resolved', resolution: 'fixed' } }
      );
      failures.push(...expectStatus(unauthorized.status, 401, 'unauthorized fallback'));
      failures.push(...expectHeader(
        unauthorized.headers,
        'x-match',
        'unauthorized',
        'unauthorized match header'
      ));
      failures.push(...expectEqual(unauthorized.body.code, 'UNAUTHORIZED', 'unauthorized code'));

      const createdHigh = await request(
        `${ baseUrl }/api/v1/tickets?source=web`,
        {
          method: 'POST',
          json: { title: 'Outage', priority: 'high', labels: ['prod', 'p0'] }
        }
      );
      failures.push(...expectStatus(createdHigh.status, 201, 'create high'));
      failures.push(...expectHeader(
        createdHigh.headers,
        'x-match',
        'created-priority-high',
        'create high match'
      ));
      failures.push(...expectEqual(createdHigh.body.id, 't_new_high', 'create high id'));

      const createdLow = await request(
        `${ baseUrl }/api/v1/tickets?source=web`,
        { method: 'POST', json: { title: 'Typo', priority: 'low' } }
      );
      failures.push(...expectStatus(createdLow.status, 201, 'create low'));
      failures.push(...expectEqual(createdLow.body.id, 't_new_low', 'create low id'));

      const duplicate = await request(
        `${ baseUrl }/api/v1/tickets?source=web`,
        { method: 'POST', json: { title: 'Outage', priority: 'medium' } }
      );
      failures.push(...expectStatus(duplicate.status, 409, 'duplicate title'));
      failures.push(...expectEqual(duplicate.body.code, 'DUPLICATE_TITLE', 'duplicate code'));

      const invalidCreate = await request(
        `${ baseUrl }/api/v1/tickets?source=web`,
        { method: 'POST', json: { title: '', priority: 'low' } }
      );
      failures.push(...expectStatus(invalidCreate.status, 422, 'create validation'));
      failures.push(...expectEqual(
        invalidCreate.body.errors?.[0]?.field,
        'title',
        'create validation field'
      ));

      const badRequest = await request(`${ baseUrl }/api/v1/tickets`, {
        method: 'POST',
        json: { title: 'Nope' }
      });
      failures.push(...expectStatus(badRequest.status, 400, 'create bad-request fallback'));
      failures.push(...expectEqual(badRequest.body.code, 'BAD_REQUEST', 'bad-request code'));

      return failures;
    }
  })
};
