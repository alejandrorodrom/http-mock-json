'use strict';

const { runUseCase } = require('../../lib/execute-mock-file');

module.exports = {
  name: '20-multi-tenant-rbac',
  description:
    'Multi-tenant RBAC + async jobs: 401 vs 403, soft-delete 410, params+query+body match',
  run: () => runUseCase({
    name: '20-multi-tenant-rbac',
    description:
      'Multi-tenant RBAC + async jobs: 401 vs 403, soft-delete 410, params+query+body match',
    mockRelativePath: 'mocks/20-multi-tenant-rbac.json',
    expected: {
      outcome: 'success',
      stdoutIncludes: [
        '[GET] /api/v1/orgs/:orgId/projects',
        '[POST] /api/v1/orgs/:orgId/projects',
        '[GET] /api/v1/orgs/:orgId/projects/:projectId',
        '[DELETE] /api/v1/orgs/:orgId/projects/:projectId',
        '[POST] /api/v1/jobs',
        '[GET] /api/v1/jobs/:id'
      ],
      stdoutExcludes: ['✖ Error:']
    }
  })
};
