'use strict';

const { runUseCase } = require('../../lib/execute-mock-file');

module.exports = {
  name: '22-request',
  description: 'Request validation mocks load: body/query/nested/formats/error shapes',
  run: () => runUseCase({
    name: '22-request',
    description: 'Request validation mocks load: body/query/nested/formats/error shapes',
    mockRelativePath: 'mocks/22-request.json',
    expected: {
      outcome: 'success',
      stdoutIncludes: [
        '[POST] /api/register',
        '[GET] /api/search',
        '[POST] /api/orders',
        '[POST] /api/profiles',
        '[POST] /api/filters'
      ],
      stdoutExcludes: ['✖ Error:']
    }
  })
};
