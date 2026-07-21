'use strict';

const { runUseCase } = require('../../lib/execute-mock-file');

module.exports = {
  name: '24-request-saas',
  description: 'Real SaaS app mocks with request validation load cleanly',
  run: () => runUseCase({
    name: '24-request-saas',
    description: 'Real SaaS app mocks with request validation load cleanly',
    mockRelativePath: 'mocks/24-request-saas.json',
    expected: {
      outcome: 'success',
      stdoutIncludes: [
        '[POST] /api/saas/signup',
        '[POST] /api/saas/orgs/:orgId/members',
        '[POST] /api/saas/webhooks',
        '[GET] /api/saas/reports'
      ],
      stdoutExcludes: ['✖ Error:']
    }
  })
};
