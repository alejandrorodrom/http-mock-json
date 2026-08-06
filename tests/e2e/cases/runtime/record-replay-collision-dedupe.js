'use strict';

const fs = require('fs');
const path = require('path');
const http = require('http');
const { createWorkspace, startMockServer } = require('../../lib/server-harness');
const { request, expectStatus, expectEqual } = require('../../lib/http-assert');

const writeJson = (filePath, value) => {
  fs.writeFileSync(filePath, `${ JSON.stringify(value, null, 2) }\n`, 'utf8');
};

const listRecordingJson = (recordingsRoot) => {
  if (!fs.existsSync(recordingsRoot)) {
    return [];
  }
  return fs.readdirSync(recordingsRoot).filter((name) => name.endsWith('.json'));
};

const readRecordingResponses = (filePath) => {
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const endpointKey = Object.keys(data)[0];
  const methodKey = Object.keys(data[endpointKey] || {})[0];
  return {
    data,
    endpointKey,
    methodKey,
    method: data[endpointKey][methodKey],
    responses: data[endpointKey][methodKey].responses || []
  };
};

const startUpstream = () => {
  const state = {
    version: 1,
    echoByBody: new Map()
  };

  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const url = new URL(req.url, 'http://127.0.0.1');
      const auth = req.headers.authorization || '';

      if (url.pathname === '/shared') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ source: 'upstream', label: 'shared' }));
        return;
      }

      if (url.pathname === '/only-upstream') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ source: 'upstream', label: 'only' }));
        return;
      }

      if (url.pathname === '/version') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ version: state.version }));
        return;
      }

      if (url.pathname === '/secure') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ token: auth.replace(/^Bearer\s+/i, '') || null }));
        return;
      }

      if (url.pathname === '/items') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ q: url.searchParams.get('q') }));
        return;
      }

      if (url.pathname === '/echo' && req.method === 'POST') {
        const chunks = [];
        req.on('data', (chunk) => chunks.push(chunk));
        req.on('end', () => {
          let parsed = null;
          try {
            parsed = JSON.parse(Buffer.concat(chunks).toString('utf8') || 'null');
          } catch {
            parsed = null;
          }
          const key = JSON.stringify(parsed);
          const payload = state.echoByBody.get(key) || { echo: parsed, stamp: 'initial' };
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(payload));
        });
        return;
      }

      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'missing' }));
    });

    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      resolve({
        state,
        baseUrl: `http://127.0.0.1:${ address.port }`,
        stop: () => new Promise((done) => server.close(() => done()))
      });
    });
    server.on('error', reject);
  });
};

module.exports = {
  name: 'runtime/record-replay-collision-dedupe',
  description: 'HTTP: mock vs recording collision and re-record / dedupe with local upstream',
  async run() {
    const startedAt = Date.now();
    const failures = [];
    const upstream = await startUpstream();
    const { workspaceDir, cleanup } = createWorkspace(null, { emptyMocksDir: true });
    const mocksDir = path.join(workspaceDir, 'mocks');
    const recordingsRoot = path.join(mocksDir, '.recordings');

    let server = null;

    try {
      writeJson(path.join(mocksDir, 'shared-mock.json'), {
        shared: {
          GET: {
            nameResponse: 'mock',
            responses: [{ name: 'mock', statusCode: 200, body: { source: 'mock', label: 'shared' } }]
          }
        }
      });

      server = await startMockServer({
        workspaceDir,
        cleanup,
        cleanupOnStop: false,
        proxy: upstream.baseUrl,
        record: true,
        timeoutMs: 20000
      });

      const mockedWhileRecord = await request(`${ server.baseUrl }/shared`);
      failures.push(...expectStatus(mockedWhileRecord.status, 200, 'mock while recording'));
      failures.push(...expectEqual(mockedWhileRecord.body.source, 'mock', 'mock body while recording'));

      const proxiedWhileRecord = await request(`${ server.baseUrl }/only-upstream`);
      failures.push(...expectStatus(proxiedWhileRecord.status, 200, 'proxied while recording'));
      failures.push(...expectEqual(proxiedWhileRecord.body.source, 'upstream', 'upstream body'));

      await server.stop();
      server = null;

      const afterFirst = listRecordingJson(recordingsRoot);
      if (afterFirst.some((name) => name.includes('shared'))) {
        failures.push('local mock route /shared should not create a recording while recording');
      }
      if (!afterFirst.some((name) => name.includes('only-upstream'))) {
        failures.push(`expected only-upstream recording, got: ${ afterFirst.join(', ') }`);
      }

      fs.unlinkSync(path.join(mocksDir, 'shared-mock.json'));

      server = await startMockServer({
        workspaceDir,
        cleanup,
        cleanupOnStop: false,
        proxy: upstream.baseUrl,
        record: true,
        timeoutMs: 20000
      });

      const sharedLive = await request(`${ server.baseUrl }/shared`);
      failures.push(...expectStatus(sharedLive.status, 200, 'record /shared from upstream'));
      failures.push(...expectEqual(sharedLive.body.source, 'upstream', 'shared upstream body'));

      await server.stop();
      server = null;

      if (!listRecordingJson(recordingsRoot).some((name) => name.includes('shared'))) {
        failures.push('expected /shared recording after upstream record session');
      }

      writeJson(path.join(mocksDir, 'shared-mock.json'), {
        shared: {
          GET: {
            nameResponse: 'mock',
            responses: [{ name: 'mock', statusCode: 200, body: { source: 'mock', label: 'shared' } }]
          }
        }
      });

      server = await startMockServer({
        workspaceDir,
        cleanup,
        cleanupOnStop: false,
        timeoutMs: 20000
      });

      if (!server.stdout.includes('Recording skipped (mock wins)')) {
        failures.push('expected collision warning "Recording skipped (mock wins)"');
      }

      const collisionDefault = await request(`${ server.baseUrl }/shared`);
      failures.push(...expectStatus(collisionDefault.status, 200, 'default load collision'));
      failures.push(...expectEqual(collisionDefault.body.source, 'mock', 'mock wins in default load'));

      await server.stop();
      server = null;

      server = await startMockServer({
        workspaceDir,
        cleanup,
        cleanupOnStop: false,
        recordingsOnly: true,
        timeoutMs: 20000
      });

      const collisionRecordingsOnly = await request(`${ server.baseUrl }/shared`);
      failures.push(...expectStatus(collisionRecordingsOnly.status, 200, 'recordings-only collision'));
      failures.push(...expectEqual(
        collisionRecordingsOnly.body.source,
        'upstream',
        'recording served with --recordings-only'
      ));

      await server.stop();
      server = null;

      fs.unlinkSync(path.join(mocksDir, 'shared-mock.json'));

      server = await startMockServer({
        workspaceDir,
        cleanup,
        cleanupOnStop: false,
        proxy: upstream.baseUrl,
        record: true,
        timeoutMs: 20000
      });

      upstream.state.version = 1;
      const v1 = await request(`${ server.baseUrl }/version`);
      failures.push(...expectEqual(v1.body.version, 1, 'version v1 live'));

      upstream.state.version = 2;
      const v2 = await request(`${ server.baseUrl }/version`);
      failures.push(...expectEqual(v2.body.version, 2, 'version v2 live re-record'));

      const a = await request(`${ server.baseUrl }/secure`, {
        headers: { Authorization: 'Bearer token-a' }
      });
      failures.push(...expectEqual(a.body.token, 'token-a', 'secure token-a'));

      const b = await request(`${ server.baseUrl }/secure`, {
        headers: { Authorization: 'Bearer token-b' }
      });
      failures.push(...expectEqual(b.body.token, 'token-b', 'secure token-b'));

      const q1 = await request(`${ server.baseUrl }/items?q=1`);
      failures.push(...expectEqual(q1.body.q, '1', 'items q=1'));
      const q2 = await request(`${ server.baseUrl }/items?q=2`);
      failures.push(...expectEqual(q2.body.q, '2', 'items q=2'));

      upstream.state.echoByBody.set(JSON.stringify({ id: 1 }), { echo: { id: 1 }, stamp: 'first' });
      const echo1 = await request(`${ server.baseUrl }/echo`, { method: 'POST', json: { id: 1 } });
      failures.push(...expectEqual(echo1.body.stamp, 'first', 'echo first stamp'));

      upstream.state.echoByBody.set(JSON.stringify({ id: 1 }), { echo: { id: 1 }, stamp: 'updated' });
      const echo1b = await request(`${ server.baseUrl }/echo`, { method: 'POST', json: { id: 1 } });
      failures.push(...expectEqual(echo1b.body.stamp, 'updated', 'echo re-record same body'));

      upstream.state.echoByBody.set(JSON.stringify({ id: 2 }), { echo: { id: 2 }, stamp: 'other' });
      const echo2 = await request(`${ server.baseUrl }/echo`, { method: 'POST', json: { id: 2 } });
      failures.push(...expectEqual(echo2.body.stamp, 'other', 'echo different body'));

      await server.stop();
      server = null;

      const versionFile = listRecordingJson(recordingsRoot).find((name) => name.includes('version'));
      if (!versionFile) {
        failures.push('expected version recording file');
      } else {
        const { responses } = readRecordingResponses(path.join(recordingsRoot, versionFile));
        if (responses.length !== 1) {
          failures.push(`version dedupe expected 1 response, got ${ responses.length }`);
        } else if (!responses[0].body || responses[0].body.version !== 2) {
          failures.push(`version re-record should keep latest body version=2, got ${ JSON.stringify(responses[0].body) }`);
        }
      }

      const secureFile = listRecordingJson(recordingsRoot).find((name) => name.includes('secure'));
      if (!secureFile) {
        failures.push('expected secure recording file');
      } else {
        const { responses } = readRecordingResponses(path.join(recordingsRoot, secureFile));
        if (responses.length !== 2) {
          failures.push(`secure auth variants expected 2 responses, got ${ responses.length }`);
        }
        const auths = responses.map((item) => item.match?.headers?.authorization).sort();
        if (
          !auths.includes('Bearer token-a')
          || !auths.includes('Bearer token-b')
        ) {
          failures.push(`secure responses should match both auth headers, got ${ JSON.stringify(auths) }`);
        }
      }

      const itemsFile = listRecordingJson(recordingsRoot).find((name) => name.includes('items'));
      if (!itemsFile) {
        failures.push('expected items recording file');
      } else {
        const { responses } = readRecordingResponses(path.join(recordingsRoot, itemsFile));
        if (responses.length !== 2) {
          failures.push(`items query variants expected 2 responses, got ${ responses.length }`);
        }
      }

      const echoFile = listRecordingJson(recordingsRoot).find((name) => name.includes('echo'));
      if (!echoFile) {
        failures.push('expected echo recording file');
      } else {
        const { responses } = readRecordingResponses(path.join(recordingsRoot, echoFile));
        if (responses.length !== 2) {
          failures.push(`echo body variants expected 2 responses (dedupe same body), got ${ responses.length }`);
        }
        const updated = responses.find((item) => item.match?.body?.id === 1);
        if (!updated || updated.body.stamp !== 'updated') {
          failures.push('echo id=1 should be overwritten with stamp=updated');
        }
      }

      server = await startMockServer({
        workspaceDir,
        cleanup,
        cleanupOnStop: false,
        recordingsOnly: true,
        timeoutMs: 20000
      });

      const replayVersion = await request(`${ server.baseUrl }/version`);
      failures.push(...expectEqual(replayVersion.body.version, 2, 'replay deduped version'));

      const replayA = await request(`${ server.baseUrl }/secure`, {
        headers: { Authorization: 'Bearer token-a' }
      });
      failures.push(...expectEqual(replayA.body.token, 'token-a', 'replay secure a'));

      const replayB = await request(`${ server.baseUrl }/secure`, {
        headers: { Authorization: 'Bearer token-b' }
      });
      failures.push(...expectEqual(replayB.body.token, 'token-b', 'replay secure b'));

      const replayQ1 = await request(`${ server.baseUrl }/items?q=1`);
      failures.push(...expectEqual(replayQ1.body.q, '1', 'replay items q=1'));
      const replayQ2 = await request(`${ server.baseUrl }/items?q=2`);
      failures.push(...expectEqual(replayQ2.body.q, '2', 'replay items q=2'));

      const replayEcho1 = await request(`${ server.baseUrl }/echo`, {
        method: 'POST',
        json: { id: 1 }
      });
      failures.push(...expectEqual(replayEcho1.body.stamp, 'updated', 'replay echo id=1'));

      const replayEcho2 = await request(`${ server.baseUrl }/echo`, {
        method: 'POST',
        json: { id: 2 }
      });
      failures.push(...expectEqual(replayEcho2.body.stamp, 'other', 'replay echo id=2'));

      await server.stop();
      server = null;
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
      name: 'runtime/record-replay-collision-dedupe',
      description: 'HTTP: mock vs recording collision and re-record / dedupe with local upstream',
      passed: failures.length === 0,
      failures,
      durationMs: Date.now() - startedAt,
      expectedOutcome: 'success'
    };
  }
};
