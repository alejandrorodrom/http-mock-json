'use strict';

const path = require('path');

module.exports = {
  name: 'unit/record-path',
  description: 'Unit: normalizeRecordPath maps digits to :id and keeps vN',
  async run() {
    const startedAt = Date.now();
    const failures = [];

    try {
      const {
        normalizeRecordPath,
        stripPrefixFromPath,
        trimPathSlashes,
        canonicalQuery
      } = require(path.resolve(__dirname, '../../../../dist/src/scripts/record-path.script.js'));

      if (trimPathSlashes('/api/users/') !== 'api/users') {
        failures.push(`trimPathSlashes expected api/users, got ${ trimPathSlashes('/api/users/') }`);
      }

      const normalized = normalizeRecordPath('/api/v2/users/42/orders/7');
      if (normalized.endpoint !== 'api/v2/users/:id/orders/:id2') {
        failures.push(`endpoint expected api/v2/users/:id/orders/:id2, got ${ normalized.endpoint }`);
      }
      if (normalized.params.id !== '42' || normalized.params.id2 !== '7') {
        failures.push(`params expected id=42 id2=7, got ${ JSON.stringify(normalized.params) }`);
      }

      const numericOnly = normalizeRecordPath('/200/300');
      if (numericOnly.endpoint !== '200/300') {
        failures.push(`numeric-only path should stay literal, got ${ numericOnly.endpoint }`);
      }
      if (Object.keys(numericOnly.params).length !== 0) {
        failures.push(`numeric-only path should not create params, got ${ JSON.stringify(numericOnly.params) }`);
      }

      const stripped = stripPrefixFromPath('/api/payments/methods', 'api/payments');
      if (stripped !== 'methods') {
        failures.push(`stripPrefix expected methods, got ${ stripped }`);
      }

      const query = canonicalQuery({ b: '2', a: ['1', '3'] });
      if (JSON.stringify(query) !== JSON.stringify({ a: '1,3', b: '2' })) {
        failures.push(`canonicalQuery unexpected ${ JSON.stringify(query) }`);
      }
    } catch (error) {
      failures.push(error instanceof Error ? error.message : String(error));
    }

    return {
      name: 'unit/record-path',
      description: 'Unit: normalizeRecordPath maps digits to :id and keeps vN',
      passed: failures.length === 0,
      failures,
      durationMs: Date.now() - startedAt,
      expectedOutcome: 'success'
    };
  }
};
