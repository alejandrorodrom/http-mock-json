'use strict';

const { runUseCase } = require('../../lib/execute-mock-file');

module.exports = {
  name: '09-proxy',
  description: 'Proxy shapes: true, URL string, {target}, {target,path}',
  run: () => runUseCase({
    name: '09-proxy',
    description: 'Proxy shapes: true, URL string, {target}, {target,path}',
    mockRelativePath: 'mocks/09-proxy.json',
    expected: {
      outcome: 'success',
      stdoutIncludes: [
        '[GET] /users',
        '[GET] /api/orders'
      ],
      stdoutExcludes: ['✖ Error:']
    }
  })
};
