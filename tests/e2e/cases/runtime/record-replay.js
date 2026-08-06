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
    const url = new URL(req.url, 'http://127.0.0.1');

    if (url.pathname === '/plain') {
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('hello');
      return;
    }

    if (url.pathname === '/redirect') {
      res.writeHead(302, { Location: '/posts/1' });
      res.end();
      return;
    }

    if (url.pathname === '/image.png') {
      res.writeHead(200, { 'Content-Type': 'image/png' });
      res.end(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
      return;
    }

    if (url.pathname === '/api/v2/users/42') {
      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Set-Cookie': 'session=abc',
        Authorization: 'Bearer kept'
      });
      res.end(JSON.stringify({ id: 42, version: 'v2' }));
      return;
    }

    if (url.pathname === '/posts/1') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ id: 1, title: 'recorded' }));
      return;
    }

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'missing' }));
  });

  server.listen(0, '127.0.0.1', () => {
    const address = server.address();
    resolve({
      port: address.port,
      baseUrl: `http://127.0.0.1:${ address.port }`,
      stop: () => new Promise((done) => server.close(() => done()))
    });
  });
  server.on('error', reject);
});

module.exports = {
  name: 'runtime/record-replay',
  description: 'HTTP: --record writes .recordings/ and replay works without proxy',
  async run() {
    const startedAt = Date.now();
    const failures = [];
    const upstream = await startUpstream();
    const { workspaceDir, cleanup } = createWorkspace(null, { emptyMocksDir: true });
    const mocksDir = path.join(workspaceDir, 'mocks');

    writeJson(path.join(mocksDir, 'local.json'), {
      'health': {
        GET: {
          nameResponse: 'ok',
          responses: [{ name: 'ok', statusCode: 200, body: { ok: true } }]
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
        proxy: upstream.baseUrl,
        record: true,
        timeoutMs: 20000
      });

      if (!recordServer.stdout.includes('Recording ON')) {
        failures.push('expected Recording ON in startup log');
      }
      if (!recordServer.stdout.includes('── Mocks ──')) {
        failures.push('expected Mocks section in startup log');
      }

      const local = await request(`${ recordServer.baseUrl }/health`);
      failures.push(...expectStatus(local.status, 200, 'local mock still works while recording'));

      const json = await request(`${ recordServer.baseUrl }/posts/1`);
      failures.push(...expectStatus(json.status, 200, 'proxied JSON recorded'));
      failures.push(...expectEqual(json.body.title, 'recorded', 'proxied JSON body'));

      const versioned = await request(`${ recordServer.baseUrl }/api/v2/users/42`);
      failures.push(...expectStatus(versioned.status, 200, 'versioned path proxied'));
      failures.push(...expectEqual(versioned.body.id, 42, 'versioned body id'));

      const redirect = await request(`${ recordServer.baseUrl }/redirect`, {
        redirect: 'manual'
      });
      failures.push(...expectStatus(redirect.status, 302, 'redirect recorded without follow'));

      const binary = await request(`${ recordServer.baseUrl }/image.png`);
      failures.push(...expectStatus(binary.status, 200, 'binary proxied'));

      const plain = await request(`${ recordServer.baseUrl }/plain`, { as: 'text' });
      failures.push(...expectStatus(plain.status, 200, 'plain proxied'));
      failures.push(...expectEqual(plain.body, 'hello', 'plain body while recording'));

      await recordServer.stop();
      recordServer = null;

      const recordingsRoot = path.join(mocksDir, '.recordings');
      if (!fs.existsSync(recordingsRoot)) {
        failures.push('expected .recordings directory after record session');
      } else {
        const files = fs.readdirSync(recordingsRoot).filter((name) => name.endsWith('.json'));
        if (files.length === 0) {
          failures.push('expected at least one recording JSON file');
        }

        const postsFile = files.find((name) => name.includes('posts') && name.includes('GET'));
        if (!postsFile) {
          failures.push(`expected posts GET recording, got: ${ files.join(', ') }`);
        }

        const usersFile = files.find((name) => name.includes('users') && name.includes('_id'));
        if (!usersFile) {
          failures.push(`expected users/:id recording (v2 kept, id param), got: ${ files.join(', ') }`);
        } else {
          const usersData = JSON.parse(
            fs.readFileSync(path.join(recordingsRoot, usersFile), 'utf8')
          );
          const endpointKey = Object.keys(usersData).find((key) => key.includes('v2') && key.includes(':id'));
          if (!endpointKey) {
            failures.push(`expected endpoint key with v2 and :id, got ${ Object.keys(usersData).join(', ') }`);
          }
        }

        const hasPlain = files.some((name) => name.includes('plain'));
        if (!hasPlain) {
          failures.push('text/plain should create a recording file');
        }

        const filesDir = path.join(recordingsRoot, 'files');
        if (!fs.existsSync(filesDir) || fs.readdirSync(filesDir).length === 0) {
          failures.push('expected binary file under .recordings/files');
        }
      }

      replayServer = await startMockServer({
        workspaceDir,
        cleanup,
        cleanupOnStop: false,
        timeoutMs: 20000
      });

      if (!replayServer.stdout.includes('── Recordings ──')) {
        failures.push('expected Recordings section on replay start');
      }

      const replayJson = await request(`${ replayServer.baseUrl }/posts/1`);
      failures.push(...expectStatus(replayJson.status, 200, 'replay JSON without proxy'));
      failures.push(...expectEqual(replayJson.body.title, 'recorded', 'replay JSON body'));

      const replayUser = await request(`${ replayServer.baseUrl }/api/v2/users/42`);
      failures.push(...expectStatus(replayUser.status, 200, 'replay parameterized path'));
      failures.push(...expectEqual(replayUser.body.id, 42, 'replay user id'));

      const replayRedirect = await request(`${ replayServer.baseUrl }/redirect`, {
        redirect: 'manual'
      });
      failures.push(...expectStatus(replayRedirect.status, 302, 'replay redirect status'));

      const replayPlain = await request(`${ replayServer.baseUrl }/plain`, { as: 'text' });
      failures.push(...expectStatus(replayPlain.status, 200, 'replay text/plain'));
      failures.push(...expectEqual(replayPlain.body, 'hello', 'replay text/plain body'));

      await replayServer.stop();
      replayServer = null;

      const onlyRecordings = await startMockServer({
        workspaceDir,
        cleanup,
        cleanupOnStop: false,
        recordingsOnly: true,
        timeoutMs: 20000
      });

      if (onlyRecordings.stdout.includes('── Mocks ──')) {
        failures.push('--recordings-only should not list Mocks section');
      }

      const onlyHealth = await request(`${ onlyRecordings.baseUrl }/health`);
      if (onlyHealth.status === 200 && onlyHealth.body && onlyHealth.body.ok === true) {
        failures.push('--recordings-only should not serve regular mocks');
      }

      await onlyRecordings.stop();

      const exclude = await startMockServer({
        workspaceDir,
        cleanup,
        cleanupOnStop: false,
        excludeRecordings: true,
        timeoutMs: 20000
      });

      if (exclude.stdout.includes('── Recordings ──')) {
        failures.push('--exclude-recordings should not list Recordings section');
      }

      const excludedPosts = await request(`${ exclude.baseUrl }/posts/1`);
      if (excludedPosts.status === 200) {
        failures.push('--exclude-recordings should not serve recordings');
      }

      const excludedHealth = await request(`${ exclude.baseUrl }/health`);
      failures.push(...expectStatus(excludedHealth.status, 200, 'mocks still work with --exclude-recordings'));

      await exclude.stop();
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
      name: 'runtime/record-replay',
      description: 'HTTP: --record writes .recordings/ and replay works without proxy',
      passed: failures.length === 0,
      failures,
      durationMs: Date.now() - startedAt,
      expectedOutcome: 'success'
    };
  }
};
