'use strict';

const path = require('path');
const fs = require('fs');
const { createWorkspace, startMockServer } = require('../../lib/server-harness');
const {
  expectStatus,
  expectEqual,
  expectMinDelay
} = require('../../lib/http-assert');

const PNG = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
  0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52
]);

const buildMultipart = (fields, files) => {
  const boundary = '----expenseReports';
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
  name: 'runtime/expense-reports',
  description: 'HTTP: store expenses + soft delete + receipt multipart/encoding + match.call',
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
      path.join(repoRoot, 'mocks/46-expense-reports.json'),
      path.join(mocksDir, '46-expense-reports.json')
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
      const tenantHeaders = {
        'Content-Type': 'application/json',
        'x-tenant': 'acme'
      };

      const listed = await fetch(`${ base }/api/expenses`);
      const listedJson = await listed.json();
      failures.push(...expectStatus(listed.status, 200, 'list seed'));
      failures.push(...expectEqual(listedJson.total, 1, 'seed total'));

      const created = await fetch(`${ base }/api/expenses`, {
        method: 'POST',
        headers: tenantHeaders,
        body: JSON.stringify({
          reference: 'EXP-200',
          title: 'Airport taxi',
          category: 'travel',
          amount: 42.75,
          currency: 'USD'
        })
      });
      const createdJson = await created.json();
      failures.push(...expectStatus(created.status, 201, 'create expense'));
      failures.push(...expectEqual(createdJson.reference, 'EXP-200', 'created reference'));
      const expenseId = createdJson.id;

      const duplicate = await fetch(`${ base }/api/expenses`, {
        method: 'POST',
        headers: tenantHeaders,
        body: JSON.stringify({
          reference: 'EXP-200',
          title: 'Duplicate ref',
          category: 'travel',
          amount: 10
        })
      });
      failures.push(...expectStatus(duplicate.status, 409, 'duplicate reference'));

      const invalid = await fetch(`${ base }/api/expenses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reference: 'X',
          title: 'No',
          category: 'travel',
          amount: 1
        })
      });
      failures.push(...expectStatus(invalid.status, 422, 'create validation'));

      const filtered = await fetch(`${ base }/api/expenses?status=draft&category=travel`);
      const filteredJson = await filtered.json();
      failures.push(...expectStatus(filtered.status, 200, 'filtered list'));
      if (!Array.isArray(filteredJson.data) || filteredJson.data.length < 1) {
        failures.push('filtered list expected at least one travel draft');
      }

      const got = await fetch(`${ base }/api/expenses/${ expenseId }`);
      const gotJson = await got.json();
      failures.push(...expectStatus(got.status, 200, 'get expense'));
      failures.push(...expectEqual(gotJson.id, expenseId, 'get id'));

      const patched = await fetch(`${ base }/api/expenses/${ expenseId }`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'submitted' })
      });
      const patchedJson = await patched.json();
      failures.push(...expectStatus(patched.status, 200, 'patch status'));
      failures.push(...expectEqual(patchedJson.status, 'submitted', 'submitted status'));

      const submittedList = await fetch(`${ base }/api/expenses?status=submitted`);
      const submittedJson = await submittedList.json();
      failures.push(...expectStatus(submittedList.status, 200, 'submitted list'));
      failures.push(...expectEqual(submittedJson.total, 1, 'one submitted expense'));

      const receiptFile = [
        {
          name: 'receipt',
          filename: 'taxi.png',
          contentType: 'image/png',
          body: PNG
        }
      ];

      const upload1 = buildMultipart({ note: 'first' }, receiptFile);
      const t1 = Date.now();
      const receipt1 = await fetch(`${ base }/api/expenses/${ expenseId }/receipts`, {
        method: 'POST',
        headers: {
          'Content-Type': `multipart/form-data; boundary=${ upload1.boundary }`,
          'x-tenant': 'acme'
        },
        body: upload1.body
      });
      const receipt1Json = await receipt1.json();
      failures.push(...expectStatus(receipt1.status, 201, 'receipt upload 1'));
      failures.push(...expectEqual(receipt1Json.receiptId, 'rcpt_1', 'receipt id'));
      failures.push(...expectMinDelay(Date.now() - t1, 30, 'receipt default delay'));

      const uploadOcr = buildMultipart({ note: 'ocr' }, receiptFile);
      const tOcr = Date.now();
      const ocr = await fetch(`${ base }/api/expenses/${ expenseId }/receipts`, {
        method: 'POST',
        headers: {
          'Content-Type': `multipart/form-data; boundary=${ uploadOcr.boundary }`,
          'x-tenant': 'acme'
        },
        body: uploadOcr.body
      });
      const ocrJson = await ocr.json();
      failures.push(...expectStatus(ocr.status, 202, 'receipt ocr'));
      failures.push(...expectEqual(ocrJson.status, 'processing', 'ocr processing'));
      failures.push(...expectMinDelay(Date.now() - tOcr, 80, 'ocr delay'));

      const upload3 = buildMultipart({ note: 'third' }, receiptFile);
      const limited = await fetch(`${ base }/api/expenses/${ expenseId }/receipts`, {
        method: 'POST',
        headers: {
          'Content-Type': `multipart/form-data; boundary=${ upload3.boundary }`,
          'x-tenant': 'acme'
        },
        body: upload3.body
      });
      const limitedJson = await limited.json();
      failures.push(...expectStatus(limited.status, 429, 'receipt rate limit call 3'));
      failures.push(...expectEqual(limitedJson.code, 'RECEIPT_RATE_LIMIT', 'rate limit code'));

      const otherExpenseUpload = buildMultipart({}, receiptFile);
      const otherOk = await fetch(`${ base }/api/expenses/1/receipts`, {
        method: 'POST',
        headers: {
          'Content-Type': `multipart/form-data; boundary=${ otherExpenseUpload.boundary }`,
          'x-tenant': 'acme'
        },
        body: otherExpenseUpload.body
      });
      failures.push(...expectStatus(otherOk.status, 201, 'receipt call counter by params.id'));

      const noFile = buildMultipart({ note: 'empty' }, []);
      const missingFile = await fetch(`${ base }/api/expenses/${ expenseId }/receipts`, {
        method: 'POST',
        headers: {
          'Content-Type': `multipart/form-data; boundary=${ noFile.boundary }`,
          'x-tenant': 'acme'
        },
        body: noFile.body
      });
      failures.push(...expectStatus(missingFile.status, 422, 'receipt minItems'));

      const preview = await fetch(`${ base }/api/expenses/${ expenseId }/receipts/preview`);
      const previewBuf = Buffer.from(await preview.arrayBuffer());
      failures.push(...expectStatus(preview.status, 200, 'preview file'));
      if (!previewBuf.equals(samplePng)) {
        failures.push('preview file bytes mismatch');
      }

      const previewB64 = await fetch(
        `${ base }/api/expenses/${ expenseId }/receipts/preview?format=base64`
      );
      const previewB64Buf = Buffer.from(await previewB64.arrayBuffer());
      failures.push(...expectStatus(previewB64.status, 200, 'preview base64'));
      if (previewB64Buf[0] !== 0x89 || previewB64Buf[1] !== 0x50) {
        failures.push('preview base64 missing PNG signature');
      }

      const removed = await fetch(`${ base }/api/expenses/${ expenseId }`, {
        method: 'DELETE'
      });
      failures.push(...expectStatus(removed.status, 204, 'soft delete'));

      const gone = await fetch(`${ base }/api/expenses/${ expenseId }`);
      failures.push(...expectStatus(gone.status, 404, 'get after soft delete'));

      const restored = await fetch(`${ base }/api/expenses/${ expenseId }`, {
        method: 'POST'
      });
      const restoredJson = await restored.json();
      failures.push(...expectStatus(restored.status, 200, 'restore'));
      failures.push(...expectEqual(restoredJson.id, expenseId, 'restored id'));

      const afterRestore = await fetch(`${ base }/api/expenses/${ expenseId }`);
      failures.push(...expectStatus(afterRestore.status, 200, 'get after restore'));
    } catch (error) {
      failures.push(error instanceof Error ? error.message : String(error));
    } finally {
      if (server) {
        await server.stop();
      }
      cleanup();
    }

    return {
      name: 'runtime/expense-reports',
      description: 'HTTP: store expenses + soft delete + receipt multipart/encoding + match.call',
      passed: failures.length === 0,
      failures,
      durationMs: Date.now() - startedAt,
      expectedOutcome: 'success'
    };
  }
};
