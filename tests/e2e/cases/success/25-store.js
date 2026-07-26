'use strict';

const { runUseCase } = require('../../lib/execute-mock-file');

module.exports = {
  name: 'success/25-store',
  description: 'Store mutable mocks start cleanly',
  run: () => runUseCase({
    name: 'success/25-store',
    description: 'Store mutable mocks start cleanly',
    mockRelativePath: 'mocks/25-store.json',
    expected: {
      outcome: 'success',
      stdoutIncludes: [
        '[GET] /api/:tenantId/users',
        '[POST] /api/:tenantId/users',
        '[GET] /api/:tenantId/users/:id',
        '[PATCH] /api/:tenantId/users/:id',
        '[DELETE] /api/:tenantId/users/:id',
        '[GET] /api/notes',
        '[POST] /api/notes'
      ],
      stdoutExcludes: ['✖ Error:']
    }
  })
};
