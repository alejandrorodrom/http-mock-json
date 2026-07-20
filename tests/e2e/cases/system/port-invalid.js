'use strict';

const { runCliUseCase } = require('../../lib/execute-mock-file');

module.exports = {
  name: 'system/port-invalid',
  description: 'CLI --port NaN → Port must be a valid number',
  run: () => runCliUseCase({
    name: 'system/port-invalid',
    description: 'CLI --port NaN → Port must be a valid number',
    args: ['start', '-p', 'abc', '-f', ''],
    workspace: { emptyMocksDir: true },
    expected: {
      outcome: 'error',
      stdoutIncludes: [
        'Port must be a valid number'
      ],
      stdoutExcludes: ['Mock server is running']
    }
  })
};
