'use strict';

const path = require('path');

module.exports = {
  name: 'unit/record-match',
  description: 'Unit: buildMatch and responseDedupeKey keep stable match keys',
  async run() {
    const startedAt = Date.now();
    const failures = [];

    try {
      const {
        buildMatch,
        matchNameSuffix,
        responseDedupeKey
      } = require(path.resolve(__dirname, '../../../../dist/src/scripts/record-match.script.js'));

      const empty = buildMatch({}, {}, undefined);
      if (empty !== undefined) {
        failures.push(`empty match should be undefined, got ${ JSON.stringify(empty) }`);
      }

      const withQuery = buildMatch({}, { page: '1' }, { ignored: true });
      if (!withQuery?.query || withQuery.query.page !== '1') {
        failures.push(`expected query.page=1, got ${ JSON.stringify(withQuery) }`);
      }
      if (!withQuery?.body || withQuery.body.ignored !== true) {
        failures.push(`expected body object, got ${ JSON.stringify(withQuery) }`);
      }

      const primitivesSkipped = buildMatch({}, {}, 'text-body');
      if (primitivesSkipped !== undefined) {
        failures.push(`string body should not create match, got ${ JSON.stringify(primitivesSkipped) }`);
      }

      const withHeaders = buildMatch(
        { id: '9' },
        {},
        undefined,
        { Authorization: 'Bearer t', Cookie: 'a=1', 'X-Other': 'nope' }
      );
      if (withHeaders?.headers?.authorization !== 'Bearer t') {
        failures.push(`expected authorization header, got ${ JSON.stringify(withHeaders) }`);
      }
      if (withHeaders?.headers?.cookie !== 'a=1') {
        failures.push(`expected cookie header, got ${ JSON.stringify(withHeaders) }`);
      }
      if (withHeaders?.headers?.['x-other'] || withHeaders?.headers?.['X-Other']) {
        failures.push(`non-match headers should be omitted, got ${ JSON.stringify(withHeaders) }`);
      }

      const suffix = matchNameSuffix(withHeaders);
      if (suffix !== 'id-authorization-cookie') {
        failures.push(`matchNameSuffix expected id-authorization-cookie, got ${ suffix }`);
      }

      const keyA = responseDedupeKey({ match: withHeaders });
      const keyB = responseDedupeKey({
        match: {
          params: { id: '9' },
          headers: { authorization: 'Bearer t', cookie: 'a=1' }
        }
      });
      if (keyA !== keyB) {
        failures.push(`dedupe keys should match for equivalent matches`);
      }

      const keyC = responseDedupeKey({ match: { params: { id: '10' } } });
      if (keyA === keyC) {
        failures.push(`dedupe keys should differ when params differ`);
      }
    } catch (error) {
      failures.push(error instanceof Error ? error.message : String(error));
    }

    return {
      name: 'unit/record-match',
      description: 'Unit: buildMatch and responseDedupeKey keep stable match keys',
      passed: failures.length === 0,
      failures,
      durationMs: Date.now() - startedAt,
      expectedOutcome: 'success'
    };
  }
};
