'use strict';

const path = require('path');
const http = require('http');
const {
  createWorkspace,
  startMockServer,
  getFreePort,
  runCli,
  readJson,
  writeJson,
  MOCK_CONFIG_FIXTURE
} = require('../../lib/server-harness');
const {
  request,
  expectStatus,
  expectEqual,
  expectHeader,
  expectMinDelay
} = require('../../lib/http-assert');

const startUpstream = () => new Promise((resolve, reject) => {
  const hits = [];
  const server = http.createServer((req, res) => {
    hits.push(`${ req.method } ${ req.url }`);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ upstream: true, url: req.url }));
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
  name: 'runtime/mock-config-exhaustive',
  description: 'HTTP: exhaustive mock.config success paths (folders, store, proxy, port)',
  async run() {
    const startedAt = Date.now();
    const failures = [];
    const upstream = await startUpstream();
    const { workspaceDir, mocksDir, cleanup } = createWorkspace(null, {
      copyTree: MOCK_CONFIG_FIXTURE
    });

    const configPath = path.join(mocksDir, 'mock.config.json');
    const config = readJson(configPath);
    config.folders.payments.proxy = upstream.baseUrl;
    config.folders.payments.proxyUnmatched = upstream.baseUrl;
    writeJson(configPath, config);

    let server;

    try {
      server = await startMockServer({
        workspaceDir,
        cleanup,
        cleanupOnStop: false,
        cliPath: MOCK_CONFIG_FIXTURE,
        timeoutMs: 25000
      });

      if (server.stdout.includes('[GET] /api/orders/ignored')) {
        failures.push('exclude should skip orders/cart-draft.json');
      }
      if (server.stdout.includes('[GET] /api/payments/draft')) {
        failures.push('exclude should skip payments/intent-draft.json');
      }
      if (server.stdout.includes('v2') && server.stdout.includes('[POST] /api/payments/intents')
        && server.stdout.match(/\[POST\] \/api\/payments\/intents/g)?.length > 1) {
        failures.push('enabled:false payments-v2 should not register duplicate intents');
      }

      const healthStarted = Date.now();
      const health = await request(`${ server.baseUrl }/health`);
      const healthElapsed = Date.now() - healthStarted;
      failures.push(...expectStatus(health.status, 200, 'root health'));
      failures.push(...expectEqual(health.body, { ok: true }, 'root health body'));
      failures.push(...expectHeader(health.headers, 'x-mock-app', 'food-delivery', 'root headers'));
      failures.push(...expectMinDelay(healthElapsed, 20, 'root delay (~40ms)'));

      const loginStarted = Date.now();
      const login = await request(`${ server.baseUrl }/api/auth/login`, {
        method: 'POST',
        json: { email: 'a@b.com', password: 'secret1' }
      });
      const loginElapsed = Date.now() - loginStarted;
      failures.push(...expectStatus(login.status, 200, 'auth login'));
      failures.push(...expectEqual(login.body, { token: 'tok_demo' }, 'login body'));
      failures.push(...expectHeader(login.headers, 'x-mock-app', 'food-delivery', 'login root header'));
      failures.push(...expectHeader(login.headers, 'x-service', 'auth', 'login folder header'));
      failures.push(...expectHeader(login.headers, 'x-request-id', 'login-1', 'login response header'));
      failures.push(...expectMinDelay(loginElapsed, 60, 'auth folder delay (~90ms)'));

      const loginInvalid = await request(`${ server.baseUrl }/api/auth/login`, {
        method: 'POST',
        json: { email: 'bad', password: '1' }
      });
      failures.push(...expectStatus(loginInvalid.status, 422, 'auth request validation'));

      const cartList = await request(`${ server.baseUrl }/api/orders/cart/items`);
      failures.push(...expectStatus(cartList.status, 200, 'cart list'));
      failures.push(...expectEqual(cartList.body.length, 1, 'cart seed size'));
      failures.push(...expectHeader(cartList.headers, 'x-service', 'orders', 'orders header'));

      const cartDup = await request(`${ server.baseUrl }/api/orders/cart/items`, {
        method: 'POST',
        json: { menuItemId: 'm_pasta', qty: 1, name: 'Carbonara' }
      });
      failures.push(...expectStatus(cartDup.status, 409, 'cart unique conflict'));
      failures.push(...expectEqual(cartDup.body.code, 'ITEM_ALREADY_IN_CART', 'cart duplicate code'));

      const cartInvalid = await request(`${ server.baseUrl }/api/orders/cart/items`, {
        method: 'POST',
        json: { menuItemId: 'm_x', qty: 0, name: 'X' }
      });
      failures.push(...expectStatus(cartInvalid.status, 422, 'cart request validation'));

      const cartCreate = await request(`${ server.baseUrl }/api/orders/cart/items`, {
        method: 'POST',
        json: { menuItemId: 'm_burger', qty: 2, name: 'Burger' }
      });
      failures.push(...expectStatus(cartCreate.status, 201, 'cart create'));

      const payOk = await request(`${ server.baseUrl }/api/payments/intents`, {
        method: 'POST',
        json: { orderId: 'ord_1', amount: 10, currency: 'USD' }
      });
      failures.push(...expectStatus(payOk.status, 201, 'payments local create'));
      failures.push(...expectEqual(payOk.body.intentId, 'pi_mock_1', 'payments mock intent'));
      failures.push(...expectHeader(payOk.headers, 'x-service', 'payments', 'payments header'));

      const payDeclined = await request(`${ server.baseUrl }/api/payments/intents`, {
        method: 'POST',
        json: { orderId: 'ord_declined', amount: 10, currency: 'USD' }
      });
      failures.push(...expectStatus(payDeclined.status, 402, 'payments card declined'));

      const payLive = await request(`${ server.baseUrl }/api/payments/intents?mode=live`, {
        method: 'POST',
        json: { orderId: 'ord_live', amount: 10, currency: 'USD' }
      });
      failures.push(...expectStatus(payLive.status, 200, 'payments proxy:true live'));
      failures.push(...expectEqual(payLive.body.upstream, true, 'live upstream flag'));
      failures.push(...expectEqual(payLive.body.url, '/intents?mode=live', 'stripPrefix on proxied intent'));

      const unmatched = await request(`${ server.baseUrl }/api/payments/methods?x=1`);
      failures.push(...expectStatus(unmatched.status, 200, 'proxyUnmatched methods'));
      failures.push(...expectEqual(unmatched.body.url, '/methods?x=1', 'stripPrefix unmatched'));

      if (!upstream.hits.includes('POST /intents?mode=live')) {
        failures.push(`Expected upstream POST /intents?mode=live, got ${ upstream.hits.join(' | ') }`);
      }
      if (!upstream.hits.includes('GET /methods?x=1')) {
        failures.push(`Expected upstream GET /methods?x=1, got ${ upstream.hits.join(' | ') }`);
      }

      await server.stop();
      server = null;

      const configPort = await getFreePort();
      writeJson(configPath, {
        port: configPort,
        folders: {
          auth: { prefix: '/api/auth' }
        }
      });
      writeJson(path.join(mocksDir, 'auth', 'login.json'), {
        login: {
          GET: {
            nameResponse: 'ok',
            responses: [{ name: 'ok', statusCode: 200, body: { portCheck: true } }]
          }
        }
      });

      const cli = await runCli({
        cwd: workspaceDir,
        args: ['start', '-f', MOCK_CONFIG_FIXTURE],
        timeoutMs: 15000,
        resolveWhen: (stdout) => stdout.includes('Mock server is running')
      });

      if (cli.spawnError) {
        failures.push(cli.spawnError);
      } else if (!cli.stdout.includes(`http://localhost:${ configPort }`)) {
        failures.push(
          `Expected server on config port ${ configPort }.\nstdout:\n${ cli.stdout }`
        );
      }

      if (cli.child) {
        const { killProcessTree } = require('../../lib/server-harness');
        killProcessTree(cli.child);
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
      name: 'runtime/mock-config-exhaustive',
      description: 'HTTP: exhaustive mock.config success paths (folders, store, proxy, port)',
      passed: failures.length === 0,
      failures,
      durationMs: Date.now() - startedAt,
      expectedOutcome: 'success'
    };
  }
};
