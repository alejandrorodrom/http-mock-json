'use strict';

const fs = require('fs');
const path = require('path');
const {
  createWorkspace,
  startMockServer
} = require('../../lib/server-harness');
const { request, expectStatus, expectEqual } = require('../../lib/http-assert');

module.exports = {
  name: 'runtime/store-persist',
  description: 'HTTP: persisted store survives restart and clears only with --reset-store',
  async run() {
    const startedAt = Date.now();
    const failures = [];
    const { workspaceDir, cleanup } = createWorkspace('mocks/26-store-persist.json');
    const persistFile = path.join(workspaceDir, 'mocks', '.store', 'notes.json');

    let first;
    let second;
    let third;

    try {
      first = await startMockServer({
        workspaceDir,
        cleanup,
        cleanupOnStop: false,
        timeoutMs: 20000
      });

      const empty = await request(`${ first.baseUrl }/api/notes`);
      failures.push(...expectStatus(empty.status, 200, 'initial empty list'));
      failures.push(...expectEqual(empty.body, [], 'initial seed'));

      const created = await request(`${ first.baseUrl }/api/notes`, {
        method: 'POST',
        json: { title: 'Persistida' }
      });
      failures.push(...expectStatus(created.status, 201, 'create persisted note'));
      failures.push(...expectEqual(created.body.title, 'Persistida', 'created title'));

      const padded = await request(`${ first.baseUrl }/api/notes`, {
        method: 'POST',
        json: { id: '01', title: 'Zero pad' }
      });
      failures.push(...expectStatus(padded.status, 201, 'create string id 01'));
      failures.push(...expectEqual(padded.body.id, '01', 'stored id keeps leading zero'));

      const gotPadded = await request(`${ first.baseUrl }/api/notes/01`);
      failures.push(...expectStatus(gotPadded.status, 200, 'get by param 01'));
      failures.push(...expectEqual(gotPadded.body.title, 'Zero pad', 'get finds string id 01'));

      if (!fs.existsSync(persistFile)) {
        failures.push(`Expected persist file at ${ persistFile }`);
      }

      await first.stop();

      second = await startMockServer({
        workspaceDir,
        cleanup,
        cleanupOnStop: false,
        timeoutMs: 20000
      });

      const listed = await request(`${ second.baseUrl }/api/notes`);
      failures.push(...expectStatus(listed.status, 200, 'list after restart'));
      failures.push(...expectEqual(listed.body.length, 2, 'persisted size'));
      const titles = listed.body.map((item) => item.title).sort();
      failures.push(...expectEqual(titles, ['Persistida', 'Zero pad'], 'persisted titles'));

      await second.stop();

      third = await startMockServer({
        workspaceDir,
        cleanup,
        cleanupOnStop: false,
        resetStore: true,
        timeoutMs: 20000
      });

      const resetList = await request(`${ third.baseUrl }/api/notes`);
      failures.push(...expectStatus(resetList.status, 200, 'list after reset-store'));
      failures.push(...expectEqual(resetList.body, [], 'reset back to seed'));

      if (fs.existsSync(persistFile)) {
        failures.push('Expected persist file to be removed after --reset-store');
      }

      await third.stop();
    } catch (error) {
      failures.push(error instanceof Error ? error.message : String(error));
    } finally {
      if (third) {
        await third.stop().catch(() => undefined);
      } else if (second) {
        await second.stop().catch(() => undefined);
      } else if (first) {
        await first.stop().catch(() => undefined);
      }
      cleanup();
    }

    return {
      name: 'runtime/store-persist',
      description: 'HTTP: persisted store survives restart and clears only with --reset-store',
      passed: failures.length === 0,
      failures,
      durationMs: Date.now() - startedAt,
      expectedOutcome: 'success'
    };
  }
};
