'use strict';

const fs = require('fs');
const path = require('path');
const {
  createWorkspace,
  startMockServer
} = require('../../lib/server-harness');
const { request, expectStatus, expectEqual } = require('../../lib/http-assert');

module.exports = {
  name: 'runtime/store-persist-write-failed',
  description: 'HTTP: persist write failure is logged and keeps the in-memory mutation',
  async run() {
    const startedAt = Date.now();
    const failures = [];
    const { workspaceDir, cleanup } = createWorkspace('mocks/26-store-persist.json');
    const persistPath = path.join(workspaceDir, 'mocks', '.store', 'notes.json');

    let server;

    try {
      server = await startMockServer({
        workspaceDir,
        cleanup,
        cleanupOnStop: false,
        timeoutMs: 20000
      });

      // Block atomic rename by making the target path a directory.
      fs.mkdirSync(path.dirname(persistPath), { recursive: true });
      fs.mkdirSync(persistPath, { recursive: true });

      const created = await request(`${ server.baseUrl }/api/notes`, {
        method: 'POST',
        json: { title: 'Kept in RAM' }
      });
      failures.push(...expectStatus(created.status, 201, 'create despite persist write failure'));
      failures.push(...expectEqual(created.body.title, 'Kept in RAM', 'created title'));

      const listed = await request(`${ server.baseUrl }/api/notes`);
      failures.push(...expectStatus(listed.status, 200, 'list after failed persist'));
      failures.push(...expectEqual(listed.body.length, 1, 'RAM mutation kept'));
      failures.push(...expectEqual(listed.body[0]?.title, 'Kept in RAM', 'RAM title'));

      const output = `${ server.getStdout() }\n${ server.getStderr() }`;
      if (!output.includes('Failed to persist store "notes"')) {
        failures.push(
          `Expected persist write failure log.\nstdout/stderr:\n${ output }`
        );
      }

      await server.stop();
    } catch (error) {
      failures.push(error instanceof Error ? error.message : String(error));
    } finally {
      if (server) {
        await server.stop().catch(() => undefined);
      }
      cleanup();
    }

    return {
      name: 'runtime/store-persist-write-failed',
      description: 'HTTP: persist write failure is logged and keeps the in-memory mutation',
      passed: failures.length === 0,
      failures,
      durationMs: Date.now() - startedAt,
      expectedOutcome: 'success'
    };
  }
};
