'use strict';

const fs = require('fs');
const path = require('path');
const http = require('http');
const { createWorkspace, startMockServer } = require('../../lib/server-harness');
const { request, expectStatus, expectEqual } = require('../../lib/http-assert');

const writeJson = (filePath, value) => {
  fs.writeFileSync(filePath, `${ JSON.stringify(value, null, 2) }\n`, 'utf8');
};

const startUpstream = () => new Promise((resolve, reject) => {
  const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ service: 'payments', url: req.url }));
  });

  server.listen(0, '127.0.0.1', () => {
    const address = server.address();
    resolve({
      baseUrl: `http://127.0.0.1:${ address.port }`,
      stop: () => new Promise((done) => server.close(() => done()))
    });
  });
  server.on('error', reject);
});

module.exports = {
  name: 'runtime/record-replay-mock-config',
  description: 'HTTP: record under folder .recordings/ via proxyUnmatched + mock.config prefix',
  async run() {
    const startedAt = Date.now();
    const failures = [];
    const upstream = await startUpstream();
    const { workspaceDir, cleanup } = createWorkspace(null, { emptyMocksDir: true });
    const mocksDir = path.join(workspaceDir, 'mocks');

    fs.mkdirSync(path.join(mocksDir, 'payments'), { recursive: true });

    writeJson(path.join(mocksDir, 'mock.config.json'), {
      folders: {
        payments: {
          prefix: '/api/payments',
          stripPrefix: true,
          proxyUnmatched: upstream.baseUrl
        }
      }
    });

    writeJson(path.join(mocksDir, 'payments', 'intent.json'), {
      intent: {
        GET: {
          nameResponse: 'ok',
          responses: [{ name: 'ok', statusCode: 200, body: { local: true } }]
        }
      }
    });

    let recordServer;
    let replayServer;

    try {
      recordServer = await startMockServer({
        workspaceDir,
        cleanup,
        cleanupOnStop: false,
        record: true,
        timeoutMs: 20000
      });

      const local = await request(`${ recordServer.baseUrl }/api/payments/intent`);
      failures.push(...expectStatus(local.status, 200, 'local folder mock'));
      failures.push(...expectEqual(local.body.local, true, 'local body'));

      const proxied = await request(`${ recordServer.baseUrl }/api/payments/methods`);
      failures.push(...expectStatus(proxied.status, 200, 'proxyUnmatched recorded'));
      failures.push(...expectEqual(proxied.body.service, 'payments', 'upstream body'));

      await recordServer.stop();
      recordServer = null;

      const folderRecordings = path.join(mocksDir, 'payments', '.recordings');
      if (!fs.existsSync(folderRecordings)) {
        failures.push('expected payments/.recordings directory');
      } else {
        const files = fs.readdirSync(folderRecordings).filter((name) => name.endsWith('.json'));
        if (files.length === 0) {
          failures.push('expected recording JSON under payments/.recordings');
        } else {
          const data = JSON.parse(
            fs.readFileSync(path.join(folderRecordings, files[0]), 'utf8')
          );
          if (!data.methods && !data.methods?.GET) {
            const keys = Object.keys(data);
            if (!keys.includes('methods')) {
              failures.push(`expected relative endpoint "methods", got ${ keys.join(', ') }`);
            }
          }
        }
      }

      replayServer = await startMockServer({
        workspaceDir,
        cleanup,
        cleanupOnStop: false,
        timeoutMs: 20000
      });

      const replay = await request(`${ replayServer.baseUrl }/api/payments/methods`);
      failures.push(...expectStatus(replay.status, 200, 'replay folder recording'));
      failures.push(...expectEqual(replay.body.service, 'payments', 'replay body'));

      await replayServer.stop();
      replayServer = null;
    } catch (error) {
      failures.push(error instanceof Error ? error.message : String(error));
    } finally {
      if (recordServer) {
        await recordServer.stop();
      }
      if (replayServer) {
        await replayServer.stop();
      }
      cleanup();
      await upstream.stop();
    }

    return {
      name: 'runtime/record-replay-mock-config',
      description: 'HTTP: record under folder .recordings/ via proxyUnmatched + mock.config prefix',
      passed: failures.length === 0,
      failures,
      durationMs: Date.now() - startedAt,
      expectedOutcome: 'success'
    };
  }
};
