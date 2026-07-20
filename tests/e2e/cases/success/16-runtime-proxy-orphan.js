'use strict';

const { runUseCase } = require('../../lib/execute-mock-file');

module.exports = {
  name: '16-runtime-proxy-orphan',
  description: 'Valid mock with proxy:true orphan (starts; runtime 502 only when matched)',
  run: () => runUseCase({
    name: '16-runtime-proxy-orphan',
    description: 'Valid mock with proxy:true orphan (starts; runtime 502 only when matched)',
    mockRelativePath: 'mocks/16-runtime-proxy-orphan.json',
    expected: {
      outcome: 'success',
      stdoutIncludes: [
        '[GET] /api/proxy-orphan'
      ],
      stdoutExcludes: ['✖ Error:']
    }
  })
};
