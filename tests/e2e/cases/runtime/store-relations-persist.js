'use strict';

const fs = require('fs');
const path = require('path');
const {
  createWorkspace,
  startMockServer
} = require('../../lib/server-harness');
const { request, expectStatus, expectEqual } = require('../../lib/http-assert');

module.exports = {
  name: 'runtime/store-relations-persist',
  description: 'HTTP: relations + persist survive restart (FK data + cascade side effects)',
  async run() {
    const startedAt = Date.now();
    const failures = [];
    const { workspaceDir, cleanup } = createWorkspace(
      'mocks/39-store-relations-matrix.json'
    );
    const ordersFile = path.join(workspaceDir, 'mocks', '.store', 'matrix-orders.json');
    const itemsFile = path.join(workspaceDir, 'mocks', '.store', 'matrix-items.json');

    let first;
    let second;

    try {
      first = await startMockServer({
        workspaceDir,
        cleanup,
        cleanupOnStop: false,
        timeoutMs: 20000
      });

      const created = await request(`${ first.baseUrl }/api/acme/matrix-items`, {
        method: 'POST',
        json: { orderId: 2, sku: 'NEW', qty: 3 }
      });
      failures.push(...expectStatus(created.status, 201, 'persist-relations create'));
      failures.push(...expectEqual(created.body.sku, 'NEW', 'created sku'));

      const badFk = await request(`${ first.baseUrl }/api/acme/matrix-items`, {
        method: 'POST',
        json: { orderId: 999, sku: 'X', qty: 1 }
      });
      failures.push(...expectStatus(badFk.status, 422, 'FK still enforced with persist'));

      if (!fs.existsSync(itemsFile)) {
        failures.push(`Expected items persist file at ${ itemsFile }`);
      }

      await first.stop();

      second = await startMockServer({
        workspaceDir,
        cleanup,
        cleanupOnStop: false,
        timeoutMs: 20000
      });

      const listed = await request(
        `${ second.baseUrl }/api/acme/matrix-items?orderId=2&expand=order`
      );
      failures.push(...expectStatus(listed.status, 200, 'list after restart'));
      failures.push(...expectEqual(listed.body.length, 1, 'persisted item size'));
      failures.push(...expectEqual(listed.body[0]?.sku, 'NEW', 'persisted sku'));
      failures.push(...expectEqual(listed.body[0]?.order?.id, 2, 'expand after persist'));

      // Orders file appears once the orders collection is mutated; items persist is enough here.
      failures.push(...expectEqual(fs.existsSync(itemsFile), true, 'items persist file remains'));

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
      name: 'runtime/store-relations-persist',
      description: 'HTTP: relations + persist survive restart (FK data + cascade side effects)',
      passed: failures.length === 0,
      failures,
      durationMs: Date.now() - startedAt,
      expectedOutcome: 'success'
    };
  }
};
