'use strict';

const path = require('path');
const fs = require('fs');
const { createWorkspace, startMockServer } = require('../../lib/server-harness');
const { expectStatus, expectEqual } = require('../../lib/http-assert');

const PNG_MIN = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const PNG_OK = Buffer.concat([PNG_MIN, Buffer.alloc(8, 1)]);
const PNG_BIG = Buffer.concat([PNG_MIN, Buffer.alloc(80, 2)]);
const JPEG_OK = Buffer.concat([
  Buffer.from([0xff, 0xd8, 0xff, 0xe0]),
  Buffer.alloc(12, 3)
]);
const PDF_OK = Buffer.from('%PDF-1.4 mock');

const buildMultipart = (fields, files) => {
  const boundary = '----bodyMatrixBoundary';
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
      + `Content-Disposition: form-data; name="${ file.name }"`
      + (file.filename !== undefined ? `; filename="${ file.filename }"` : '')
      + `\r\nContent-Type: ${ file.contentType }\r\n\r\n`
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

const issuePaths = (body) => {
  if (!body || !Array.isArray(body.errors)) {
    return [];
  }
  return body.errors.map((item) => item.path).sort();
};

const issueRules = (body) => {
  if (!body || !Array.isArray(body.errors)) {
    return [];
  }
  return body.errors.map((item) => `${ item.path }:${ item.rule }`).sort();
};

module.exports = {
  name: 'runtime/request-body-matrix',
  description: 'HTTP: every as/type + combined validation rules for json/form/multipart/raw/text',
  async run() {
    const startedAt = Date.now();
    const failures = [];
    const repoRoot = path.resolve(__dirname, '../../../..');
    const { workspaceDir, cleanup } = createWorkspace(null, { emptyMocksDir: true });
    const mocksDir = path.join(workspaceDir, 'mocks');
    fs.copyFileSync(
      path.join(repoRoot, 'mocks/43-request-body-matrix.json'),
      path.join(mocksDir, '43-request-body-matrix.json')
    );

    let server;

    const validJson = {
      email: 'user@example.com',
      code: 'ABC',
      age: 30,
      active: true,
      role: 'user',
      profile: { city: 'Madrid', zip: '28001' },
      tags: ['a', 'b']
    };

    try {
      server = await startMockServer({
        workspaceDir,
        cleanup,
        cleanupOnStop: false,
        timeoutMs: 30000
      });

      const base = server.baseUrl;

      // --- json: happy + headers ---
      const jsonOk = await fetch(`${ base }/api/matrix/json`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-client': 'web'
        },
        body: JSON.stringify(validJson)
      });
      failures.push(...expectStatus(jsonOk.status, 200, 'json ok'));
      failures.push(...expectEqual(await jsonOk.json(), { mode: 'json' }, 'json body'));

      // --- json: combined field failures ---
      const jsonBad = await fetch(`${ base }/api/matrix/json`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-client': 'w'
        },
        body: JSON.stringify({
          email: 'not-an-email',
          code: 'ab',
          age: 10,
          active: 'yes',
          role: 'guest',
          profile: { city: 'A', zip: '12' },
          tags: []
        })
      });
      const jsonBadBody = await jsonBad.json();
      failures.push(...expectStatus(jsonBad.status, 400, 'json combined fail'));
      failures.push(...expectEqual(
        issueRules(jsonBadBody),
        [
          'active:type',
          'age:min',
          'code:pattern',
          'email:format',
          'profile.city:minLength',
          'profile.zip:pattern',
          'role:enum',
          'tags:minItems',
          'x-client:minLength'
        ].sort(),
        'json combined rules'
      ));
      const emailIssue = jsonBadBody.errors.find((item) => item.path === 'email');
      if (!emailIssue || emailIssue.message !== 'bad email') {
        failures.push(`json custom message: ${ emailIssue && emailIssue.message }`);
      }
      const codeIssue = jsonBadBody.errors.find((item) => item.path === 'code');
      if (!codeIssue || codeIssue.message !== 'code pattern failed') {
        failures.push(`json messages.pattern: ${ codeIssue && codeIssue.message }`);
      }

      // --- json: maxLength / maxItems / max ---
      const jsonMax = await fetch(`${ base }/api/matrix/json`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-client': 'cli'
        },
        body: JSON.stringify({
          ...validJson,
          email: `${ 'a'.repeat(60) }@x.com`,
          age: 121,
          tags: ['a', 'b', 'c', 'd']
        })
      });
      const jsonMaxBody = await jsonMax.json();
      failures.push(...expectStatus(jsonMax.status, 400, 'json max bounds'));
      failures.push(...expectEqual(
        issueRules(jsonMaxBody),
        ['age:max', 'email:maxLength', 'tags:maxItems'].sort(),
        'json max rules'
      ));

      // --- json auto (no as) ---
      const autoOk = await fetch(`${ base }/api/matrix/json-auto`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Ada' })
      });
      failures.push(...expectStatus(autoOk.status, 200, 'json-auto ok'));

      const autoBad = await fetch(`${ base }/api/matrix/json-auto`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'A' })
      });
      failures.push(...expectStatus(autoBad.status, 400, 'json-auto minLength'));

      // --- as mismatch json endpoint with form ---
      const asMismatch = await fetch(`${ base }/api/matrix/as-json-only`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'ok=true'
      });
      const asMismatchBody = await asMismatch.json();
      failures.push(...expectStatus(asMismatch.status, 400, 'as json vs form'));
      failures.push(...expectEqual(
        issuePaths(asMismatchBody),
        ['content-type'],
        'as mismatch path'
      ));

      // --- form happy ---
      const formOk = await fetch(`${ base }/api/matrix/form`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'username=ada_lovelace&age=36&newsletter=true&plan=pro'
      });
      failures.push(...expectStatus(formOk.status, 200, 'form ok'));
      failures.push(...expectEqual(await formOk.json(), { mode: 'form' }, 'form body'));

      // --- form combined failures ---
      const formBad = await fetch(`${ base }/api/matrix/form`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'username=A&age=0&newsletter=maybe&plan=enterprise'
      });
      const formBadBody = await formBad.json();
      failures.push(...expectStatus(formBad.status, 400, 'form combined fail'));
      failures.push(...expectEqual(
        Object.keys(formBadBody.errors || {}).sort(),
        ['age', 'newsletter', 'plan', 'username'].sort(),
        'form map keys'
      ));

      // --- form as mismatch ---
      const formAsBad = await fetch(`${ base }/api/matrix/form`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'ada', age: 1, newsletter: true, plan: 'free' })
      });
      failures.push(...expectStatus(formAsBad.status, 400, 'form as mismatch'));

      // --- multipart happy (png + pdf) ---
      const mpOk = buildMultipart(
        { title: 'Avatar', count: '2' },
        [
          {
            name: 'avatar',
            filename: 'a.png',
            contentType: 'image/png',
            body: PNG_OK
          },
          {
            name: 'docs',
            filename: 'a.pdf',
            contentType: 'application/pdf',
            body: PDF_OK
          }
        ]
      );
      const mpOkRes = await fetch(`${ base }/api/matrix/multipart`, {
        method: 'POST',
        headers: { 'Content-Type': `multipart/form-data; boundary=${ mpOk.boundary }` },
        body: mpOk.body
      });
      failures.push(...expectStatus(mpOkRes.status, 201, 'multipart ok'));
      failures.push(...expectEqual(await mpOkRes.json(), { mode: 'multipart' }, 'multipart body'));

      // --- multipart jpeg allowed by format list ---
      const mpJpeg = buildMultipart(
        { title: 'Pic', count: '1' },
        [
          {
            name: 'avatar',
            filename: 'a.jpg',
            contentType: 'image/jpeg',
            body: JPEG_OK
          },
          {
            name: 'docs',
            filename: 'b.pdf',
            contentType: 'application/pdf',
            body: PDF_OK
          },
          {
            name: 'banner',
            filename: 'b.webp',
            contentType: 'image/webp',
            body: Buffer.concat([PNG_MIN, Buffer.alloc(4, 9)])
          }
        ]
      );
      const mpJpegRes = await fetch(`${ base }/api/matrix/multipart`, {
        method: 'POST',
        headers: { 'Content-Type': `multipart/form-data; boundary=${ mpJpeg.boundary }` },
        body: mpJpeg.body
      });
      failures.push(...expectStatus(mpJpegRes.status, 201, 'multipart jpeg+image/* ok'));

      // --- multipart combined file+field failures ---
      const mpBad = buildMultipart(
        { title: 'x', count: '99' },
        [
          {
            name: 'avatar',
            filename: 'a.gif',
            contentType: 'image/gif',
            body: PNG_BIG
          }
        ]
      );
      const mpBadRes = await fetch(`${ base }/api/matrix/multipart`, {
        method: 'POST',
        headers: { 'Content-Type': `multipart/form-data; boundary=${ mpBad.boundary }` },
        body: mpBad.body
      });
      const mpBadBody = await mpBadRes.json();
      failures.push(...expectStatus(mpBadRes.status, 400, 'multipart combined fail'));
      failures.push(...expectEqual(
        issueRules(mpBadBody).filter((rule) => !rule.startsWith('avatar:')),
        ['count:max', 'docs:required', 'title:minLength'].sort(),
        'multipart field rules'
      ));
      const avatarRules = issueRules(mpBadBody).filter((rule) => rule.startsWith('avatar:'));
      if (!avatarRules.includes('avatar:format') && !avatarRules.includes('avatar:maxSize')) {
        failures.push(`multipart avatar rules missing: ${ avatarRules.join(',') }`);
      }
      const avatarFormat = (mpBadBody.errors || []).find(
        (item) => item.path === 'avatar' && item.rule === 'format'
      );
      if (avatarFormat && avatarFormat.message !== 'avatar mime failed') {
        failures.push(`multipart messages.format: ${ avatarFormat.message }`);
      }

      // --- multipart requireFilename + minSize ---
      const mpTiny = buildMultipart(
        { title: 'ok', count: '1' },
        [
          {
            name: 'avatar',
            filename: ' ',
            contentType: 'image/png',
            body: Buffer.from([1, 2])
          },
          {
            name: 'docs',
            filename: 'a.pdf',
            contentType: 'application/pdf',
            body: PDF_OK
          }
        ]
      );
      const mpTinyRes = await fetch(`${ base }/api/matrix/multipart`, {
        method: 'POST',
        headers: { 'Content-Type': `multipart/form-data; boundary=${ mpTiny.boundary }` },
        body: mpTiny.body
      });
      const mpTinyBody = await mpTinyRes.json();
      failures.push(...expectStatus(mpTinyRes.status, 400, 'multipart filename/minSize'));
      const tinyRules = issueRules(mpTinyBody);
      if (!tinyRules.includes('avatar:requireFilename') && !tinyRules.includes('avatar:minSize')) {
        failures.push(`multipart tiny rules: ${ tinyRules.join(',') }`);
      }

      // --- multipart docs maxItems ---
      const mpDocs = buildMultipart(
        { title: 'docs', count: '1' },
        [
          {
            name: 'avatar',
            filename: 'a.png',
            contentType: 'image/png',
            body: PNG_OK
          },
          {
            name: 'docs',
            filename: '1.pdf',
            contentType: 'application/pdf',
            body: PDF_OK
          },
          {
            name: 'docs',
            filename: '2.pdf',
            contentType: 'application/pdf',
            body: PDF_OK
          },
          {
            name: 'docs',
            filename: '3.pdf',
            contentType: 'application/pdf',
            body: PDF_OK
          }
        ]
      );
      const mpDocsRes = await fetch(`${ base }/api/matrix/multipart`, {
        method: 'POST',
        headers: { 'Content-Type': `multipart/form-data; boundary=${ mpDocs.boundary }` },
        body: mpDocs.body
      });
      const mpDocsBody = await mpDocsRes.json();
      failures.push(...expectStatus(mpDocsRes.status, 400, 'multipart docs maxItems'));
      failures.push(...expectEqual(
        issueRules(mpDocsBody),
        ['docs:maxItems'],
        'multipart docs maxItems rule'
      ));

      // --- raw image/* ---
      const rawOk = await fetch(`${ base }/api/matrix/raw`, {
        method: 'PUT',
        headers: { 'Content-Type': 'image/png' },
        body: PNG_OK
      });
      failures.push(...expectStatus(rawOk.status, 200, 'raw image ok'));

      const rawSmall = await fetch(`${ base }/api/matrix/raw`, {
        method: 'PUT',
        headers: { 'Content-Type': 'image/png' },
        body: Buffer.from([1, 2, 3])
      });
      failures.push(...expectStatus(rawSmall.status, 415, 'raw minSize'));

      const rawAsBad = await fetch(`${ base }/api/matrix/raw`, {
        method: 'PUT',
        headers: { 'Content-Type': 'text/plain' },
        body: 'not-image'
      });
      failures.push(...expectStatus(rawAsBad.status, 415, 'raw as mismatch'));

      // --- raw pdf ---
      const rawPdfOk = await fetch(`${ base }/api/matrix/raw-pdf`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/pdf' },
        body: PDF_OK
      });
      failures.push(...expectStatus(rawPdfOk.status, 200, 'raw pdf ok'));

      const rawPdfBad = await fetch(`${ base }/api/matrix/raw-pdf`, {
        method: 'PUT',
        headers: { 'Content-Type': 'image/png' },
        body: PNG_OK
      });
      failures.push(...expectStatus(rawPdfBad.status, 415, 'raw pdf format fail'));

      // --- text ---
      const textOk = await fetch(`${ base }/api/matrix/text`, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: 'hello'
      });
      failures.push(...expectStatus(textOk.status, 200, 'text ok'));

      const textShort = await fetch(`${ base }/api/matrix/text`, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: 'hi'
      });
      const textShortBody = await textShort.json();
      failures.push(...expectStatus(textShort.status, 400, 'text minLength'));
      const textShortIssue = (textShortBody.errors || [])[0];
      if (!textShortIssue || textShortIssue.message !== 'text too short') {
        failures.push(`text messages.minLength: ${ textShortIssue && textShortIssue.message }`);
      }

      const textPattern = await fetch(`${ base }/api/matrix/text`, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: 'Hello'
      });
      const textPatternBody = await textPattern.json();
      failures.push(...expectStatus(textPattern.status, 400, 'text pattern'));
      const textPatternIssue = (textPatternBody.errors || [])[0];
      if (!textPatternIssue || textPatternIssue.message !== 'text must be lowercase letters') {
        failures.push(`text messages.pattern: ${ textPatternIssue && textPatternIssue.message }`);
      }

      const textAsBad = await fetch(`${ base }/api/matrix/text`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify('hello')
      });
      failures.push(...expectStatus(textAsBad.status, 400, 'text as mismatch'));
    } catch (error) {
      failures.push(error instanceof Error ? error.message : String(error));
    } finally {
      if (server) {
        await server.stop();
      }
      cleanup();
    }

    return {
      name: 'runtime/request-body-matrix',
      description: 'HTTP: every as/type + combined validation rules for json/form/multipart/raw/text',
      passed: failures.length === 0,
      failures,
      durationMs: Date.now() - startedAt,
      expectedOutcome: 'success'
    };
  }
};
