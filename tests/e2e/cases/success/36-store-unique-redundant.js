'use strict';

const { runUseCase } = require('../../lib/execute-mock-file');

module.exports = {
  name: 'success/36-store-unique-redundant',
  description: 'Unique matching the store key emits redundant warnings',
  run: () => runUseCase({
    name: 'success/36-store-unique-redundant',
    description: 'Unique matching the store key emits redundant warnings',
    mockRelativePath: 'mocks/36-store-unique-redundant.json',
    expected: {
      outcome: 'success',
      stdoutIncludes: [
        '⚠ Warnings:',
        'File: 36-store-unique-redundant.json',
        'The "store.unique.fields[0]" matches the store key and is redundant',
        'The "store.unique.fields[0].field" matches the store key and is redundant',
        'The "store.unique.fields[0].fields" matches the store key and is redundant',
        '[GET] /api/items',
        '[GET] /api/items-field',
        '[GET] /api/pairs'
      ],
      stdoutExcludes: ['✖ Error:']
    }
  })
};
