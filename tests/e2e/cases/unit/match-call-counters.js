'use strict';

const path = require('path');
const { runUnitUseCase, PROJECT_ROOT } = require('../../lib/execute-mock-file');

module.exports = {
  name: 'unit/match-call-counters',
  description: 'resetCallCounters clears in-memory match.call counters',
  run: () => runUnitUseCase({
    name: 'unit/match-call-counters',
    description: 'resetCallCounters clears in-memory match.call counters',
    expectedOutcome: 'success',
    async assert() {
      const {
        selectResponse,
        resetCallCounters
      } = require(path.join(PROJECT_ROOT, 'dist/src/scripts/match.script.js'));
      const failures = [];

      const responses = [
        {
          name: 'first',
          status: 503,
          headers: {},
          body: { n: 1 },
          match: { call: 1 }
        },
        {
          name: 'second',
          status: 200,
          headers: {},
          body: { n: 2 },
          match: { call: 2 }
        },
        {
          name: 'fallback',
          status: 200,
          headers: {},
          body: { n: 0 }
        }
      ];

      const fakeReq = { params: {}, query: {}, body: {} };
      const callKey = 'GET:/api/unit-call';

      resetCallCounters();

      const one = selectResponse(responses, 'fallback', fakeReq, callKey);
      if (one.name !== 'first') {
        failures.push(`Expected first call → first, got ${ one.name }`);
      }

      const two = selectResponse(responses, 'fallback', fakeReq, callKey);
      if (two.name !== 'second') {
        failures.push(`Expected second call → second, got ${ two.name }`);
      }

      const three = selectResponse(responses, 'fallback', fakeReq, callKey);
      if (three.name !== 'fallback') {
        failures.push(`Expected third call → fallback, got ${ three.name }`);
      }

      resetCallCounters();

      const afterReset = selectResponse(responses, 'fallback', fakeReq, callKey);
      if (afterReset.name !== 'first') {
        failures.push(`Expected after reset → first, got ${ afterReset.name }`);
      }

      // scoped by body field
      resetCallCounters();
      const scoped = [
        {
          name: 'a1',
          status: 401,
          headers: {},
          body: { who: 'a' },
          match: { call: { index: 1, by: { body: 'email' } } }
        },
        {
          name: 'fallback',
          status: 200,
          headers: {},
          body: {}
        }
      ];

      const alice = selectResponse(
        scoped,
        'fallback',
        { params: {}, query: {}, body: { email: 'a@x.com' } },
        callKey
      );
      const bob = selectResponse(
        scoped,
        'fallback',
        { params: {}, query: {}, body: { email: 'b@x.com' } },
        callKey
      );
      if (alice.name !== 'a1' || bob.name !== 'a1') {
        failures.push(`Expected independent by scopes → a1/a1, got ${ alice.name }/${ bob.name }`);
      }

      const alice2 = selectResponse(
        scoped,
        'fallback',
        { params: {}, query: {}, body: { email: 'a@x.com' } },
        callKey
      );
      if (alice2.name !== 'fallback') {
        failures.push(`Expected alice 2nd call → fallback, got ${ alice2.name }`);
      }

      // reset side-effect
      resetCallCounters();
      const withReset = [
        {
          name: 'hit',
          status: 401,
          headers: {},
          body: {},
          match: { call: { index: 1 } }
        },
        {
          name: 'ok',
          status: 200,
          headers: {},
          body: {},
          match: { call: { reset: true }, body: { ok: true } }
        },
        {
          name: 'fallback',
          status: 423,
          headers: {},
          body: {}
        }
      ];

      selectResponse(withReset, 'fallback', { params: {}, query: {}, body: {} }, callKey);
      selectResponse(
        withReset,
        'fallback',
        { params: {}, query: {}, body: { ok: true } },
        callKey
      );
      const again = selectResponse(withReset, 'fallback', { params: {}, query: {}, body: {} }, callKey);
      if (again.name !== 'hit') {
        failures.push(`Expected reset → hit again, got ${ again.name }`);
      }

      // loop wrapping
      resetCallCounters();
      const looping = [
        {
          name: 'one',
          status: 503,
          headers: {},
          body: {},
          match: { call: { index: 1, loop: true } }
        },
        {
          name: 'two',
          status: 200,
          headers: {},
          body: {},
          match: { call: { index: 2, loop: true } }
        },
        {
          name: 'fallback',
          status: 200,
          headers: {},
          body: {}
        }
      ];

      selectResponse(looping, 'fallback', fakeReq, callKey);
      selectResponse(looping, 'fallback', fakeReq, callKey);
      const wrap = selectResponse(looping, 'fallback', fakeReq, callKey);
      if (wrap.name !== 'one') {
        failures.push(`Expected loop wrap → one, got ${ wrap.name }`);
      }

      // missing by scope skips counter
      resetCallCounters();
      const missingBy = [
        {
          name: 'scoped',
          status: 401,
          headers: {},
          body: {},
          match: { call: { index: 1, by: { body: 'email' } } }
        },
        {
          name: 'fallback',
          status: 400,
          headers: {},
          body: {}
        }
      ];

      const noEmail = selectResponse(
        missingBy,
        'fallback',
        { params: {}, query: {}, body: {} },
        callKey
      );
      if (noEmail.name !== 'fallback') {
        failures.push(`Expected missing by → fallback, got ${ noEmail.name }`);
      }

      const withEmail = selectResponse(
        missingBy,
        'fallback',
        { params: {}, query: {}, body: { email: 'x@y.com' } },
        callKey
      );
      if (withEmail.name !== 'scoped') {
        failures.push(`Expected email present → scoped (call 1), got ${ withEmail.name }`);
      }

      return failures;
    }
  })
};
