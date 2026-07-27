'use strict';

const { runUseCase } = require('../../lib/execute-mock-file');

module.exports = {
  name: 'success/35-store-unique-composite',
  description: 'Composite unique store mocks start cleanly',
  run: () => runUseCase({
    name: 'success/35-store-unique-composite',
    description: 'Composite unique store mocks start cleanly',
    mockRelativePath: 'mocks/35-store-unique-composite.json',
    expected: {
      outcome: 'success',
      stdoutIncludes: [
        '[GET] /api/:tenantId/members',
        '[POST] /api/:tenantId/members',
        '[PATCH] /api/:tenantId/members/:id',
        '[PUT] /api/:tenantId/members/:id',
        '[GET] /api/slots',
        '[POST] /api/slots',
        '[PUT] /api/slots/:id'
      ],
      stdoutExcludes: ['✖ Error:']
    }
  })
};
