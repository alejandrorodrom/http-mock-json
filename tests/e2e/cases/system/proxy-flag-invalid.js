'use strict';

const { runCliUseCase } = require('../../lib/execute-mock-file');

module.exports = {
  name: 'system/proxy-flag-invalid',
  description: 'CLI --proxy invalid URL → Proxy must be a valid http or https URL',
  run: () => runCliUseCase({
    name: 'system/proxy-flag-invalid',
    description: 'CLI --proxy invalid URL → Proxy must be a valid http or https URL',
    args: ['start', '-p', '34103', '-f', '', '--proxy', 'not-a-url'],
    workspace: { emptyMocksDir: true },
    expected: {
      outcome: 'error',
      stdoutIncludes: [
        'Proxy must be a valid http or https URL'
      ],
      stdoutExcludes: ['Mock server is running']
    }
  })
};
