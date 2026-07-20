'use strict';

const { runUseCase } = require('../../lib/execute-mock-file');

module.exports = {
  name: '12-body-types',
  description: 'Body types: string, number, boolean, null, array, nested object',
  run: () => runUseCase({
    name: '12-body-types',
    description: 'Body types: string, number, boolean, null, array, nested object',
    mockRelativePath: 'mocks/12-body-types.json',
    expected: {
      outcome: 'success',
      stdoutIncludes: [
        '[GET] /api/types/string',
        '[GET] /api/types/number',
        '[GET] /api/types/boolean',
        '[GET] /api/types/null',
        '[GET] /api/types/array',
        '[GET] /api/types/nested',
        '[GET] /api/types/complex'
      ],
      stdoutExcludes: ['✖ Error:']
    }
  })
};
