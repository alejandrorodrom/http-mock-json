'use strict';

const { runUseCase } = require('../../lib/execute-mock-file');

module.exports = {
  name: 'success/26-store-persist',
  description: 'Persisted store mocks start cleanly',
  run: () => runUseCase({
    name: 'success/26-store-persist',
    description: 'Persisted store mocks start cleanly',
    mockRelativePath: 'mocks/26-store-persist.json',
    expected: {
      outcome: 'success',
      stdoutIncludes: [
        '[GET] /api/notes',
        '[POST] /api/notes',
        '[GET] /api/notes/:id',
        '[DELETE] /api/notes/:id'
      ],
      stdoutExcludes: ['✖ Error:']
    }
  })
};
