'use strict';

const path = require('path');
const fs = require('fs');
const { createWorkspace, startMockServer } = require('../../lib/server-harness');
const { expectStatus, expectEqual } = require('../../lib/http-assert');

module.exports = {
  name: 'runtime/response-encoding',
  description: 'HTTP: encoding file/base64 happy path + missing/escape errors',
  async run() {
    const startedAt = Date.now();
    const failures = [];
    const repoRoot = path.resolve(__dirname, '../../../..');
    const { workspaceDir, cleanup } = createWorkspace(null, { emptyMocksDir: true });
    const mocksDir = path.join(workspaceDir, 'mocks');
    const assetsDir = path.join(mocksDir, 'assets');
    fs.mkdirSync(assetsDir, { recursive: true });

    const pngBytes = fs.readFileSync(path.join(repoRoot, 'mocks/assets/sample.png'));
    fs.writeFileSync(path.join(assetsDir, 'sample.png'), pngBytes);
    fs.copyFileSync(
      path.join(repoRoot, 'mocks/41-response-encoding.json'),
      path.join(mocksDir, '41-response-encoding.json')
    );

    let server;

    try {
      server = await startMockServer({
        workspaceDir,
        cleanup,
        cleanupOnStop: false,
        timeoutMs: 20000
      });

      const fileRes = await fetch(`${ server.baseUrl }/api/encoding/file`);
      const fileBuf = Buffer.from(await fileRes.arrayBuffer());
      failures.push(...expectStatus(fileRes.status, 200, 'encoding file status'));
      if (!fileBuf.equals(pngBytes)) {
        failures.push('encoding file bytes mismatch');
      }
      if (!String(fileRes.headers.get('content-type') || '').includes('image/png')) {
        failures.push(`encoding file content-type: ${ fileRes.headers.get('content-type') }`);
      }

      const b64Res = await fetch(`${ server.baseUrl }/api/encoding/base64`);
      const b64Buf = Buffer.from(await b64Res.arrayBuffer());
      failures.push(...expectStatus(b64Res.status, 200, 'encoding base64 status'));
      if (b64Buf.toString('utf8') !== 'hello') {
        failures.push(`encoding base64 body: ${ b64Buf.toString('utf8') }`);
      }

      const missing = await fetch(`${ server.baseUrl }/api/encoding/missing`);
      const missingJson = await missing.json();
      failures.push(...expectStatus(missing.status, 500, 'encoding missing file status'));
      if (!String(missing.headers.get('content-type') || '').includes('application/json')) {
        failures.push(`encoding missing content-type: ${ missing.headers.get('content-type') }`);
      }
      if (!missingJson || typeof missingJson.message !== 'string' || missingJson.message.length === 0) {
        failures.push(`encoding missing message: ${ JSON.stringify(missingJson) }`);
      } else if (
        !/ENOENT|no such file|does-not-exist/i.test(missingJson.message)
      ) {
        failures.push(`encoding missing unexpected message: ${ missingJson.message }`);
      }

      const escape = await fetch(`${ server.baseUrl }/api/encoding/escape`);
      const escapeJson = await escape.json();
      failures.push(...expectStatus(escape.status, 500, 'encoding escape status'));
      if (!String(escape.headers.get('content-type') || '').includes('application/json')) {
        failures.push(`encoding escape content-type: ${ escape.headers.get('content-type') }`);
      }
      failures.push(...expectEqual(
        escapeJson.message,
        'Response body file path escapes mocks directory: ../outside.png',
        'encoding escape message'
      ));
    } catch (error) {
      failures.push(error instanceof Error ? error.message : String(error));
    } finally {
      if (server) {
        await server.stop();
      }
      cleanup();
    }

    return {
      name: 'runtime/response-encoding',
      description: 'HTTP: encoding file/base64 happy path + missing/escape errors',
      passed: failures.length === 0,
      failures,
      durationMs: Date.now() - startedAt,
      expectedOutcome: 'success'
    };
  }
};
