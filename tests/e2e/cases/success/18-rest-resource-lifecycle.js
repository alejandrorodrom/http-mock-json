'use strict';

const { runUseCase } = require('../../lib/execute-mock-file');

module.exports = {
  name: '18-rest-resource-lifecycle',
  description:
    'REST resource lifecycle: pagination, CRUD, RFC 7807-style controlled errors (404/409/410/422)',
  run: () => runUseCase({
    name: '18-rest-resource-lifecycle',
    description:
      'REST resource lifecycle: pagination, CRUD, RFC 7807-style controlled errors (404/409/410/422)',
    mockRelativePath: 'mocks/18-rest-resource-lifecycle.json',
    expected: {
      outcome: 'success',
      stdoutIncludes: [
        '[GET] /api/v1/products',
        '[POST] /api/v1/products',
        '[GET] /api/v1/products/:id',
        '[PATCH] /api/v1/products/:id',
        '[DELETE] /api/v1/products/:id'
      ],
      stdoutExcludes: ['✖ Error:']
    }
  })
};
