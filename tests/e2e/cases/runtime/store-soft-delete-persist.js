'use strict';

const fs = require('fs');
const path = require('path');
const {
  createWorkspace,
  startMockServer
} = require('../../lib/server-harness');
const { request, expectStatus, expectEqual } = require('../../lib/http-assert');

module.exports = {
  name: 'runtime/store-soft-delete-persist',
  description: 'HTTP: soft-deleted rows survive persist restart',
  async run() {
    const startedAt = Date.now();
    const failures = [];
    const { workspaceDir, cleanup } = createWorkspace('mocks/37-store-soft-delete.json');
    const persistFile = path.join(workspaceDir, 'mocks', '.store', 'persisted-notes.json');

    let first;
    let second;

    try {
      first = await startMockServer({
        workspaceDir,
        cleanup,
        cleanupOnStop: false,
        timeoutMs: 20000
      });

      const removed = await request(`${ first.baseUrl }/api/persisted-notes/2`, {
        method: 'DELETE'
      });
      failures.push(...expectStatus(removed.status, 204, 'soft delete before restart'));

      const hidden = await request(`${ first.baseUrl }/api/persisted-notes`);
      failures.push(...expectEqual(hidden.body.length, 1, 'hidden before restart'));

      const trash = await request(`${ first.baseUrl }/api/persisted-notes?includeDeleted=true`);
      failures.push(...expectEqual(trash.body.length, 2, 'trash before restart'));
      failures.push(...expectEqual(typeof trash.body.find((item) => item.id === 2)?.deletedAt, 'string', 'deletedAt persisted shape'));

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

      const listed = await request(`${ second.baseUrl }/api/persisted-notes`);
      failures.push(...expectStatus(listed.status, 200, 'list after restart'));
      failures.push(...expectEqual(listed.body.length, 1, 'soft-deleted still hidden'));
      failures.push(...expectEqual(listed.body[0].id, 1, 'active row after restart'));

      const included = await request(`${ second.baseUrl }/api/persisted-notes?includeDeleted=true`);
      failures.push(...expectEqual(included.body.length, 2, 'soft-deleted survived restart'));
      const soft = included.body.find((item) => item.id === 2);
      failures.push(...expectEqual(typeof soft?.deletedAt, 'string', 'deletedAt after restart'));

      const stillGone = await request(`${ second.baseUrl }/api/persisted-notes/2`);
      failures.push(...expectStatus(stillGone.status, 404, 'get soft-deleted after restart'));

      await second.stop();
    } catch (error) {
      failures.push(error instanceof Error ? error.message : String(error));
    } finally {
      if (second) {
        await second.stop().catch(() => undefined);
      } else if (first) {
        await first.stop().catch(() => undefined);
      }
      cleanup();
    }

    return {
      name: 'runtime/store-soft-delete-persist',
      description: 'HTTP: soft-deleted rows survive persist restart',
      passed: failures.length === 0,
      failures,
      durationMs: Date.now() - startedAt,
      expectedOutcome: 'success'
    };
  }
};
