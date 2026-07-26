'use strict';

const path = require('path');
const os = require('os');
const fs = require('fs');
const { runUnitUseCase, PROJECT_ROOT } = require('../../lib/execute-mock-file');

module.exports = {
  name: 'unit/store-response-clone',
  description: 'Store list/get responses are cloned and do not mutate in-memory items',
  run: () => runUnitUseCase({
    name: 'unit/store-response-clone',
    description: 'Store list/get responses are cloned and do not mutate in-memory items',
    expectedOutcome: 'success',
    async assert() {
      const failures = [];
      const { StoreRegistry } = require(
        path.join(PROJECT_ROOT, 'dist/src/scripts/store.script.js')
      );

      const mocksDir = fs.mkdtempSync(path.join(os.tmpdir(), 'http-mock-json-store-clone-'));

      try {
        const registry = new StoreRegistry(
          [{
            id: 'notes',
            keyFields: ['id'],
            seed: [{ id: 1, title: 'Original', meta: { nested: true } }],
            uniqueFields: []
          }],
          { mocksDir }
        );

        const listed = registry.execute('notes', 'list', { params: {}, body: {} });
        if (!listed.ok) {
          failures.push('Expected list ok');
          return failures;
        }

        listed.body[0].title = 'Mutated list';
        listed.body[0].meta.nested = false;

        const got = registry.execute('notes', 'get', { params: { id: '1' }, body: {} });
        if (!got.ok) {
          failures.push('Expected get ok after list mutation');
          return failures;
        }

        if (got.body.title !== 'Original') {
          failures.push(`Expected store title untouched, got ${ JSON.stringify(got.body.title) }`);
        }
        if (got.body.meta?.nested !== true) {
          failures.push(`Expected nested meta untouched, got ${ JSON.stringify(got.body.meta) }`);
        }

        got.body.title = 'Mutated get';
        const listedAgain = registry.execute('notes', 'list', { params: {}, body: {} });
        if (!listedAgain.ok || listedAgain.body[0]?.title !== 'Original') {
          failures.push('Expected list still Original after get mutation');
        }
      } finally {
        fs.rmSync(mocksDir, { recursive: true, force: true });
      }

      return failures;
    }
  })
};
