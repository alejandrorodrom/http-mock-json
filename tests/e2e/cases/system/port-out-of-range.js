'use strict';

const { runCliUseCase } = require('../../lib/execute-mock-file');

module.exports = {
  name: 'system/port-out-of-range',
  description: 'CLI --port outside 1..65535 → Port must be between 1 and 65535',
  run: () => runCliUseCase({
    name: 'system/port-out-of-range',
    description: 'CLI --port outside 1..65535 → Port must be between 1 and 65535',
    args: ['start', '-p', '70000', '-f', ''],
    workspace: { emptyMocksDir: true },
    expected: {
      outcome: 'error',
      stdoutIncludes: [
        'Port must be between 1 and 65535'
      ],
      stdoutExcludes: ['Mock server is running']
    }
  })
};
