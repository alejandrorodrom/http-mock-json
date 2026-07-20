'use strict';

const { runUseCase } = require('../../lib/execute-mock-file');

module.exports = {
  name: '03-null-body',
  description: 'body: null and 204 No Content responses',
  run: () => runUseCase({
    name: '03-null-body',
    description: 'body: null and 204 No Content responses',
    mockRelativePath: 'mocks/03-null-body.json',
    expected: {
      outcome: 'success',
      stdoutIncludes: [
        '[DELETE] /api/users/:id',
        '[POST] /api/no-content',
        '[PUT] /api/no-content',
        '[GET] /api/no-content'
      ],
      stdoutExcludes: ['✖ Error:']
    }
  })
};
