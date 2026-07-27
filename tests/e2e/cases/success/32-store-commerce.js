'use strict';

const { runUseCase } = require('../../lib/execute-mock-file');

module.exports = {
  name: 'success/32-store-commerce',
  description: 'Commerce catalog mocks start cleanly',
  run: () => runUseCase({
    name: 'success/32-store-commerce',
    description: 'Commerce catalog mocks start cleanly',
    mockRelativePath: 'mocks/32-store-commerce.json',
    expected: {
      outcome: 'success',
      stdoutIncludes: [
        '[GET] /api/catalog/products',
        '[POST] /api/catalog/products',
        '[GET] /api/catalog/products/:id',
        '[POST] /api/catalog/checkout'
      ],
      stdoutExcludes: [
        '✖ Error:',
        'The "body" property is ignored when "action" is set'
      ]
    }
  })
};
