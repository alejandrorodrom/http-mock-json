'use strict';

const { runUseCase } = require('../../lib/execute-mock-file');

module.exports = {
  name: 'success/33-store-helpdesk',
  description: 'Helpdesk multi-tenant mocks start cleanly',
  run: () => runUseCase({
    name: 'success/33-store-helpdesk',
    description: 'Helpdesk multi-tenant mocks start cleanly',
    mockRelativePath: 'mocks/33-store-helpdesk.json',
    expected: {
      outcome: 'success',
      stdoutIncludes: [
        '[GET] /api/tenants/:tenantId/tickets',
        '[POST] /api/tenants/:tenantId/tickets',
        '[GET] /api/tenants/:tenantId/activity',
        '[GET] /api/tenants/:tenantId/tickets/:id'
      ],
      stdoutExcludes: [
        '✖ Error:',
        'The "body" property is ignored when "action" is set'
      ]
    }
  })
};
