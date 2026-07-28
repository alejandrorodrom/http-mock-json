'use strict';

const { runUseCase } = require('../../lib/execute-mock-file');

module.exports = {
  name: 'success/37-store-soft-delete',
  description: 'Store soft delete mocks start cleanly',
  run: () => runUseCase({
    name: 'success/37-store-soft-delete',
    description: 'Store soft delete mocks start cleanly',
    mockRelativePath: 'mocks/37-store-soft-delete.json',
    expected: {
      outcome: 'success',
      stdoutIncludes: [
        '[GET] /api/notes',
        '[POST] /api/notes',
        '[GET] /api/notes/:id',
        '[PUT] /api/notes/:id',
        '[PATCH] /api/notes/:id',
        '[DELETE] /api/notes/:id',
        '[POST] /api/notes/:id',
        '[GET] /api/archived',
        '[DELETE] /api/archived/:id',
        '[GET] /api/tasks',
        '[DELETE] /api/tasks/:id',
        '[GET] /api/slots',
        '[POST] /api/slots',
        '[GET] /api/persisted-notes',
        '[DELETE] /api/persisted-notes/:id',
        '[GET] /api/hard',
        '[DELETE] /api/hard/:id',
        'The "body" property is ignored when "action" is set'
      ],
      stdoutExcludes: ['✖ Error:']
    }
  })
};
