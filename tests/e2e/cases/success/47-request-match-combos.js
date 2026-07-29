'use strict';

const { runUseCase } = require('../../lib/execute-mock-file');

module.exports = {
  name: '47-request-match-combos',
  description: 'Request+match combo mocks load: json/form/multipart/text/raw',
  run: () => runUseCase({
    name: '47-request-match-combos',
    description: 'Request+match combo mocks load: json/form/multipart/text/raw',
    mockRelativePath: 'mocks/47-request-match-combos.json',
    expected: {
      outcome: 'success',
      stdoutIncludes: [
        '[POST] /api/combo/json',
        '[POST] /api/combo/form',
        '[POST] /api/combo/multipart',
        '[POST] /api/combo/text',
        '[PUT] /api/combo/raw',
        '[POST] /api/combo/json-query'
      ],
      stdoutExcludes: ['✖ Error:']
    }
  })
};
