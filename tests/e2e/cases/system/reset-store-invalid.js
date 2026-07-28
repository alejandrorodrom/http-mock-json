'use strict';

const { runCliUseCase } = require('../../lib/execute-mock-file');

module.exports = {
  name: 'system/reset-store-invalid',
  description: 'CLI --reset-store with empty ids → Reset store ids must be a non-empty comma-separated list',
  run: () => runCliUseCase({
    name: 'system/reset-store-invalid',
    description: 'CLI --reset-store with empty ids → Reset store ids must be a non-empty comma-separated list',
    args: ['start', '-p', '34104', '-f', 'mocks', '--reset-store', ',,,'],
    workspace: { emptyMocksDir: true },
    expected: {
      outcome: 'error',
      exitCode: 1,
      stdoutIncludes: [
        'Reset store ids must be a non-empty comma-separated list'
      ],
      stdoutExcludes: ['Mock server is running']
    }
  })
};
