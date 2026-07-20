'use strict';

const { runCliUseCase } = require('../../lib/execute-mock-file');

module.exports = {
  name: 'system/no-files-found',
  description: 'CLI start with empty mocks/ folder → No files found',
  run: () => runCliUseCase({
    name: 'system/no-files-found',
    description: 'CLI start with empty mocks/ folder → No files found',
    args: ['start', '-p', '34102', '-f', ''],
    workspace: { emptyMocksDir: true },
    expected: {
      outcome: 'error',
      stdoutIncludes: [
        'No files found'
      ],
      stdoutExcludes: ['Mock server is running']
    }
  })
};
