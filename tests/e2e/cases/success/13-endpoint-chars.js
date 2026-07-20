'use strict';

const { runUseCase } = require('../../lib/execute-mock-file');

module.exports = {
  name: '13-endpoint-chars',
  description: 'Allowed endpoint characters: -, _, ., ~ and :param',
  run: () => runUseCase({
    name: '13-endpoint-chars',
    description: 'Allowed endpoint characters: -, _, ., ~ and :param',
    mockRelativePath: 'mocks/13-endpoint-chars.json',
    expected: {
      outcome: 'success',
      stdoutIncludes: [
        '[GET] /api/v1/users-list',
        '[GET] /api/v1/user_profile',
        '[GET] /api/v1/file.name',
        '[GET] /api/v1/cache~key',
        '[GET] /api/v1/items/:item_id'
      ],
      stdoutExcludes: ['✖ Error:']
    }
  })
};
