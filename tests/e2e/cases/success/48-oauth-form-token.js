'use strict';

const { runUseCase } = require('../../lib/execute-mock-file');

module.exports = {
  name: '48-oauth-form-token',
  description: 'OAuth2 form-urlencoded token/revoke mocks load',
  run: () => runUseCase({
    name: '48-oauth-form-token',
    description: 'OAuth2 form-urlencoded token/revoke mocks load',
    mockRelativePath: 'mocks/48-oauth-form-token.json',
    expected: {
      outcome: 'success',
      stdoutIncludes: [
        '[POST] /oauth/token',
        '[POST] /oauth/revoke'
      ],
      stdoutExcludes: ['✖ Error:']
    }
  })
};
