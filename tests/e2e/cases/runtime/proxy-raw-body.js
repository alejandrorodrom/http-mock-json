'use strict';

const fs = require('fs');
const path = require('path');
const http = require('http');
const { createWorkspace, startMockServer } = require('../../lib/server-harness');
const { expectStatus } = require('../../lib/http-assert');

const writeJson = (filePath, value) => {
  fs.writeFileSync(filePath, `${ JSON.stringify(value, null, 2) }\n`, 'utf8');
};

const readBody = (req) => new Promise((resolve, reject) => {
  const chunks = [];
  req.on('data', (chunk) => chunks.push(chunk));
  req.on('end', () => resolve(Buffer.concat(chunks)));
  req.on('error', reject);
});

const startEchoUpstream = () => new Promise((resolve, reject) => {
  const server = http.createServer(async (req, res) => {
    try {
      const body = await readBody(req);
      res.writeHead(200, {
        'Content-Type': 'application/json',
        'X-Echo-Content-Type': req.headers['content-type'] || ''
      });
      res.end(JSON.stringify({
        method: req.method,
        url: req.url,
        contentType: req.headers['content-type'] || null,
        byteLength: body.length,
        bodyBase64: body.toString('base64')
      }));
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        message: error instanceof Error ? error.message : String(error)
      }));
    }
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
  name: 'runtime/proxy-raw-body',
  description: 'HTTP: proxy forwards multipart and binary rawBody bytes unchanged',
  async run() {
    const startedAt = Date.now();
    const failures = [];
    const upstream = await startEchoUpstream();
    const { workspaceDir, cleanup } = createWorkspace(null, { emptyMocksDir: true });
    const mocksDir = path.join(workspaceDir, 'mocks');

    writeJson(path.join(mocksDir, 'proxy-raw.json'), {
      'api/local': {
        GET: {
          nameResponse: 'ok',
          responses: [
            { name: 'ok', statusCode: 200, body: { local: true } }
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
        timeoutMs: 20000,
        proxy: upstream.baseUrl
      });

      const pngBytes = Buffer.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d
      ]);
      const pngResponse = await fetch(`${ server.baseUrl }/api/upload-bin`, {
        method: 'PUT',
        headers: { 'Content-Type': 'image/png' },
        body: pngBytes
      });
      const pngJson = await pngResponse.json();
      failures.push(...expectStatus(pngResponse.status, 200, 'binary proxy status'));
      if (pngJson.byteLength !== pngBytes.length) {
        failures.push(
          `binary byteLength: expected ${ pngBytes.length }, received ${ pngJson.byteLength }`
        );
      }
      if (pngJson.bodyBase64 !== pngBytes.toString('base64')) {
        failures.push('binary body bytes were altered by proxy');
      }
      if (!String(pngJson.contentType || '').includes('image/png')) {
        failures.push(`binary content-type echo missing image/png: ${ pngJson.contentType }`);
      }

      const boundary = '----httpMockJsonBoundary';
      const multipartBody = Buffer.from(
        [
          `--${ boundary }`,
          'Content-Disposition: form-data; name="title"',
          '',
          'hello',
          `--${ boundary }`,
          'Content-Disposition: form-data; name="file"; filename="a.png"',
          'Content-Type: image/png',
          '',
          ''
        ].join('\r\n') + 'PNGDATA\r\n' + `--${ boundary }--\r\n`
      );
      const multipartResponse = await fetch(`${ server.baseUrl }/api/upload-form`, {
        method: 'POST',
        headers: {
          'Content-Type': `multipart/form-data; boundary=${ boundary }`
        },
        body: multipartBody
      });
      const multipartJson = await multipartResponse.json();
      failures.push(...expectStatus(multipartResponse.status, 200, 'multipart proxy status'));
      if (multipartJson.byteLength !== multipartBody.length) {
        failures.push(
          `multipart byteLength: expected ${ multipartBody.length }, received ${ multipartJson.byteLength }`
        );
      }
      if (multipartJson.bodyBase64 !== multipartBody.toString('base64')) {
        failures.push('multipart body bytes were altered by proxy');
      }

      const local = await fetch(`${ server.baseUrl }/api/local`);
      const localJson = await local.json();
      failures.push(...expectStatus(local.status, 200, 'local mock still works'));
      if (!localJson || localJson.local !== true) {
        failures.push('local mock body mismatch');
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
      name: 'runtime/proxy-raw-body',
      description: 'HTTP: proxy forwards multipart and binary rawBody bytes unchanged',
      passed: failures.length === 0,
      failures,
      durationMs: Date.now() - startedAt,
      expectedOutcome: 'success'
    };
  }
};
