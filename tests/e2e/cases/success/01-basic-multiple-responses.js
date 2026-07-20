'use strict';

const { runUseCase } = require('../../lib/execute-mock-file');

module.exports = {
  name: '01-basic-multiple-responses',
  description: 'Multiple responses + nameResponse fallback (success and error payloads)',
  run: () => runUseCase({
    name: '01-basic-multiple-responses',
    description: 'Multiple responses + nameResponse fallback (success and error payloads)',
    mockRelativePath: 'mocks/01-basic-multiple-responses.json',
    expected: {
      outcome: 'success',
      stdoutIncludes: [
        '[GET] /data/animals',
        '[POST] /data/animals'
      ],
      stdoutExcludes: ['✖ Error:']
    }
  })
};
