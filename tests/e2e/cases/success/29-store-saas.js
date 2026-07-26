'use strict';

const { runUseCase } = require('../../lib/execute-mock-file');

module.exports = {
  name: 'success/29-store-saas',
  description: 'SaaS store domain mocks start cleanly (projects/tasks + persist)',
  run: () => runUseCase({
    name: 'success/29-store-saas',
    description: 'SaaS store domain mocks start cleanly (projects/tasks + persist)',
    mockRelativePath: 'mocks/29-store-saas.json',
    expected: {
      outcome: 'success',
      stdoutIncludes: [
        '[GET] /api/orgs/:orgId/projects',
        '[POST] /api/orgs/:orgId/projects',
        '[PATCH] /api/orgs/:orgId/projects/:id',
        '[GET] /api/orgs/:orgId/projects/:projectId/tasks',
        '[POST] /api/orgs/:orgId/projects/:projectId/tasks'
      ],
      stdoutExcludes: ['✖ Error:']
    }
  })
};
