'use strict';

const { runUseCase } = require('../../lib/execute-mock-file');

module.exports = {
  name: 'success/30-store-rbac',
  description: 'Store + RBAC/resilience domain mocks start cleanly',
  run: () => runUseCase({
    name: 'success/30-store-rbac',
    description: 'Store + RBAC/resilience domain mocks start cleanly',
    mockRelativePath: 'mocks/30-store-rbac.json',
    expected: {
      outcome: 'success',
      stdoutIncludes: [
        '[GET] /api/v1/workspaces/:workspaceId/documents',
        '[POST] /api/v1/workspaces/:workspaceId/documents',
        '[DELETE] /api/v1/workspaces/:workspaceId/documents/:id',
        '[POST] /api/v1/workspaces/:workspaceId/invites',
        '[POST] /api/v1/workspaces/:workspaceId/credits'
      ],
      stdoutExcludes: ['✖ Error:']
    }
  })
};
