'use strict';

const { runUseCase } = require('../../lib/execute-mock-file');

module.exports = {
  name: 'error/store-relations-errors',
  description: 'All store.relations validation / integrity / conflict wiring errors',
  run: () => runUseCase({
    name: 'error/store-relations-errors',
    description: 'All store.relations validation / integrity / conflict wiring errors',
    mockRelativePath: 'mocks/invalid/store-relations-errors.json',
    expected: {
      outcome: 'error',
      stdoutIncludes: [
        '✖ Error:',
        'File: store-relations-errors.json',
        'The "store.relations" property contains an empty field name',
        'The "store.relations.userId" must be a non-empty string or an object',
        'The "store.relations.userId.type" must be one of: one, many',
        'The "store.relations.posts" with type "many" cannot include required, onDelete, or conflict',
        'The "store.relations.posts" with type "many" must include "join" with "from"',
        'The "store.relations.posts.join" with type "many" cannot include "to"',
        'The "store.relations.posts.join.from" must be a non-empty string or string array',
        'The "store.relations.userId.join" must be an object',
        'The "store.relations.userId.join" property contains unknown key "via"',
        'The "store.relations.userId.join.from" must be a non-empty string or string array',
        'The "store.relations.userId.join.to" must be a non-empty string or string array',
        'The "store.relations.userId.required" must be a boolean',
        'The "store.relations.deletedAt" local field cannot overlap store.softDelete.field',
        'The "store.relations.userId" local field "deletedAt" cannot overlap store.softDelete.field',
        'The "store.relations.userId.embed" must be a non-empty string or { "as": "..." }',
        'The "store.relations.userId.embed" property contains unknown key "foo"',
        'The "store.relations.userId.embed.as" must be a non-empty string',
        'The "store.relations.userId.onDelete" must be one of: restrict, cascade, setNull, or an object with "action"',
        'The "store.relations.userId.onDelete" property contains unknown key "foo"',
        'The "store.relations.userId.onDelete.action" must be one of: restrict, cascade, setNull',
        'The "store.relations.userId.conflict" property must be an object',
        'The "store.relations.userId.conflict" property contains unknown key "foo"',
        'The "store.relations.userId.conflict.response" must be a non-empty string',
        'The "store.relations.userId.onDelete.conflict.response" must be a non-empty string',
        'The store relation "rel-embed-conflict-key.userId.embed" "id" conflicts with an existing field',
        'The store relation "rel-embed-conflict-softdelete.userId.embed" "deletedAt" conflicts with an existing field',
        'The store relation "rel-many-len-parent.children.join.from" length must match this store key (tenantId, id)',
        'The store relation "rel-join-to-mismatch.userId.join.to" must match target key [id]',
        'The store relation "rel-join-len-vs-target.refs" join.from/join.to length mismatch',
        'The store "rel-seed-missing-required" seed[0] is missing required relation "userId"',
        'The store "rel-seed-incomplete-fk" seed[0] relation "orderRef" has incomplete foreign key values',
        'The store "rel-seed-soft-deleted-fk" seed[0] relation "userId" references missing or soft-deleted "rel-target-soft" record',
        'The store conflict response "missing-rel-fk" does not exist in responses',
        'The store conflict response "missing-restrict-conflict" does not exist in responses'
      ],
      stdoutExcludes: ['Mock server is running']
    }
  })
};
