'use strict';

const { createWorkspace, runCli } = require('../../lib/server-harness');

module.exports = {
  name: 'system/import-cli-errors',
  description: 'CLI import rejects missing --openapi',
  async run() {
    const startedAt = Date.now();
    const failures = [];
    const { workspaceDir, cleanup } = createWorkspace(null, { skipMocksDir: true });

    try {
      const result = await runCli({
        cwd: workspaceDir,
        args: ['import'],
        timeoutMs: 12000
      });
      const combined = `${ result.stdout }\n${ result.stderr }`;

      if (result.spawnError) {
        failures.push(`[import missing --openapi] ${ result.spawnError }`);
      } else {
        if (result.exitCode === 0) {
          failures.push('[import missing --openapi] Expected non-zero exit code');
        }
        if (!/required option|--openapi|openapi/i.test(combined)) {
          failures.push(
            `[import missing --openapi] Expected required/--openapi error. Output:\n${ combined }`
          );
        }
      }
    } finally {
      cleanup();
    }

    return {
      name: 'system/import-cli-errors',
      description: 'CLI import rejects missing --openapi',
      passed: failures.length === 0,
      failures,
      durationMs: Date.now() - startedAt,
      expectedOutcome: 'success'
    };
  }
};
