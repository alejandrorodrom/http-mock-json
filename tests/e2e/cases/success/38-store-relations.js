'use strict';

const { runUseCase } = require('../../lib/execute-mock-file');

module.exports = {
  name: 'success/38-store-relations',
  description: 'Store relations mocks start cleanly',
  run: () => runUseCase({
    name: 'success/38-store-relations',
    description: 'Store relations mocks start cleanly',
    mockRelativePath: 'mocks/38-store-relations.json',
    expected: {
      outcome: 'success',
      stdoutIncludes: [
        '[GET] /api/users',
        '[POST] /api/users',
        '[GET] /api/users/:id',
        '[DELETE] /api/users/:id',
        '[POST] /api/users/:id',
        '[GET] /api/posts',
        '[POST] /api/posts',
        '[GET] /api/posts/:id',
        '[PUT] /api/posts/:id',
        '[PATCH] /api/posts/:id',
        '[DELETE] /api/posts/:id',
        '[POST] /api/posts/:id',
        '[GET] /api/comments',
        '[POST] /api/comments',
        '[GET] /api/comments/:id',
        '[DELETE] /api/comments/:id',
        '[GET] /api/tags',
        '[POST] /api/tags',
        '[GET] /api/tags/:id',
        '[DELETE] /api/tags/:id',
        '[GET] /api/shorthand',
        '[POST] /api/shorthand',
        '[GET] /api/:tenantId/orders',
        '[POST] /api/:tenantId/orders',
        '[GET] /api/:tenantId/orders/:id',
        '[DELETE] /api/:tenantId/orders/:id',
        '[GET] /api/:tenantId/order-items',
        '[POST] /api/:tenantId/order-items',
        '[GET] /api/:tenantId/order-items/:id',
        '[DELETE] /api/:tenantId/order-items/:id',
        '[GET] /api/likes',
        '[POST] /api/likes',
        '[GET] /api/likes/:id',
        '[DELETE] /api/likes/:id',
        '[GET] /api/categories',
        '[POST] /api/categories',
        '[GET] /api/categories/:id',
        '[DELETE] /api/categories/:id'
      ],
      stdoutExcludes: ['✖ Error:']
    }
  })
};
