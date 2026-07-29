'use strict';

const { runUseCase } = require('../../lib/execute-mock-file');

module.exports = {
  name: '44-profile-body-compat',
  description: 'Real-world profile onboarding: multipart + encoding file + raw + match',
  run: () => runUseCase({
    name: '44-profile-body-compat',
    description: 'Real-world profile onboarding: multipart + encoding file + raw + match',
    mockRelativePath: 'mocks/44-profile-body-compat.json',
    expected: {
      outcome: 'success',
      stdoutIncludes: [
        '[POST] /api/profiles',
        '[GET] /api/profiles/:id',
        '[GET] /api/profiles/:id/avatar',
        '[PUT] /api/profiles/:id/avatar'
      ],
      stdoutExcludes: ['✖ Error:']
    }
  })
};
