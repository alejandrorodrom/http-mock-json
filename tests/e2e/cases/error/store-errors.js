'use strict';

const { runUseCase } = require('../../lib/execute-mock-file');

module.exports = {
  name: 'error/store-errors',
  description: 'All store config validation errors at startup',
  run: () => runUseCase({
    name: 'error/store-errors',
    description: 'All store config validation errors at startup',
    mockRelativePath: 'mocks/invalid/store-errors.json',
    expected: {
      outcome: 'error',
      stdoutIncludes: [
        '✖ Error:',
        'File: store-errors.json',
        'The "store" property must be an object',
        'The "store.id" must be a non-empty string',
        'The "store" property contains unknown key "foo"',
        'The "store.seed" property must be an array',
        'The "store.seed[0]" item must be an object',
        'The "store.template" property must be an object',
        'The "store.unique" property must be an array or an object',
        'The "store.unique" array must not be empty',
        'The "store.unique" object must include "fields"',
        'The "store.key" must be a string, an array of strings, or an object',
        'The "store.seed" contains duplicate key (id)',
        'The "store.seed" contains duplicate unique field "email"',
        'The "action" property requires a "store" on the endpoint',
        'The "action" property cannot be used together with "proxy"',
        'The "action" must be one of: list, get, create, update, patch, delete',
        'The store conflict response "duplicate-email" does not exist in responses',
        'The store "does-not-exist" is referenced but not defined',
        'The "store.persist" property must be a boolean or an object',
        'The "store.persist.enabled" must be a boolean',
        'The "store.persist.file" must be a non-empty string',
        'The "store.persist.file" must be a relative path under the mocks directory',
        'The "store.seed[0]" item is missing key field "id"',
        'The store "shared-dup" is already defined',
        'The "store.list" property must be a boolean or an object',
        'The "store.list" property contains unknown key "foo"',
        'The "store.list.page.default" must be an integer >= 1',
        'The "store.list.sort.fields" must be a non-empty array of strings',
        'The "store.list.order.default" must be "asc" or "desc"',
        'The "store.list.filter" property must be an array or an object',
        'The "store.list.filter" array must be a non-empty array of strings',
        'The "store.list.filter.search.fields" must be a non-empty array of strings',
        'The "store.list.filter.fields[0].op" must be one of: eq, ne, gt, gte, lt, lte, in',
        'The "store.list.filter.or" must be a non-empty array of strings or field objects',
        'The "store.list.filter.or[0].field" must be a non-empty string',
        'The "store.list.cursor" property must be a boolean or an object'
      ],
      stdoutExcludes: ['Mock server is running']
    }
  })
};
