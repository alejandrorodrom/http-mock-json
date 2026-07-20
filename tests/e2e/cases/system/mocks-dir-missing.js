'use strict';

const { runCliUseCase } = require('../../lib/execute-mock-file');

module.exports = {
  name: 'system/mocks-dir-missing',
  description: 'CLI start without mocks/ directory → The directory named mocks does not exist',
  run: () => runCliUseCase({
    name: 'system/mocks-dir-missing',
    description: 'CLI start without mocks/ directory → The directory named mocks does not exist',
    args: ['start', '-p', '34101', '-f', ''],
    workspace: { skipMocksDir: true },
    expected: {
      outcome: 'error',
      stdoutIncludes: [
        'The directory named mocks does not exist'
      ],
      stdoutExcludes: ['Mock server is running']
    }
  })
};
