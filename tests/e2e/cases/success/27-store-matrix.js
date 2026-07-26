'use strict';

const { runUseCase } = require('../../lib/execute-mock-file');

module.exports = {
  name: 'success/27-store-matrix',
  description: 'Store matrix mocks start with action/body and delete statusCode warnings',
  run: () => runUseCase({
    name: 'success/27-store-matrix',
    description: 'Store matrix mocks start with action/body and delete statusCode warnings',
    mockRelativePath: 'mocks/27-store-matrix.json',
    expected: {
      outcome: 'success',
      stdoutIncludes: [
        '[GET] /api/:tenantId/items',
        '[POST] /api/:tenantId/items',
        '[PUT] /api/:tenantId/items/:id',
        '[PATCH] /api/:tenantId/items/:id',
        '[DELETE] /api/:tenantId/items/:id',
        '[GET] /api/tags',
        'The "body" property is ignored when "action" is set',
        'The "statusCode" is ignored for action "delete" (always responds with 204)'
      ],
      stdoutExcludes: ['✖ Error:']
    }
  })
};
