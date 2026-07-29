'use strict';

const { createWorkspace, runCli } = require('../../lib/server-harness');
const { hasExactConsoleMatch, formatMissingMatchFailure } = require('../../lib/strip-ansi');

module.exports = {
  name: 'system/add-cli-flags',
  description: 'CLI add --help and combined --crud/--path flag surface',
  async run() {
    const startedAt = Date.now();
    const failures = [];

    {
      const { workspaceDir, cleanup } = createWorkspace(null, { skipMocksDir: true });

      try {
        const result = await runCli({
          cwd: workspaceDir,
          args: ['add', '--help'],
          timeoutMs: 12000
        });
        const combined = `${ result.stdout }\n${ result.stderr }`;

        if (result.spawnError) {
          failures.push(`[add --help] ${ result.spawnError }`);
        } else {
          if (result.exitCode !== 0) {
            failures.push(`[add --help] Expected exit 0, got ${ result.exitCode }`);
          }
          if (!hasExactConsoleMatch(combined, 'Usage: mock-server add [options]')) {
            failures.push(
              formatMissingMatchFailure(
                '[add --help] Missing console match',
                'Usage: mock-server add [options]',
                combined
              )
            );
          }
          for (const flag of ['-p, --path', '--crud']) {
            if (!combined.includes(flag)) {
              failures.push(`[add --help] Expected flag text ${ JSON.stringify(flag) }`);
            }
          }
          if (!combined.includes('store actions')) {
            failures.push('[add --help] Expected --crud description mentioning store actions');
          }
        }
      } finally {
        cleanup();
      }
    }

    // Combined flags with --help: commander should still print help (no interactive prompts)
    for (const [label, args] of [
      ['--crud --path --help', ['add', '--crud', '--path', 'api-mocks', '--help']],
      ['--path --crud --help', ['add', '--path', 'api-mocks', '--crud', '--help']],
      ['--crud --help', ['add', '--crud', '--help']]
    ]) {
      const { workspaceDir, cleanup } = createWorkspace(null, { skipMocksDir: true });

      try {
        const result = await runCli({
          cwd: workspaceDir,
          args,
          timeoutMs: 12000
        });
        const combined = `${ result.stdout }\n${ result.stderr }`;

        if (result.spawnError) {
          failures.push(`[${ label }] ${ result.spawnError }`);
          continue;
        }
        if (result.exitCode !== 0) {
          failures.push(`[${ label }] Expected exit 0, got ${ result.exitCode }`);
        }
        if (result.timedOut) {
          failures.push(`[${ label }] Timed out (likely stuck on interactive prompts)`);
        }
        if (!combined.includes('Usage: mock-server add')) {
          failures.push(
            formatMissingMatchFailure(
              `[${ label }] Missing usage`,
              'Usage: mock-server add',
              combined
            )
          );
        }
        if (!combined.includes('--crud')) {
          failures.push(`[${ label }] Expected --crud in help output`);
        }
      } finally {
        cleanup();
      }
    }

    return {
      name: 'system/add-cli-flags',
      description: 'CLI add --help and combined --crud/--path flag surface',
      passed: failures.length === 0,
      failures,
      durationMs: Date.now() - startedAt,
      expectedOutcome: 'success'
    };
  }
};
