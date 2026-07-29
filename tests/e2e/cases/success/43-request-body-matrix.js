'use strict';

const { runUseCase } = require('../../lib/execute-mock-file');

module.exports = {
  name: '43-request-body-matrix',
  description: 'Body matrix mocks load: json/form/multipart/raw/text + headers',
  run: () => runUseCase({
    name: '43-request-body-matrix',
    description: 'Body matrix mocks load: json/form/multipart/raw/text + headers',
    mockRelativePath: 'mocks/43-request-body-matrix.json',
    expected: {
      outcome: 'success',
      stdoutIncludes: [
        '[POST] /api/matrix/json',
        '[POST] /api/matrix/form',
        '[POST] /api/matrix/multipart',
        '[PUT] /api/matrix/raw',
        '[POST] /api/matrix/text'
      ],
      stdoutExcludes: ['✖ Error:']
    }
  })
};
