'use strict';

const { runUseCase } = require('../../lib/execute-mock-file');

module.exports = {
  name: 'success/31-store-list',
  description: 'Store list sort/pagination mocks start cleanly',
  run: () => runUseCase({
    name: 'success/31-store-list',
    description: 'Store list sort/pagination mocks start cleanly',
    mockRelativePath: 'mocks/31-store-list.json',
    expected: {
      outcome: 'success',
      stdoutIncludes: [
        '[GET] /api/products',
        '[GET] /api/events',
        '[GET] /api/tags',
        '[GET] /api/plain',
        '[GET] /api/feed',
        '[GET] /api/mixed'
      ],
      stdoutExcludes: [
        '✖ Error:',
        'The "body" property is ignored when "action" is set'
      ]
    }
  })
};
