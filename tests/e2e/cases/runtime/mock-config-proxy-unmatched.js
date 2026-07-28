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
  const hits = [];
  const server = http.createServer((req, res) => {
    hits.push(`${ req.method } ${ req.url }`);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, url: req.url }));
  });

  server.listen(0, '127.0.0.1', () => {
    const address = server.address();
    resolve({
      port: address.port,
      hits,
      baseUrl: `http://127.0.0.1:${ address.port }`,
      stop: () => new Promise((done) => server.close(() => done()))
    });
  });
  server.on('error', reject);
});

module.exports = {
  name: 'runtime/mock-config-proxy-unmatched',
  description: 'HTTP: proxyUnmatched + stripPrefix for folder prefix catch-all',
  async run() {
    const startedAt = Date.now();
    const failures = [];
    const upstream = await startUpstream();
    const { workspaceDir, cleanup } = createWorkspace(null, { emptyMocksDir: true });
    const mocksDir = path.join(workspaceDir, 'mocks');

    fs.mkdirSync(path.join(mocksDir, 'users'), { recursive: true });

    writeJson(path.join(mocksDir, 'mock.config.json'), {
      folders: {
        users: {
          prefix: '/api/users',
          stripPrefix: true,
          proxyUnmatched: upstream.baseUrl
        }
      }
    });

    writeJson(path.join(mocksDir, 'users', 'auth.json'), {
      login: {
        POST: {
          nameResponse: 'ok',
          responses: [
            { name: 'ok', statusCode: 200, body: { token: 'local' } }
          ]
        }
      }
    });

    let server;

    try {
      server = await startMockServer({
        workspaceDir,
        cleanup,
        cleanupOnStop: false,
        timeoutMs: 20000
      });

      const local = await request(`${ server.baseUrl }/api/users/login`, {
        method: 'POST',
        json: {}
      });
      failures.push(...expectStatus(local.status, 200, 'mocked login stays local'));
      failures.push(...expectEqual(local.body, { token: 'local' }, 'local login body'));

      const proxied = await request(`${ server.baseUrl }/api/users/settings?x=1`);
      failures.push(...expectStatus(proxied.status, 200, 'unmatched folder route proxied'));
      failures.push(...expectEqual(proxied.body.ok, true, 'upstream ok'));
      failures.push(...expectEqual(proxied.body.url, '/settings?x=1', 'stripPrefix removed /api/users'));

      if (!upstream.hits.includes('GET /settings?x=1')) {
        failures.push(`Expected upstream hit GET /settings?x=1, got ${ upstream.hits.join(', ') }`);
      }
    } catch (error) {
      failures.push(error instanceof Error ? error.message : String(error));
    } finally {
      if (server) {
        await server.stop();
      }
      cleanup();
      await upstream.stop();
    }

    return {
      name: 'runtime/mock-config-proxy-unmatched',
      description: 'HTTP: proxyUnmatched + stripPrefix for folder prefix catch-all',
      passed: failures.length === 0,
      failures,
      durationMs: Date.now() - startedAt,
      expectedOutcome: 'success'
    };
  }
};
