'use strict';

const fs = require('fs');
const path = require('path');
const {
  createWorkspace,
  startMockServer
} = require('../../lib/server-harness');
const {
  request,
  expectStatus,
  expectEqual,
  expectHeader,
  expectMinDelay
} = require('../../lib/http-assert');

module.exports = {
  name: 'runtime/store-rbac',
  description: 'HTTP: store + RBAC 401/403/410 + rate-limit/maintenance + credits + persist',
  async run() {
    const startedAt = Date.now();
    const failures = [];
    const { workspaceDir, cleanup } = createWorkspace('mocks/30-store-rbac.json');
    const documentsFile = path.join(workspaceDir, 'mocks', '.store', 'documents.json');
    const creditsFile = path.join(workspaceDir, 'mocks', '.store', 'credits.json');
    const invitesFile = path.join(workspaceDir, 'mocks', '.store', 'invites.json');

    let first;
    let second;

    try {
      first = await startMockServer({
        workspaceDir,
        cleanup,
        cleanupOnStop: false,
        timeoutMs: 30000
      });

      const unauth = await request(`${ first.baseUrl }/api/v1/workspaces/ws_acme/documents`);
      failures.push(...expectStatus(unauth.status, 401, 'documents unauthorized'));
      failures.push(...expectHeader(
        unauth.headers,
        'www-authenticate',
        'Bearer',
        'WWW-Authenticate'
      ));
      failures.push(...expectEqual(unauth.body.code, 'UNAUTHORIZED', 'unauth code'));

      const blocked = await request(
        `${ first.baseUrl }/api/v1/workspaces/ws_blocked/documents?role=admin`
      );
      failures.push(...expectStatus(blocked.status, 403, 'blocked workspace'));
      failures.push(...expectEqual(blocked.body.code, 'WORKSPACE_FORBIDDEN', 'blocked code'));

      const maintenance = await request(
        `${ first.baseUrl }/api/v1/workspaces/ws_acme/documents?role=admin&scenario=maintenance`
      );
      failures.push(...expectStatus(maintenance.status, 503, 'list maintenance'));
      failures.push(...expectEqual(maintenance.body.code, 'MAINTENANCE', 'maintenance code'));

      const adminList = await request(
        `${ first.baseUrl }/api/v1/workspaces/ws_acme/documents?role=admin`
      );
      failures.push(...expectStatus(adminList.status, 200, 'admin list'));
      failures.push(...expectEqual(adminList.body.length, 2, 'seed docs'));
      failures.push(...expectHeader(adminList.headers, 'x-role', 'admin', 'admin role header'));

      const memberHidden = await request(
        `${ first.baseUrl }/api/v1/workspaces/ws_acme/documents/2?role=member`
      );
      failures.push(...expectStatus(memberHidden.status, 404, 'member hides private draft'));
      failures.push(...expectEqual(memberHidden.body.code, 'NOT_FOUND', 'hidden code'));

      const adminDraft = await request(
        `${ first.baseUrl }/api/v1/workspaces/ws_acme/documents/2?role=admin`
      );
      failures.push(...expectStatus(adminDraft.status, 200, 'admin sees draft'));
      failures.push(...expectEqual(adminDraft.body.slug, 'roadmap', 'draft slug'));

      const gone = await request(
        `${ first.baseUrl }/api/v1/workspaces/ws_acme/documents/410?role=admin`
      );
      failures.push(...expectStatus(gone.status, 410, 'soft-delete gone'));
      failures.push(...expectEqual(gone.body.code, 'DOCUMENT_GONE', 'gone code'));

      const rateStarted = Date.now();
      const rateLimited = await request(
        `${ first.baseUrl }/api/v1/workspaces/ws_acme/documents?role=admin&scenario=rate_limit`,
        {
          method: 'POST',
          json: { title: 'Rate Limit', slug: 'rate-limit' }
        }
      );
      failures.push(...expectStatus(rateLimited.status, 429, 'create rate limited'));
      failures.push(...expectMinDelay(Date.now() - rateStarted, 80, 'rate limit delay'));
      failures.push(...expectHeader(rateLimited.headers, 'retry-after', '2', 'Retry-After'));

      const viewerCreate = await request(
        `${ first.baseUrl }/api/v1/workspaces/ws_acme/documents?role=viewer`,
        {
          method: 'POST',
          json: { title: 'Viewer Doc', slug: 'viewer-doc' }
        }
      );
      failures.push(...expectStatus(viewerCreate.status, 403, 'viewer cannot create'));
      failures.push(...expectEqual(
        viewerCreate.body.code,
        'INSUFFICIENT_ROLE',
        'viewer role code'
      ));

      const invalidCreate = await request(
        `${ first.baseUrl }/api/v1/workspaces/ws_acme/documents?role=admin`,
        {
          method: 'POST',
          json: { title: 'Ab', slug: 'BAD' }
        }
      );
      failures.push(...expectStatus(invalidCreate.status, 422, 'create validation'));

      const created = await request(
        `${ first.baseUrl }/api/v1/workspaces/ws_acme/documents?role=member`,
        {
          method: 'POST',
          json: {
            title: 'Launch Plan',
            slug: 'launch-plan',
            visibility: 'internal'
          }
        }
      );
      failures.push(...expectStatus(created.status, 201, 'member create'));
      failures.push(...expectEqual(created.body.slug, 'launch-plan', 'created slug'));
      failures.push(...expectEqual(created.body.workspaceId, 'ws_acme', 'workspace param'));
      failures.push(...expectHeader(created.headers, 'x-role', 'member', 'member create header'));

      const slugTaken = await request(
        `${ first.baseUrl }/api/v1/workspaces/ws_acme/documents?role=admin`,
        {
          method: 'POST',
          json: { title: 'Launch Plan 2', slug: 'launch-plan' }
        }
      );
      failures.push(...expectStatus(slugTaken.status, 409, 'slug taken'));
      failures.push(...expectEqual(slugTaken.body.code, 'SLUG_TAKEN', 'slug code'));

      const patched = await request(
        `${ first.baseUrl }/api/v1/workspaces/ws_acme/documents/${ created.body.id }?role=admin`,
        {
          method: 'PATCH',
          json: { status: 'published' }
        }
      );
      failures.push(...expectStatus(patched.status, 200, 'admin patch'));
      failures.push(...expectEqual(patched.body.status, 'published', 'published status'));

      const memberDelete = await request(
        `${ first.baseUrl }/api/v1/workspaces/ws_acme/documents/${ created.body.id }?role=member`,
        { method: 'DELETE' }
      );
      failures.push(...expectStatus(memberDelete.status, 403, 'member delete forbidden'));

      const adminDelete = await request(
        `${ first.baseUrl }/api/v1/workspaces/ws_acme/documents/1?role=admin`,
        { method: 'DELETE' }
      );
      failures.push(...expectStatus(adminDelete.status, 204, 'admin delete handbook'));

      const memberInvite = await request(
        `${ first.baseUrl }/api/v1/workspaces/ws_acme/invites?role=member`,
        {
          method: 'POST',
          json: { email: 'new@acme.com', role: 'viewer' }
        }
      );
      failures.push(...expectStatus(memberInvite.status, 403, 'member invite forbidden'));

      const ownerTransfer = await request(
        `${ first.baseUrl }/api/v1/workspaces/ws_acme/invites?role=admin`,
        {
          method: 'POST',
          json: { email: 'owner-transfer@acme.com', role: 'admin' }
        }
      );
      failures.push(...expectStatus(ownerTransfer.status, 403, 'owner transfer blocked'));
      failures.push(...expectEqual(
        ownerTransfer.body.code,
        'OWNER_TRANSFER_REQUIRED',
        'owner transfer code'
      ));

      const invite = await request(
        `${ first.baseUrl }/api/v1/workspaces/ws_acme/invites?role=admin`,
        {
          method: 'POST',
          json: { email: 'contractor@acme.com', role: 'viewer' }
        }
      );
      failures.push(...expectStatus(invite.status, 201, 'admin invite'));
      failures.push(...expectEqual(invite.body.email, 'contractor@acme.com', 'invite email'));
      failures.push(...expectEqual(invite.body.workspaceId, 'ws_acme', 'invite workspace'));

      const inviteDup = await request(
        `${ first.baseUrl }/api/v1/workspaces/ws_acme/invites?role=admin`,
        {
          method: 'POST',
          json: { email: 'contractor@acme.com', role: 'member' }
        }
      );
      failures.push(...expectStatus(inviteDup.status, 409, 'invite unique email'));
      failures.push(...expectEqual(
        inviteDup.body.message,
        'Duplicate value(s)',
        'invite default conflict'
      ));

      const cardDeclined = await request(
        `${ first.baseUrl }/api/v1/workspaces/ws_acme/credits?role=admin`,
        {
          method: 'POST',
          json: {
            sku: 'ai',
            quantity: 10,
            paymentMethod: 'card',
            cardNumber: '4000000000000002'
          }
        }
      );
      failures.push(...expectStatus(cardDeclined.status, 402, 'card declined'));
      failures.push(...expectEqual(cardDeclined.body.code, 'CARD_DECLINED', 'declined code'));

      const credit = await request(
        `${ first.baseUrl }/api/v1/workspaces/ws_acme/credits?role=admin`,
        {
          method: 'POST',
          json: { sku: 'storage', quantity: 100, paymentMethod: 'invoice' }
        }
      );
      failures.push(...expectStatus(credit.status, 201, 'buy storage credits'));
      failures.push(...expectEqual(credit.body.sku, 'storage', 'credit sku'));

      const seatsPatched = await request(
        `${ first.baseUrl }/api/v1/workspaces/ws_acme/credits/1?role=admin`,
        {
          method: 'PATCH',
          json: { quantity: 8 }
        }
      );
      failures.push(...expectStatus(seatsPatched.status, 200, 'patch seats'));
      failures.push(...expectEqual(seatsPatched.body.quantity, 8, 'seats quantity'));

      if (!fs.existsSync(documentsFile)) {
        failures.push(`Expected documents persist file ${ documentsFile }`);
      }
      if (!fs.existsSync(creditsFile)) {
        failures.push(`Expected credits persist file ${ creditsFile }`);
      }
      if (fs.existsSync(invitesFile)) {
        failures.push('Invites must not persist to disk');
      }

      await first.stop();

      second = await startMockServer({
        workspaceDir,
        cleanup,
        cleanupOnStop: false,
        timeoutMs: 30000
      });

      const docsAfter = await request(
        `${ second.baseUrl }/api/v1/workspaces/ws_acme/documents?role=admin`
      );
      failures.push(...expectStatus(docsAfter.status, 200, 'docs after restart'));
      const slugs = docsAfter.body.map((item) => item.slug).sort();
      failures.push(...expectEqual(
        slugs,
        ['launch-plan', 'roadmap'],
        'persisted docs (handbook deleted)'
      ));
      const launch = docsAfter.body.find((item) => item.slug === 'launch-plan');
      failures.push(...expectEqual(launch?.status, 'published', 'persisted published'));

      const creditsAfter = await request(
        `${ second.baseUrl }/api/v1/workspaces/ws_acme/credits?role=admin`
      );
      failures.push(...expectEqual(creditsAfter.body.length, 2, 'persisted credits size'));
      const seats = creditsAfter.body.find((item) => item.sku === 'seat');
      failures.push(...expectEqual(seats?.quantity, 8, 'persisted seat quantity'));

      const invitesAfter = await request(
        `${ second.baseUrl }/api/v1/workspaces/ws_acme/invites?role=admin`
      );
      failures.push(...expectEqual(invitesAfter.body, [], 'invites ephemeral after restart'));

      await second.stop();
    } catch (error) {
      failures.push(error instanceof Error ? error.message : String(error));
    } finally {
      if (second) {
        await second.stop().catch(() => undefined);
      } else if (first) {
        await first.stop().catch(() => undefined);
      }
      cleanup();
    }

    return {
      name: 'runtime/store-rbac',
      description: 'HTTP: store + RBAC 401/403/410 + rate-limit/maintenance + credits + persist',
      passed: failures.length === 0,
      failures,
      durationMs: Date.now() - startedAt,
      expectedOutcome: 'success'
    };
  }
};
