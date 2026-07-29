'use strict';

const path = require('path');
const fs = require('fs');
const { createWorkspace, startMockServer } = require('../../lib/server-harness');
const { expectStatus, expectEqual } = require('../../lib/http-assert');

const PNG = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
  0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52
]);
const PDF = Buffer.from('%PDF-1.4 mock report');

const buildMultipart = (fields, files) => {
  const boundary = '----ticketAttachments';
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
  name: 'runtime/ticket-attachments',
  description: 'HTTP: ticket create + multi-file upload + encoding downloads',
  async run() {
    const startedAt = Date.now();
    const failures = [];
    const repoRoot = path.resolve(__dirname, '../../../..');
    const { workspaceDir, cleanup } = createWorkspace(null, { emptyMocksDir: true });
    const mocksDir = path.join(workspaceDir, 'mocks');
    const assetsDir = path.join(mocksDir, 'assets');
    fs.mkdirSync(assetsDir, { recursive: true });
    fs.copyFileSync(
      path.join(repoRoot, 'mocks/assets/sample.png'),
      path.join(assetsDir, 'sample.png')
    );
    fs.copyFileSync(
      path.join(repoRoot, 'mocks/45-ticket-attachments.json'),
      path.join(mocksDir, '45-ticket-attachments.json')
    );

    let server;

    try {
      server = await startMockServer({
        workspaceDir,
        cleanup,
        cleanupOnStop: false,
        timeoutMs: 25000
      });

      const base = server.baseUrl;
      const samplePng = fs.readFileSync(path.join(assetsDir, 'sample.png'));

      const created = await fetch(`${ base }/api/tickets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant': 'acme'
        },
        body: JSON.stringify({
          subject: 'Cannot login on mobile',
          channel: 'chat',
          priority: 'high'
        })
      });
      failures.push(...expectStatus(created.status, 201, 'ticket create'));

      const missingTenant = await fetch(`${ base }/api/tickets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: 'No tenant header',
          channel: 'email'
        })
      });
      failures.push(...expectStatus(missingTenant.status, 422, 'ticket missing tenant'));

      const upload = buildMultipart(
        { note: 'from ios' },
        [
          {
            name: 'screenshots',
            filename: 'a.png',
            contentType: 'image/png',
            body: PNG
          },
          {
            name: 'screenshots',
            filename: 'b.png',
            contentType: 'image/png',
            body: PNG
          },
          {
            name: 'report',
            filename: 'report.pdf',
            contentType: 'application/pdf',
            body: PDF
          }
        ]
      );
      const uploaded = await fetch(`${ base }/api/tickets/tkt_1/attachments`, {
        method: 'POST',
        headers: {
          'Content-Type': `multipart/form-data; boundary=${ upload.boundary }`,
          'x-tenant': 'acme'
        },
        body: upload.body
      });
      const uploadedJson = await uploaded.json();
      failures.push(...expectStatus(uploaded.status, 201, 'attachments upload'));
      failures.push(...expectEqual(
        uploadedJson.files[0].url,
        '/api/tickets/tkt_1/attachments/att_img',
        'attachment url'
      ));

      const noFiles = buildMultipart({ note: 'empty' }, []);
      const invalid = await fetch(`${ base }/api/tickets/tkt_1/attachments`, {
        method: 'POST',
        headers: {
          'Content-Type': `multipart/form-data; boundary=${ noFiles.boundary }`,
          'x-tenant': 'acme'
        },
        body: noFiles.body
      });
      failures.push(...expectStatus(invalid.status, 422, 'attachments minItems'));

      const quota = buildMultipart(
        { note: 'quota' },
        [
          {
            name: 'screenshots',
            filename: 'q.png',
            contentType: 'image/png',
            body: PNG
          }
        ]
      );
      const quotaRes = await fetch(`${ base }/api/tickets/tkt_1/attachments`, {
        method: 'POST',
        headers: {
          'Content-Type': `multipart/form-data; boundary=${ quota.boundary }`,
          'x-tenant': 'acme'
        },
        body: quota.body
      });
      failures.push(...expectStatus(quotaRes.status, 413, 'attachments quota match'));

      const img = await fetch(`${ base }/api/tickets/tkt_1/attachments/att_img`);
      const imgBuf = Buffer.from(await img.arrayBuffer());
      failures.push(...expectStatus(img.status, 200, 'download png'));
      if (!imgBuf.equals(samplePng)) {
        failures.push('png download bytes mismatch');
      }

      const pdf = await fetch(`${ base }/api/tickets/tkt_1/attachments/att_pdf`);
      const pdfBuf = Buffer.from(await pdf.arrayBuffer());
      failures.push(...expectStatus(pdf.status, 200, 'download pdf base64'));
      if (pdfBuf.slice(0, 4).toString('utf8') !== '%PDF') {
        failures.push(`pdf download missing %PDF header: ${ pdfBuf.slice(0, 8).toString('utf8') }`);
      }

      const missing = await fetch(`${ base }/api/tickets/tkt_1/attachments/unknown`);
      failures.push(...expectStatus(missing.status, 404, 'download missing'));
    } catch (error) {
      failures.push(error instanceof Error ? error.message : String(error));
    } finally {
      if (server) {
        await server.stop();
      }
      cleanup();
    }

    return {
      name: 'runtime/ticket-attachments',
      description: 'HTTP: ticket create + multi-file upload + encoding downloads',
      passed: failures.length === 0,
      failures,
      durationMs: Date.now() - startedAt,
      expectedOutcome: 'success'
    };
  }
};
