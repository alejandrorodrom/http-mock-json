'use strict';

const fs = require('fs');
const path = require('path');
const {
  createWorkspace,
  startMockServer
} = require('../../lib/server-harness');
const { request, expectStatus, expectEqual } = require('../../lib/http-assert');

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = {
  name: 'runtime/store-persist-matrix',
  description: 'HTTP: persist custom file, disabled persist, CRUD disk sync, reset by id, watch keeps data',
  async run() {
    const startedAt = Date.now();
    const failures = [];
    const { workspaceDir, cleanup } = createWorkspace('mocks/28-store-persist-matrix.json');
    const alphaFile = path.join(workspaceDir, 'mocks', '.store', 'alpha.json');
    const betaFile = path.join(workspaceDir, 'mocks', 'custom', 'beta-state.json');
    const gammaFile = path.join(workspaceDir, 'mocks', '.store', 'gamma.json');
    const deltaFile = path.join(workspaceDir, 'mocks', '.store', 'delta.json');
    const mockFile = path.join(workspaceDir, 'mocks', '28-store-persist-matrix.json');

    let server;

    try {
      server = await startMockServer({
        workspaceDir,
        cleanup,
        cleanupOnStop: false,
        timeoutMs: 20000
      });

      const createdAlpha = await request(`${ server.baseUrl }/api/alpha`, {
        method: 'POST',
        json: { name: 'alpha-2' }
      });
      failures.push(...expectStatus(createdAlpha.status, 201, 'alpha create'));

      const updated = await request(`${ server.baseUrl }/api/alpha/${ createdAlpha.body.id }`, {
        method: 'PUT',
        json: { name: 'alpha-2-updated' }
      });
      failures.push(...expectStatus(updated.status, 200, 'alpha put persist'));

      const patched = await request(`${ server.baseUrl }/api/alpha/1`, {
        method: 'PATCH',
        json: { name: 'seed-alpha-patched' }
      });
      failures.push(...expectStatus(patched.status, 200, 'alpha patch persist'));

      const deleted = await request(`${ server.baseUrl }/api/alpha/1`, {
        method: 'DELETE'
      });
      failures.push(...expectStatus(deleted.status, 204, 'alpha delete persist'));

      const createdBeta = await request(`${ server.baseUrl }/api/beta`, {
        method: 'POST',
        json: { name: 'beta-1' }
      });
      failures.push(...expectStatus(createdBeta.status, 201, 'beta create custom file'));

      const createdGamma = await request(`${ server.baseUrl }/api/gamma`, {
        method: 'POST',
        json: { name: 'gamma-2' }
      });
      failures.push(...expectStatus(createdGamma.status, 201, 'gamma create no persist'));

      const createdDelta = await request(`${ server.baseUrl }/api/delta`, {
        method: 'POST',
        json: { name: 'delta-1' }
      });
      failures.push(...expectStatus(createdDelta.status, 201, 'delta create persist false object'));

      if (!fs.existsSync(alphaFile)) {
        failures.push(`Expected default persist file ${ alphaFile }`);
      }
      if (!fs.existsSync(betaFile)) {
        failures.push(`Expected custom persist file ${ betaFile }`);
      }
      if (fs.existsSync(gammaFile)) {
        failures.push('Did not expect persist file for persist:false');
      }
      if (fs.existsSync(deltaFile)) {
        failures.push('Did not expect persist file for persist.enabled:false');
      }

      const alphaDisk = JSON.parse(fs.readFileSync(alphaFile, 'utf8'));
      failures.push(...expectEqual(alphaDisk.items?.length, 1, 'alpha disk after delete seed'));
      failures.push(...expectEqual(alphaDisk.items?.[0]?.name, 'alpha-2-updated', 'alpha disk updated'));

      // Custom persist writes must not restart the watcher
      const stdoutBeforeBetaWrite = server.getStdout();
      const createdBeta2 = await request(`${ server.baseUrl }/api/beta`, {
        method: 'POST',
        json: { name: 'beta-2' }
      });
      failures.push(...expectStatus(createdBeta2.status, 201, 'beta second create'));
      await sleep(1500);
      if (server.getStdout().slice(stdoutBeforeBetaWrite.length).includes('Mock server is restarting')) {
        failures.push('Custom persist.file write must not trigger watch restart');
      }

      // Watch reload should keep persisted alpha
      const current = JSON.parse(fs.readFileSync(mockFile, 'utf8'));
      current['api/alpha'].GET.responses[0].name = `list-${ Date.now() }`;
      current['api/alpha'].GET.nameResponse = current['api/alpha'].GET.responses[0].name;
      fs.writeFileSync(mockFile, `${ JSON.stringify(current, null, 2) }\n`, 'utf8');

      const deadline = Date.now() + 12000;
      let restarted = false;
      while (Date.now() < deadline) {
        if (server.getStdout().includes('Mock server is restarting')) {
          restarted = true;
          break;
        }
        await sleep(100);
      }
      if (!restarted) {
        failures.push('Expected watch restart after mock file change');
      }

      await sleep(800);
      const afterWatch = await request(`${ server.baseUrl }/api/alpha`);
      failures.push(...expectStatus(afterWatch.status, 200, 'list after watch'));
      failures.push(...expectEqual(afterWatch.body.length, 1, 'persist survives watch'));
      failures.push(...expectEqual(afterWatch.body[0]?.name, 'alpha-2-updated', 'watch kept value'));

      await server.stop();

      // Restart without reset: alpha+beta persist, gamma/delta back to seed
      server = await startMockServer({
        workspaceDir,
        cleanup,
        cleanupOnStop: false,
        timeoutMs: 20000
      });

      const alphaAfter = await request(`${ server.baseUrl }/api/alpha`);
      failures.push(...expectEqual(alphaAfter.body.length, 1, 'alpha survives process restart'));
      failures.push(...expectEqual(alphaAfter.body[0]?.name, 'alpha-2-updated', 'alpha value after restart'));

      const betaAfter = await request(`${ server.baseUrl }/api/beta`);
      failures.push(...expectEqual(betaAfter.body.length, 2, 'beta custom file survives'));
      const betaNames = betaAfter.body.map((item) => item.name).sort();
      failures.push(...expectEqual(betaNames, ['beta-1', 'beta-2'], 'beta values'));

      const gammaAfter = await request(`${ server.baseUrl }/api/gamma`);
      failures.push(...expectEqual(gammaAfter.body.length, 1, 'gamma back to seed only'));
      failures.push(...expectEqual(gammaAfter.body[0]?.name, 'ephemeral', 'gamma seed'));

      await server.stop();

      // Reset only alpha
      server = await startMockServer({
        workspaceDir,
        cleanup,
        cleanupOnStop: false,
        resetStore: 'alpha',
        timeoutMs: 20000
      });

      const alphaReset = await request(`${ server.baseUrl }/api/alpha`);
      failures.push(...expectEqual(alphaReset.body.length, 1, 'alpha reset to seed'));
      failures.push(...expectEqual(alphaReset.body[0]?.name, 'seed-alpha', 'alpha seed name'));

      const betaKept = await request(`${ server.baseUrl }/api/beta`);
      failures.push(...expectEqual(betaKept.body.length, 2, 'beta kept after alpha reset'));
      const betaKeptNames = betaKept.body.map((item) => item.name).sort();
      failures.push(...expectEqual(betaKeptNames, ['beta-1', 'beta-2'], 'beta still persisted'));

      if (fs.existsSync(alphaFile)) {
        failures.push('Expected alpha persist file removed after --reset-store alpha');
      }
      if (!fs.existsSync(betaFile)) {
        failures.push('Expected beta custom persist file to remain');
      }

      // --reset-store applies only to initial CLI start, never to watch reloads
      const createdAfterReset = await request(`${ server.baseUrl }/api/alpha`, {
        method: 'POST',
        json: { name: 'after-reset' }
      });
      failures.push(...expectStatus(createdAfterReset.status, 201, 'create after reset-store'));

      const beforeWatchResetProbe = server.getStdout();
      const mockAfterReset = JSON.parse(fs.readFileSync(mockFile, 'utf8'));
      mockAfterReset['api/alpha'].GET.responses[0].name = `list-reset-${ Date.now() }`;
      mockAfterReset['api/alpha'].GET.nameResponse = mockAfterReset['api/alpha'].GET.responses[0].name;
      fs.writeFileSync(mockFile, `${ JSON.stringify(mockAfterReset, null, 2) }\n`, 'utf8');

      const watchDeadline = Date.now() + 12000;
      let watchRestarted = false;
      while (Date.now() < watchDeadline) {
        if (server.getStdout().slice(beforeWatchResetProbe.length).includes('Mock server is restarting')) {
          watchRestarted = true;
          break;
        }
        await sleep(100);
      }
      if (!watchRestarted) {
        failures.push('Expected watch restart after mock change (reset-store probe)');
      }

      await sleep(800);
      const alphaAfterWatch = await request(`${ server.baseUrl }/api/alpha`);
      failures.push(...expectStatus(alphaAfterWatch.status, 200, 'list after watch post-reset'));
      const alphaNames = alphaAfterWatch.body.map((item) => item.name).sort();
      failures.push(...expectEqual(
        alphaNames,
        ['after-reset', 'seed-alpha'],
        'watch must not re-apply --reset-store'
      ));

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
      name: 'runtime/store-persist-matrix',
      description: 'HTTP: persist custom file, disabled persist, CRUD disk sync, reset by id, watch keeps data',
      passed: failures.length === 0,
      failures,
      durationMs: Date.now() - startedAt,
      expectedOutcome: 'success'
    };
  }
};
