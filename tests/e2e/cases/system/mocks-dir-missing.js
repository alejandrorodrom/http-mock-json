'use strict';

const { runCliUseCase } = require('../../lib/execute-mock-file');

module.exports = {
  name: 'system/mocks-dir-missing',
  description: 'CLI start without mocks/ directory → The mocks directory does not exist',
  run: () => runCliUseCase({
    name: 'system/mocks-dir-missing',
    description: 'CLI start without mocks/ directory → The mocks directory does not exist',
    args: ['start', '-p', '34101', '-f', 'mocks'],
    workspace: { skipMocksDir: true },
    expected: {
      outcome: 'error',
      stdoutIncludes: [
        'The mocks directory does not exist'
      ],
      stdoutExcludes: ['Mock server is running']
    }
  })
};
