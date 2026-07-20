'use strict';

const { runUseCase } = require('../../lib/execute-mock-file');

module.exports = {
  name: '15-auth-scenarios',
  description: 'Auth domain scenarios: login, register, logout, me, refresh',
  run: () => runUseCase({
    name: '15-auth-scenarios',
    description: 'Auth domain scenarios: login, register, logout, me, refresh',
    mockRelativePath: 'mocks/15-auth-scenarios.json',
    expected: {
      outcome: 'success',
      stdoutIncludes: [
        '[POST] /api/auth/login',
        '[POST] /api/auth/register',
        '[POST] /api/auth/logout',
        '[GET] /api/auth/me',
        '[POST] /api/auth/refresh'
      ],
      stdoutExcludes: ['✖ Error:']
    }
  })
};
