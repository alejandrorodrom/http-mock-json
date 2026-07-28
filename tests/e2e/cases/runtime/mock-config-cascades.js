'use strict';

const fs = require('fs');
const path = require('path');
const http = require('http');
const {
  createWorkspace,
  startMockServer,
  getFreePort
} = require('../../lib/server-harness');
const {
  request,
  expectStatus,
  expectEqual,
  expectHeader,
  expectMinDelay
} = require('../../lib/http-assert');

const writeJson = (filePath, value) => {
  fs.writeFileSync(filePath, `${ JSON.stringify(value, null, 2) }\n`, 'utf8');
};

const startUpstream = (label) => new Promise((resolve, reject) => {
  const hits = [];
  const server = http.createServer((req, res) => {
    hits.push(`${ req.method } ${ req.url }`);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ upstream: label, url: req.url }));
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
  name: 'runtime/mock-config-cascades',
  description: 'HTTP: delay/headers/proxy/port priority cascades from mock.config.json',
  async run() {
    const startedAt = Date.now();
    const failures = [];
    const methodUpstream = await startUpstream('method');
    const folderUpstream = await startUpstream('folder');
    const rootUpstream = await startUpstream('root');
    const cliUpstream = await startUpstream('cli');
    const { workspaceDir, cleanup } = createWorkspace(null, { emptyMocksDir: true });
    const mocksDir = path.join(workspaceDir, 'mocks');
    let server;

    try {
      fs.mkdirSync(path.join(mocksDir, 'users'), { recursive: true });
      fs.mkdirSync(path.join(mocksDir, 'billing'), { recursive: true });

      writeJson(path.join(mocksDir, 'mock.config.json'), {
        delay: 40,
        proxy: rootUpstream.baseUrl,
        headers: {
          'X-Mock-Env': 'local',
          'X-Owner': 'root'
        },
        folders: {
          users: {
            prefix: '/api/users',
            delay: 80,
            proxy: folderUpstream.baseUrl,
            headers: {
              'X-Service': 'users',
              'X-Owner': 'folder'
            }
          },
          billing: {
            prefix: '/api/billing'
          }
        }
      });

      writeJson(path.join(mocksDir, 'users', 'profile.json'), {
        me: {
          GET: {
            nameResponse: 'ok',
            delay: 120,
            proxy: methodUpstream.baseUrl,
            responses: [
              {
                name: 'slow',
                statusCode: 200,
                delay: 180,
                match: { query: { slow: '1' } },
                headers: {
                  'X-Request-Id': 'slow-1',
                  'X-Owner': 'response'
                },
                body: { ok: true, slow: true }
              },
              {
                name: 'via-method',
                proxy: true,
                match: { query: { via: 'method' } }
              },
              {
                name: 'ok',
                statusCode: 200,
                headers: {
                  'X-Request-Id': 'ok-1',
                  'X-Owner': 'response'
                },
                body: { ok: true }
              }
            ]
          }
        },
        'me-folder': {
          GET: {
            nameResponse: 'via-folder',
            responses: [
              {
                name: 'via-folder',
                proxy: true
              }
            ]
          }
        }
      });

      writeJson(path.join(mocksDir, 'billing', 'invoice.json'), {
        invoice: {
          GET: {
            nameResponse: 'ok',
            responses: [
              {
                name: 'via-root',
                proxy: true,
                match: { query: { via: 'root' } }
              },
              {
                name: 'via-cli',
                proxy: true,
                match: { query: { via: 'cli' } }
              },
              {
                name: 'ok',
                statusCode: 200,
                body: { ok: true }
              }
            ]
          }
        }
      });

      writeJson(path.join(mocksDir, 'health.json'), {
        health: {
          GET: {
            nameResponse: 'ok',
            responses: [
              { name: 'ok', statusCode: 200, body: { ok: true } }
            ]
          }
        }
      });

      server = await startMockServer({
        workspaceDir,
        cleanup,
        cleanupOnStop: false,
        timeoutMs: 20000
      });

      {
        const started = Date.now();
        const result = await request(`${ server.baseUrl }/api/users/me?slow=1`);
        const elapsed = Date.now() - started;
        failures.push(...expectStatus(result.status, 200, 'response delay path'));
        failures.push(...expectMinDelay(elapsed, 140, 'response delay should beat method/folder'));
        failures.push(...expectHeader(result.headers, 'x-owner', 'response', 'response header wins'));
        failures.push(...expectHeader(result.headers, 'x-service', 'users', 'folder header kept'));
        failures.push(...expectHeader(result.headers, 'x-mock-env', 'local', 'root header kept'));
        failures.push(...expectHeader(result.headers, 'x-request-id', 'slow-1', 'response-only header'));
      }

      {
        const started = Date.now();
        const result = await request(`${ server.baseUrl }/api/users/me`);
        const elapsed = Date.now() - started;
        failures.push(...expectStatus(result.status, 200, 'method delay path'));
        failures.push(...expectMinDelay(elapsed, 90, 'method delay should beat folder'));
        failures.push(...expectHeader(result.headers, 'x-owner', 'response', 'response owner on default'));
      }

      {
        const started = Date.now();
        const result = await request(`${ server.baseUrl }/health`);
        const elapsed = Date.now() - started;
        failures.push(...expectStatus(result.status, 200, 'root delay path'));
        failures.push(...expectMinDelay(elapsed, 20, 'root delay applies to root files'));
        failures.push(...expectHeader(result.headers, 'x-owner', 'root', 'root owner without folder/response'));
        if (result.headers.get('x-service') !== null) {
          failures.push('root file should not get folder headers');
        }
      }

      {
        const before = methodUpstream.hits.length;
        const result = await request(`${ server.baseUrl }/api/users/me?via=method`);
        failures.push(...expectStatus(result.status, 200, 'proxy method target'));
        failures.push(...expectEqual(result.body, {
          upstream: 'method',
          url: '/api/users/me?via=method'
        }, 'method proxy wins'));
        if (methodUpstream.hits.length !== before + 1) {
          failures.push('Expected one hit on method upstream');
        }
      }

      {
        const before = folderUpstream.hits.length;
        const result = await request(`${ server.baseUrl }/api/users/me-folder`);
        failures.push(...expectStatus(result.status, 200, 'proxy folder target'));
        failures.push(...expectEqual(result.body?.upstream, 'folder', 'folder proxy when method proxy unused'));
        if (folderUpstream.hits.length !== before + 1) {
          failures.push('Expected one hit on folder upstream');
        }
      }

      await server.stop();
      server = null;

      server = await startMockServer({
        workspaceDir,
        cleanup,
        cleanupOnStop: false,
        timeoutMs: 20000
      });

      {
        const before = rootUpstream.hits.length;
        const result = await request(`${ server.baseUrl }/api/billing/invoice?via=root`);
        failures.push(...expectStatus(result.status, 200, 'proxy root target'));
        failures.push(...expectEqual(result.body?.upstream, 'root', 'root config proxy'));
        if (rootUpstream.hits.length !== before + 1) {
          failures.push('Expected one hit on root upstream');
        }
      }

      await server.stop();
      server = null;

      writeJson(path.join(mocksDir, 'mock.config.json'), {
        folders: {
          billing: {
            prefix: '/api/billing'
          }
        }
      });

      server = await startMockServer({
        workspaceDir,
        cleanup,
        cleanupOnStop: false,
        proxy: cliUpstream.baseUrl,
        timeoutMs: 20000
      });

      {
        const before = cliUpstream.hits.length;
        const result = await request(`${ server.baseUrl }/api/billing/invoice?via=cli`);
        failures.push(...expectStatus(result.status, 200, 'proxy CLI target'));
        failures.push(...expectEqual(result.body?.upstream, 'cli', 'CLI --proxy fallback'));
        if (cliUpstream.hits.length !== before + 1) {
          failures.push('Expected one hit on CLI upstream');
        }
      }

      await server.stop();
      server = null;

      const configPort = await getFreePort();
      const cliPort = await getFreePort();

      writeJson(path.join(mocksDir, 'mock.config.json'), {
        port: configPort,
        folders: {
          users: {
            prefix: '/api/users'
          }
        }
      });
      writeJson(path.join(mocksDir, 'users', 'profile.json'), {
        me: {
          GET: {
            nameResponse: 'ok',
            responses: [
              { name: 'ok', statusCode: 200, body: { source: 'config-port' } }
            ]
          }
        }
      });

      server = await startMockServer({
        workspaceDir,
        cleanup,
        cleanupOnStop: false,
        omitCliPort: true,
        timeoutMs: 20000
      });

      {
        failures.push(...expectEqual(server.port, configPort, 'listen port from config'));
        const result = await request(`${ server.baseUrl }/api/users/me`);
        failures.push(...expectStatus(result.status, 200, 'HTTP on config port'));
        failures.push(...expectEqual(result.body, { source: 'config-port' }, 'body on config port'));
      }

      await server.stop();
      server = null;

      server = await startMockServer({
        workspaceDir,
        cleanup,
        cleanupOnStop: false,
        cliPort,
        timeoutMs: 20000
      });

      {
        failures.push(...expectEqual(server.port, cliPort, 'CLI port overrides config port'));
        const result = await request(`${ server.baseUrl }/api/users/me`);
        failures.push(...expectStatus(result.status, 200, 'HTTP on CLI port'));
      }
    } catch (error) {
      failures.push(error instanceof Error ? error.message : String(error));
    } finally {
      if (server) {
        await server.stop();
      }
      cleanup();
      await Promise.all([
        methodUpstream.stop(),
        folderUpstream.stop(),
        rootUpstream.stop(),
        cliUpstream.stop()
      ]);
    }

    return {
      name: 'runtime/mock-config-cascades',
      description: 'HTTP: delay/headers/proxy/port priority cascades from mock.config.json',
      passed: failures.length === 0,
      failures,
      durationMs: Date.now() - startedAt,
      expectedOutcome: 'success'
    };
  }
};
