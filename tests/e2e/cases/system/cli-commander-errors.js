'use strict';

const { createWorkspace, runCli } = require('../../lib/server-harness');
const { hasExactConsoleMatch, formatMissingMatchFailure } = require('../../lib/strip-ansi');

module.exports = {
  name: 'system/cli-commander-errors',
  description: 'CLI unknown command and start --help',
  async run() {
    const startedAt = Date.now();
    const failures = [];

    {
      const { workspaceDir, cleanup } = createWorkspace(null, { skipMocksDir: true });

      try {
        const result = await runCli({
          cwd: workspaceDir,
          args: ['nope'],
          timeoutMs: 12000
        });
        const combined = `${ result.stdout }\n${ result.stderr }`;

        if (result.spawnError) {
          failures.push(`[unknown] ${ result.spawnError }`);
        } else {
          if (result.exitCode !== 1) {
            failures.push(`[unknown] Expected exit 1, got ${ result.exitCode }`);
          }
          if (!hasExactConsoleMatch(combined, "unknown command 'nope'")) {
            failures.push(
              formatMissingMatchFailure('[unknown] Missing console match', "unknown command 'nope'", combined)
            );
          }
        }
      } finally {
        cleanup();
      }
    }

    {
      const { workspaceDir, cleanup } = createWorkspace(null, { skipMocksDir: true });

      try {
        const result = await runCli({
          cwd: workspaceDir,
          args: ['start', '--help'],
          timeoutMs: 12000
        });
        const combined = `${ result.stdout }\n${ result.stderr }`;

        if (result.spawnError) {
          failures.push(`[start --help] ${ result.spawnError }`);
        } else {
          if (result.exitCode !== 0) {
            failures.push(`[start --help] Expected exit 0, got ${ result.exitCode }`);
          }
          if (!hasExactConsoleMatch(combined, 'Usage: mock-server start [options]')) {
            failures.push(
              formatMissingMatchFailure(
                '[start --help] Missing console match',
                'Usage: mock-server start [options]',
                combined
              )
            );
          }

          for (const flag of ['-p, --port', '-f, --path', '--proxy', '--reset-store']) {
            if (!combined.includes(flag)) {
              failures.push(`[start --help] Expected flag text ${ JSON.stringify(flag) }`);
            }
          }
        }
      } finally {
        cleanup();
      }
    }

    return {
      name: 'system/cli-commander-errors',
      description: 'CLI unknown command and start --help',
      passed: failures.length === 0,
      failures,
      durationMs: Date.now() - startedAt,
      expectedOutcome: 'success'
    };
  }
};
