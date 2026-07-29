'use strict';

const path = require('path');
const fs = require('fs');
const { createWorkspace, startMockServer } = require('../../lib/server-harness');
const { expectStatus, expectEqual } = require('../../lib/http-assert');

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x01, 0x02]);
const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46]);
const PDF = Buffer.from('%PDF-1.4 mock');

const buildMultipart = (fields, files) => {
  const boundary = '----comboMatchBoundary';
  const chunks = [];

  for (const [name, value] of Object.entries(fields)) {
    chunks.push(
      `--${ boundary }\r\n`
      + `Content-Disposition: form-data; name="${ name }"\r\n\r\n`
      + `${ value }\r\n`
    );
  }

  for (const file of files) {
    chunks.push(
      `--${ boundary }\r\n`
      + `Content-Disposition: form-data; name="${ file.name }"; filename="${ file.filename }"\r\n`
      + `Content-Type: ${ file.contentType }\r\n\r\n`
    );
    chunks.push(file.body);
    chunks.push('\r\n');
  }

  chunks.push(`--${ boundary }--\r\n`);
  return {
    boundary,
    body: Buffer.concat(chunks.map((part) => (Buffer.isBuffer(part) ? part : Buffer.from(part))))
  };
};

module.exports = {
  name: 'runtime/request-match-combos',
  description: 'HTTP: request validation + match combos for json/form/multipart/text/raw',
  async run() {
    const startedAt = Date.now();
    const failures = [];
    const repoRoot = path.resolve(__dirname, '../../../..');
    const { workspaceDir, cleanup } = createWorkspace(null, { emptyMocksDir: true });
    const mocksDir = path.join(workspaceDir, 'mocks');
    fs.copyFileSync(
      path.join(repoRoot, 'mocks/47-request-match-combos.json'),
      path.join(mocksDir, '47-request-match-combos.json')
    );

    let server;

    try {
      server = await startMockServer({
        workspaceDir,
        cleanup,
        cleanupOnStop: false,
        timeoutMs: 20000
      });

      const base = server.baseUrl;

      // --- json: match.body + match.headers ---
      const jsonAdmin = await fetch(`${ base }/api/combo/json`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant': 'acme'
        },
        body: JSON.stringify({ email: 'a@b.com', role: 'admin' })
      });
      failures.push(...expectStatus(jsonAdmin.status, 200, 'json admin+headers status'));
      failures.push(...expectEqual(
        await jsonAdmin.json(),
        { matched: 'json-admin-acme' },
        'json admin+headers body'
      ));

      const jsonUser = await fetch(`${ base }/api/combo/json`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant': 'other'
        },
        body: JSON.stringify({ email: 'u@b.com', role: 'user' })
      });
      failures.push(...expectStatus(jsonUser.status, 200, 'json user status'));
      failures.push(...expectEqual(
        await jsonUser.json(),
        { matched: 'json-user' },
        'json user body'
      ));

      const jsonFallback = await fetch(`${ base }/api/combo/json`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant': 'zz'
        },
        body: JSON.stringify({ email: 'a@b.com', role: 'admin' })
      });
      failures.push(...expectStatus(jsonFallback.status, 200, 'json fallback status'));
      failures.push(...expectEqual(
        await jsonFallback.json(),
        { matched: 'json-fallback' },
        'json fallback body'
      ));

      const jsonInvalid = await fetch(`${ base }/api/combo/json`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant': 'acme'
        },
        body: JSON.stringify({ email: 'nope', role: 'admin' })
      });
      failures.push(...expectStatus(jsonInvalid.status, 400, 'json invalid status'));

      // --- form: match.body + match.query (coercion of number/boolean strings) ---
      const formPro = await fetch(`${ base }/api/combo/form?source=web`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'username=ada_lovelace&plan=pro&age=36&newsletter=true'
      });
      failures.push(...expectStatus(formPro.status, 200, 'form pro+query status'));
      failures.push(...expectEqual(
        await formPro.json(),
        { matched: 'form-pro-web' },
        'form pro+query body'
      ));

      const formFree = await fetch(`${ base }/api/combo/form?source=api`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'username=grace&plan=free&age=40&newsletter=false'
      });
      failures.push(...expectStatus(formFree.status, 200, 'form free status'));
      failures.push(...expectEqual(
        await formFree.json(),
        { matched: 'form-free' },
        'form free body'
      ));

      const formFallback = await fetch(`${ base }/api/combo/form?source=cli`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'username=alan&plan=pro&age=40&newsletter=false'
      });
      failures.push(...expectStatus(formFallback.status, 200, 'form fallback status'));
      failures.push(...expectEqual(
        await formFallback.json(),
        { matched: 'form-fallback' },
        'form fallback body'
      ));

      const formInvalid = await fetch(`${ base }/api/combo/form?source=web`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'username=A&plan=enterprise&age=0&newsletter=maybe'
      });
      const formInvalidBody = await formInvalid.json();
      failures.push(...expectStatus(formInvalid.status, 400, 'form invalid status'));
      failures.push(...expectEqual(
        Object.keys(formInvalidBody.errors || {}).sort(),
        ['age', 'newsletter', 'plan', 'username'].sort(),
        'form invalid map keys'
      ));

      const formAsMismatch = await fetch(`${ base }/api/combo/form?source=web`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'ada',
          plan: 'pro',
          age: 36,
          newsletter: true
        })
      });
      failures.push(...expectStatus(formAsMismatch.status, 400, 'form as mismatch status'));

      // --- multipart: match.multipart + match.headers ---
      const mpPng = buildMultipart(
        { title: 'logo' },
        [{ name: 'avatar', filename: 'a.png', contentType: 'image/png', body: PNG }]
      );
      const mpPngRes = await fetch(`${ base }/api/combo/multipart`, {
        method: 'POST',
        headers: {
          'Content-Type': `multipart/form-data; boundary=${ mpPng.boundary }`,
          'x-upload': 'avatar'
        },
        body: mpPng.body
      });
      failures.push(...expectStatus(mpPngRes.status, 201, 'multipart png+headers status'));
      failures.push(...expectEqual(
        await mpPngRes.json(),
        { matched: 'multipart-png-avatar' },
        'multipart png+headers body'
      ));

      const mpJpeg = buildMultipart(
        { title: 'shot' },
        [{ name: 'avatar', filename: 'b.jpg', contentType: 'image/jpeg', body: JPEG }]
      );
      const mpJpegRes = await fetch(`${ base }/api/combo/multipart`, {
        method: 'POST',
        headers: {
          'Content-Type': `multipart/form-data; boundary=${ mpJpeg.boundary }`,
          'x-upload': 'banner'
        },
        body: mpJpeg.body
      });
      failures.push(...expectStatus(mpJpegRes.status, 201, 'multipart jpeg status'));
      failures.push(...expectEqual(
        await mpJpegRes.json(),
        { matched: 'multipart-jpeg' },
        'multipart jpeg body'
      ));

      const mpFallback = buildMultipart(
        { title: 'other' },
        [{ name: 'avatar', filename: 'c.png', contentType: 'image/png', body: PNG }]
      );
      const mpFallbackRes = await fetch(`${ base }/api/combo/multipart`, {
        method: 'POST',
        headers: {
          'Content-Type': `multipart/form-data; boundary=${ mpFallback.boundary }`,
          'x-upload': 'banner'
        },
        body: mpFallback.body
      });
      failures.push(...expectStatus(mpFallbackRes.status, 201, 'multipart fallback status'));
      failures.push(...expectEqual(
        await mpFallbackRes.json(),
        { matched: 'multipart-fallback' },
        'multipart fallback body'
      ));

      const mpInvalid = buildMultipart(
        { title: 'x' },
        [{ name: 'avatar', filename: 'd.gif', contentType: 'image/gif', body: PNG }]
      );
      const mpInvalidRes = await fetch(`${ base }/api/combo/multipart`, {
        method: 'POST',
        headers: {
          'Content-Type': `multipart/form-data; boundary=${ mpInvalid.boundary }`,
          'x-upload': 'avatar'
        },
        body: mpInvalid.body
      });
      failures.push(...expectStatus(mpInvalidRes.status, 400, 'multipart invalid status'));

      // --- text: match.body string ---
      const textPing = await fetch(`${ base }/api/combo/text`, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: 'ping'
      });
      failures.push(...expectStatus(textPing.status, 200, 'text ping status'));
      failures.push(...expectEqual(
        await textPing.json(),
        { matched: 'text-ping' },
        'text ping body'
      ));

      const textPong = await fetch(`${ base }/api/combo/text`, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: 'pong'
      });
      failures.push(...expectStatus(textPong.status, 200, 'text pong status'));
      failures.push(...expectEqual(
        await textPong.json(),
        { matched: 'text-pong' },
        'text pong body'
      ));

      const textFallback = await fetch(`${ base }/api/combo/text`, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: 'hello'
      });
      failures.push(...expectStatus(textFallback.status, 200, 'text fallback status'));
      failures.push(...expectEqual(
        await textFallback.json(),
        { matched: 'text-fallback' },
        'text fallback body'
      ));

      const textInvalid = await fetch(`${ base }/api/combo/text`, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: 'NO'
      });
      failures.push(...expectStatus(textInvalid.status, 400, 'text invalid status'));

      // --- raw: match.body mime/size view + match.headers ---
      const rawPng = await fetch(`${ base }/api/combo/raw`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'image/png',
          'x-bin': 'img'
        },
        body: PNG
      });
      failures.push(...expectStatus(rawPng.status, 200, 'raw png+headers status'));
      failures.push(...expectEqual(
        await rawPng.json(),
        { matched: 'raw-png-img' },
        'raw png+headers body'
      ));

      const rawPdf = await fetch(`${ base }/api/combo/raw`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/pdf',
          'x-bin': 'doc'
        },
        body: PDF
      });
      failures.push(...expectStatus(rawPdf.status, 200, 'raw pdf status'));
      failures.push(...expectEqual(
        await rawPdf.json(),
        { matched: 'raw-pdf' },
        'raw pdf body'
      ));

      const rawFallback = await fetch(`${ base }/api/combo/raw`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'image/jpeg',
          'x-bin': 'other'
        },
        body: JPEG
      });
      failures.push(...expectStatus(rawFallback.status, 200, 'raw fallback status'));
      failures.push(...expectEqual(
        await rawFallback.json(),
        { matched: 'raw-fallback' },
        'raw fallback body'
      ));

      const rawInvalid = await fetch(`${ base }/api/combo/raw`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'text/plain',
          'x-bin': 'img'
        },
        body: Buffer.from('abcd')
      });
      failures.push(...expectStatus(rawInvalid.status, 415, 'raw invalid status'));

      // --- json + query: match.body + match.query ---
      const dryCreate = await fetch(`${ base }/api/combo/json-query?dry=true`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create' })
      });
      failures.push(...expectStatus(dryCreate.status, 200, 'json-query dry-create status'));
      failures.push(...expectEqual(
        await dryCreate.json(),
        { matched: 'json-dry-create' },
        'json-query dry-create body'
      ));

      const update = await fetch(`${ base }/api/combo/json-query?dry=false`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update' })
      });
      failures.push(...expectStatus(update.status, 200, 'json-query update status'));
      failures.push(...expectEqual(
        await update.json(),
        { matched: 'json-update' },
        'json-query update body'
      ));

      const queryFallback = await fetch(`${ base }/api/combo/json-query?dry=false`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create' })
      });
      failures.push(...expectStatus(queryFallback.status, 200, 'json-query fallback status'));
      failures.push(...expectEqual(
        await queryFallback.json(),
        { matched: 'json-query-fallback' },
        'json-query fallback body'
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
      name: 'runtime/request-match-combos',
      description: 'HTTP: request validation + match combos for json/form/multipart/text/raw',
      passed: failures.length === 0,
      failures,
      durationMs: Date.now() - startedAt,
      expectedOutcome: 'success'
    };
  }
};
