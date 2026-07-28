'use strict';

const fs = require('fs');
const path = require('path');
const {
  createWorkspace,
  getFreePort,
  runCli,
  CLI_PATH
} = require('../../lib/server-harness');

async function expectPersistStartupError(content, expectedSnippet) {
  const failures = [];
  const { workspaceDir, cleanup } = createWorkspace('mocks/26-store-persist.json');

  try {
    const persistDir = path.join(workspaceDir, 'mocks', '.store');
    fs.mkdirSync(persistDir, { recursive: true });
    const payload = typeof content === 'string'
      ? content
      : `${ JSON.stringify(content, null, 2) }\n`;
    fs.writeFileSync(path.join(persistDir, 'notes.json'), payload, 'utf8');

    const port = await getFreePort();
    const result = await runCli({
      cwd: workspaceDir,
      args: ['start', '-p', String(port), '-f', 'mocks'],
      timeoutMs: 12000
    });

    const combined = `${ result.stdout }\n${ result.stderr }`;
    if (!combined.includes('Invalid persisted store file')) {
      failures.push(
        `Expected invalid persisted store file error.\nstdout/stderr:\n${ combined }`
      );
    }
    if (!combined.includes(expectedSnippet)) {
      failures.push(
        `Expected error snippet "${ expectedSnippet }".\nstdout/stderr:\n${ combined }`
      );
    }
    if (combined.includes('Mock server is running')) {
      failures.push('Server should not start with invalid persist file');
    }
    if (!fs.existsSync(CLI_PATH)) {
      failures.push('CLI missing; build required');
    }
  } catch (error) {
    failures.push(error instanceof Error ? error.message : String(error));
  } finally {
    cleanup();
  }

  return failures;
}

module.exports = {
  name: 'error/store-persist-corrupt',
  description: 'Invalid persist snapshot (syntax/format/key/unique) prevents startup',
  async run() {
    const startedAt = Date.now();
    const failures = [];

    failures.push(...await expectPersistStartupError(
      '{ this is not valid json',
      'JSON'
    ));

    failures.push(...await expectPersistStartupError(
      { items: ['not-an-object'] },
      'must be an object'
    ));

    failures.push(...await expectPersistStartupError(
      { items: [{ title: 'missing-id' }] },
      'missing key field "id"'
    ));

    failures.push(...await expectPersistStartupError(
      {
        items: [
          { id: 1, title: 'a' },
          { id: 1, title: 'b' }
        ]
      },
      'duplicate key'
    ));

    failures.push(...await expectPersistStartupError(
      {
        items: [
          { id: 1, title: 'same' },
          { id: 2, title: 'same' }
        ]
      },
      'duplicate unique field "title"'
    ));

    return {
      name: 'error/store-persist-corrupt',
      description: 'Invalid persist snapshot (syntax/format/key/unique) prevents startup',
      passed: failures.length === 0,
      failures,
      durationMs: Date.now() - startedAt,
      expectedOutcome: 'error'
    };
  }
};
