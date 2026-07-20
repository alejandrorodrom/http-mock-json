'use strict';

const { runUseCase } = require('../../lib/execute-mock-file');

module.exports = {
  name: '14-http-methods-case',
  description: 'Lowercase / mixed-case method keys are normalized and registered',
  run: () => runUseCase({
    name: '14-http-methods-case',
    description: 'Lowercase / mixed-case method keys are normalized and registered',
    mockRelativePath: 'mocks/14-http-methods-case.json',
    expected: {
      outcome: 'success',
      stdoutIncludes: [
        '[GET] /api/case/lowercase',
        '[POST] /api/case/lowercase',
        '[PUT] /api/case/lowercase',
        '[PATCH] /api/case/lowercase',
        '[DELETE] /api/case/lowercase',
        '[GET] /api/case/mixed',
        '[POST] /api/case/mixed'
      ],
      stdoutExcludes: ['✖ Error:']
    }
  })
};
