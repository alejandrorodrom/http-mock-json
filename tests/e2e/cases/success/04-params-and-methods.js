'use strict';

const { runUseCase } = require('../../lib/execute-mock-file');

module.exports = {
  name: '04-params-and-methods',
  description: 'Route params + all HTTP methods + multiple nameResponse options',
  run: () => runUseCase({
    name: '04-params-and-methods',
    description: 'Route params + all HTTP methods + multiple nameResponse options',
    mockRelativePath: 'mocks/04-params-and-methods.json',
    expected: {
      outcome: 'success',
      stdoutIncludes: [
        '[GET] /data/animals/:id',
        '[POST] /data/animals/:id',
        '[PUT] /data/animals/:id',
        '[PATCH] /data/animals/:id',
        '[DELETE] /data/animals/:id',
        '[GET] /data/brands',
        '[GET] /api/products/:productId/reviews/:reviewId'
      ],
      stdoutExcludes: ['✖ Error:']
    }
  })
};
