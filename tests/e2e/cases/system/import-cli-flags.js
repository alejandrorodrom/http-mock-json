'use strict';

const { createWorkspace, runCli } = require('../../lib/server-harness');
const { hasExactConsoleMatch, formatMissingMatchFailure } = require('../../lib/strip-ansi');

module.exports = {
  name: 'system/import-cli-flags',
  description: 'CLI import --help surfaces OpenAPI flags',
  async run() {
    const startedAt = Date.now();
    const failures = [];
    const { workspaceDir, cleanup } = createWorkspace(null, { skipMocksDir: true });

    try {
      const result = await runCli({
        cwd: workspaceDir,
        args: ['import', '--help'],
        timeoutMs: 12000
      });
      const combined = `${ result.stdout }\n${ result.stderr }`;

      if (result.spawnError) {
        failures.push(`[import --help] ${ result.spawnError }`);
      } else {
        if (result.exitCode !== 0) {
          failures.push(`[import --help] Expected exit 0, got ${ result.exitCode }`);
        }
        if (!hasExactConsoleMatch(combined, 'Usage: mock-server import [options]')) {
          failures.push(
            formatMissingMatchFailure(
              '[import --help] Missing console match',
              'Usage: mock-server import [options]',
              combined
            )
          );
        }
        for (const flag of [
          '--openapi',
          '-p, --path',
          '--out',
          '--no-split-tags',
          '--prefix',
          '--no-server-prefix',
          '--overwrite',
          '--no-request'
        ]) {
          if (!combined.includes(flag)) {
            failures.push(`[import --help] Expected flag text ${ JSON.stringify(flag) }`);
          }
        }
      }
    } finally {
      cleanup();
    }

    return {
      name: 'system/import-cli-flags',
      description: 'CLI import --help surfaces OpenAPI flags',
      passed: failures.length === 0,
      failures,
      durationMs: Date.now() - startedAt,
      expectedOutcome: 'success'
    };
  }
};
