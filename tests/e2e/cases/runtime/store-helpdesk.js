'use strict';

const { runHttpUseCase } = require('../../lib/execute-mock-file');
const { request, expectStatus, expectEqual, expectHeader } = require('../../lib/http-assert');

module.exports = {
  name: 'runtime/store-helpdesk',
  description: 'HTTP: helpdesk combines tenant store, page list, cursor feed, match, request',
  run: () => runHttpUseCase({
    name: 'runtime/store-helpdesk',
    description: 'HTTP: helpdesk combines tenant store, page list, cursor feed, match, request',
    mockRelativePath: 'mocks/33-store-helpdesk.json',
    timeoutMs: 30000,
    async assert({ baseUrl }) {
      const failures = [];
      const acmeTickets = `${ baseUrl }/api/tenants/acme/tickets`;
      const acmeActivity = `${ baseUrl }/api/tenants/acme/activity`;

      const forbidden = await request(`${ baseUrl }/api/tenants/blocked/tickets`);
      failures.push(...expectStatus(forbidden.status, 403, 'blocked tenant'));
      failures.push(...expectEqual(forbidden.body.code, 'TENANT_FORBIDDEN', 'forbidden code'));

      const unauthorized = await request(`${ acmeTickets }?auth=missing`);
      failures.push(...expectStatus(unauthorized.status, 401, 'auth missing match'));
      failures.push(...expectHeader(unauthorized.headers, 'www-authenticate', 'Bearer', 'www-auth'));

      const inbox = await request(acmeTickets);
      failures.push(...expectStatus(inbox.status, 200, 'acme inbox'));
      failures.push(...expectHeader(inbox.headers, 'x-total-count', '4', 'acme total'));
      failures.push(...expectEqual(inbox.body.total, 4, 'acme ticket total'));
      failures.push(...expectEqual(inbox.body.tickets.length, 2, 'default page size'));
      failures.push(...expectEqual(inbox.body.hasNext, true, 'inbox hasNext'));

      const openHigh = await request(`${ acmeTickets }?status=open&priority=high&pageSize=10`);
      failures.push(...expectStatus(openHigh.status, 200, 'filter open high'));
      failures.push(...expectEqual(openHigh.body.total, 2, 'open high total'));
      failures.push(...expectEqual(
        openHigh.body.tickets.map(item => item.id).sort((a, b) => a - b),
        [1, 3],
        'open high ids'
      ));

      const search = await request(`${ acmeTickets }?q=login&pageSize=10`);
      failures.push(...expectStatus(search.status, 200, 'search login'));
      failures.push(...expectEqual(search.body.total, 1, 'search total'));
      failures.push(...expectEqual(search.body.tickets[0]?.subject, 'Cannot login', 'search subject'));

      const ranged = await request(
        `${ acmeTickets }?since=1700000002&until=1700000004&excludeStatus=closed&pageSize=10`
      );
      failures.push(...expectStatus(ranged.status, 200, 'createdAt range + ne'));
      failures.push(...expectEqual(
        ranged.body.tickets.map(item => item.id).sort((a, b) => a - b),
        [2, 3],
        'ranged open/pending ids'
      ));

      const channel = await request(
        `${ acmeTickets }?channel=email&priorities=high,low&pageSize=10`
      );
      failures.push(...expectStatus(channel.status, 200, 'nested channel + in priority'));
      failures.push(...expectEqual(
        channel.body.tickets.map(item => item.id).sort((a, b) => a - b),
        [1, 4],
        'email high/low ids'
      ));

      const sla = await request(`${ acmeTickets }?maxSla=5&pageSize=10`);
      failures.push(...expectStatus(sla.status, 200, 'sla lt'));
      failures.push(...expectEqual(
        sla.body.tickets.map(item => item.id).sort((a, b) => a - b),
        [1, 3],
        'fast sla ids'
      ));

      const orInbox = await request(
        `${ acmeTickets }?anyAssignee=carol@acme.com&anyPriority=high&pageSize=10`
      );
      failures.push(...expectStatus(orInbox.status, 200, 'or assignee/priority'));
      failures.push(...expectEqual(
        orInbox.body.tickets.map(item => item.id).sort((a, b) => a - b),
        [1, 3, 4],
        'or ticket ids'
      ));

      const globex = await request(`${ baseUrl }/api/tenants/globex/tickets?pageSize=10`);
      failures.push(...expectStatus(globex.status, 200, 'globex inbox'));
      failures.push(...expectEqual(globex.body.total, 2, 'globex total'));

      const invalidTicket = await request(acmeTickets, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: 'Hi',
          priority: 'high',
          assignee: 'not-an-email'
        })
      });
      failures.push(...expectStatus(invalidTicket.status, 422, 'ticket validation'));

      const created = await request(acmeTickets, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: 'Billing dispute',
          priority: 'medium',
          assignee: 'finance@acme.com',
          createdAt: 1700000999
        })
      });
      failures.push(...expectStatus(created.status, 201, 'create ticket'));
      failures.push(...expectEqual(created.body.tenantId, 'acme', 'created tenant'));
      failures.push(...expectEqual(created.body.subject, 'Billing dispute', 'created subject'));

      const duplicateSubject = await request(acmeTickets, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: 'Cannot login',
          priority: 'low',
          assignee: 'other@acme.com'
        })
      });
      failures.push(...expectStatus(duplicateSubject.status, 409, 'subject conflict'));
      failures.push(...expectEqual(duplicateSubject.body.code, 'SUBJECT_TAKEN', 'subject taken'));

      const patched = await request(`${ acmeTickets }/${ created.body.id }`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'pending' })
      });
      failures.push(...expectStatus(patched.status, 200, 'patch ticket'));
      failures.push(...expectEqual(patched.body.status, 'pending', 'patched status'));

      const feed1 = await request(acmeActivity);
      failures.push(...expectStatus(feed1.status, 200, 'activity page1'));
      failures.push(...expectHeader(feed1.headers, 'x-feed', 'activity', 'feed header'));
      failures.push(...expectEqual(feed1.body.data.length, 2, 'cursor page size'));
      failures.push(...expectEqual(feed1.body.has_more, true, 'feed has_more'));
      if (typeof feed1.body.next_cursor !== 'string' || feed1.body.next_cursor.length < 4) {
        failures.push(`expected next_cursor string, got ${ JSON.stringify(feed1.body.next_cursor) }`);
      }

      const feed2 = await request(
        `${ acmeActivity }?starting_after=${ encodeURIComponent(feed1.body.next_cursor) }`
      );
      failures.push(...expectStatus(feed2.status, 200, 'activity page2'));
      failures.push(...expectEqual(feed2.body.data.length, 2, 'cursor page2 size'));
      failures.push(...expectEqual(feed2.body.has_more, false, 'feed page2 done'));

      const comments = await request(`${ acmeActivity }?type=comment&limit=10`);
      failures.push(...expectStatus(comments.status, 200, 'filter comment'));
      failures.push(...expectEqual(
        comments.body.data.every(item => item.type === 'comment'),
        true,
        'all comments'
      ));

      return failures;
    }
  })
};
