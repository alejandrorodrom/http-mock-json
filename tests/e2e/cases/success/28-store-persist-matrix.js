'use strict';

const { runUseCase } = require('../../lib/execute-mock-file');

module.exports = {
  name: 'success/28-store-persist-matrix',
  description: 'Persist matrix mocks start cleanly',
  run: () => runUseCase({
    name: 'success/28-store-persist-matrix',
    description: 'Persist matrix mocks start cleanly',
    mockRelativePath: 'mocks/28-store-persist-matrix.json',
    expected: {
      outcome: 'success',
      stdoutIncludes: [
        '[GET] /api/alpha',
        '[POST] /api/beta',
        '[GET] /api/gamma',
        '[POST] /api/delta'
      ],
      stdoutExcludes: ['✖ Error:']
    }
  })
};
