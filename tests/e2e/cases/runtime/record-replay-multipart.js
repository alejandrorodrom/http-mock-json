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

    if (url.pathname === '/upload' && req.method === 'POST') {
      const chunks = [];
      req.on('data', (chunk) => chunks.push(chunk));
      req.on('end', () => {
        const raw = Buffer.concat(chunks).toString('utf8');
        const filename = (/filename="([^"]+)"/.exec(raw) || [])[1] || null;
        const label = (/name="label"\r\n\r\n([^\r\n]*)/.exec(raw) || [])[1] || null;
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ label, filename, ok: true }));
      });
      return;
    }

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'missing' }));
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

const postUpload = (baseUrl, { label, filename, content }) => {
  const form = new FormData();
  form.append('label', label);
  form.append(
    'file',
    new Blob([content], { type: 'text/plain' }),
    filename
  );
  return request(`${ baseUrl }/upload`, {
    method: 'POST',
    body: form,
    as: 'json'
  });
};

module.exports = {
  name: 'runtime/record-replay-multipart',
  description: 'HTTP: record match.multipart distinguishes uploads on replay',
  async run() {
    const startedAt = Date.now();
    const failures = [];
    const upstream = await startUpstream();
    const { workspaceDir, cleanup } = createWorkspace(null, { emptyMocksDir: true });
    const mocksDir = path.join(workspaceDir, 'mocks');
    const recordingsRoot = path.join(mocksDir, '.recordings');

    let server = null;

    try {
      writeJson(path.join(mocksDir, 'health.json'), {
        health: {
          GET: {
            nameResponse: 'ok',
            responses: [{ name: 'ok', statusCode: 200, body: { ok: true } }]
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

      const liveA = await postUpload(server.baseUrl, {
        label: 'alpha',
        filename: 'note-a.txt',
        content: 'content-a'
      });
      failures.push(...expectStatus(liveA.status, 200, 'live upload A'));
      failures.push(...expectEqual(liveA.body.filename, 'note-a.txt', 'live A filename'));
      failures.push(...expectEqual(liveA.body.label, 'alpha', 'live A label'));

      const liveB = await postUpload(server.baseUrl, {
        label: 'beta',
        filename: 'note-b.txt',
        content: 'content-b'
      });
      failures.push(...expectStatus(liveB.status, 200, 'live upload B'));
      failures.push(...expectEqual(liveB.body.filename, 'note-b.txt', 'live B filename'));
      failures.push(...expectEqual(liveB.body.label, 'beta', 'live B label'));

      await server.stop();
      server = null;

      const uploadFile = fs.existsSync(recordingsRoot)
        ? fs.readdirSync(recordingsRoot).find((name) => name.includes('upload') && name.endsWith('.json'))
        : null;

      if (!uploadFile) {
        failures.push('expected upload recording JSON under .recordings/');
      } else {
        const data = JSON.parse(
          fs.readFileSync(path.join(recordingsRoot, uploadFile), 'utf8')
        );
        const endpointKey = Object.keys(data)[0];
        const method = data[endpointKey]?.POST;
        const responses = method?.responses || [];

        if (responses.length !== 2) {
          failures.push(`expected 2 multipart recordings, got ${ responses.length }`);
        }

        for (const response of responses) {
          if (!response.match?.multipart) {
            failures.push(`response ${ response.name } missing match.multipart`);
            continue;
          }
          if (response.match.multipart.label === undefined) {
            failures.push(`response ${ response.name } missing multipart.label`);
          }
          if (!response.match.multipart.file || typeof response.match.multipart.file !== 'object') {
            failures.push(`response ${ response.name } missing multipart.file metadata`);
          }
        }

        const names = responses.map((item) => item.match?.multipart?.file?.filename).sort();
        if (names[0] !== 'note-a.txt' || names[1] !== 'note-b.txt') {
          failures.push(`expected filenames note-a/note-b in match, got ${ JSON.stringify(names) }`);
        }
      }

      server = await startMockServer({
        workspaceDir,
        cleanup,
        cleanupOnStop: false,
        recordingsOnly: true,
        timeoutMs: 20000
      });

      const replayA = await postUpload(server.baseUrl, {
        label: 'alpha',
        filename: 'note-a.txt',
        content: 'content-a'
      });
      failures.push(...expectStatus(replayA.status, 200, 'replay upload A'));
      failures.push(...expectEqual(replayA.body.filename, 'note-a.txt', 'replay A filename'));
      failures.push(...expectEqual(replayA.body.label, 'alpha', 'replay A label'));

      const replayB = await postUpload(server.baseUrl, {
        label: 'beta',
        filename: 'note-b.txt',
        content: 'content-b'
      });
      failures.push(...expectStatus(replayB.status, 200, 'replay upload B'));
      failures.push(...expectEqual(replayB.body.filename, 'note-b.txt', 'replay B filename'));
      failures.push(...expectEqual(replayB.body.label, 'beta', 'replay B label'));

      const replayAMeta = await postUpload(server.baseUrl, {
        label: 'alpha',
        filename: 'note-a.txt',
        content: 'different-bytes-same-meta'
      });
      failures.push(...expectEqual(replayAMeta.body.label, 'alpha', 'replay matches file metadata not bytes'));

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
      name: 'runtime/record-replay-multipart',
      description: 'HTTP: record match.multipart distinguishes uploads on replay',
      passed: failures.length === 0,
      failures,
      durationMs: Date.now() - startedAt,
      expectedOutcome: 'success'
    };
  }
};
