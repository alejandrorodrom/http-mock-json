'use strict';

const { runUseCase } = require('../../lib/execute-mock-file');

module.exports = {
  name: 'success/39-store-relations-matrix',
  description: 'Store relations matrix mocks start cleanly',
  run: () => runUseCase({
    name: 'success/39-store-relations-matrix',
    description: 'Store relations matrix mocks start cleanly',
    mockRelativePath: 'mocks/39-store-relations-matrix.json',
    expected: {
      outcome: 'success',
      stdoutIncludes: [
        '[GET] /api/nodes-a',
        '[GET] /api/articles-mx',
        '[POST] /api/articles-mx',
        '[GET] /api/:tenantId/matrix-orders',
        '[GET] /api/:tenantId/matrix-items',
        '[POST] /api/:tenantId/matrix-items'
      ],
      stdoutExcludes: ['✖ Error:']
    }
  })
};
