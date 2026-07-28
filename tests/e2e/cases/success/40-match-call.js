'use strict';

const { runUseCase } = require('../../lib/execute-mock-file');

module.exports = {
  name: '40-match-call',
  description: 'Match by call count (index/by/loop/reset + query/params/nested/request)',
  run: () => runUseCase({
    name: '40-match-call',
    description: 'Match by call count (index/by/loop/reset + query/params/nested/request)',
    mockRelativePath: 'mocks/40-match-call.json',
    expected: {
      outcome: 'success',
      stdoutIncludes: [
        '⚠ Warnings:',
        'When "match.call.loop" is true, "index" values should be contiguous from 1 to max',
        '[POST] /api/auth/login',
        '[POST] /api/auth/login-by',
        '[POST] /api/auth/login-nested',
        '[POST] /api/auth/login-missing-by',
        '[POST] /api/auth/login-validated',
        '[GET] /api/otp',
        '[GET] /api/tenants/:tenantId/ping',
        '[POST] /api/orgs/:orgId/actions',
        '[GET] /api/flaky',
        '[GET] /api/flaky-loop',
        '[GET] /api/flaky-loop-sparse'
      ],
      stdoutExcludes: ['✖ Error:']
    }
  })
};
