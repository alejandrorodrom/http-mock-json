'use strict';

const { createWorkspace, runCli } = require('../../lib/server-harness');
const { hasExactConsoleMatch, formatMissingMatchFailure } = require('../../lib/strip-ansi');

module.exports = {
  name: 'system/add-cli-flags',
  description: 'CLI add --help and combined --preset/--crud/--path flag surface',
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
          for (const flag of ['-p, --path', '--crud', '--preset']) {
            if (!combined.includes(flag)) {
              failures.push(`[add --help] Expected flag text ${ JSON.stringify(flag) }`);
            }
          }
          if (!combined.includes('static|crud|crud-full|scenarios|auth-login|proxy-hybrid|paginated-list|upload|relations')) {
            failures.push('[add --help] Expected full preset list in --preset description');
          }
          if (!combined.includes('--preset crud')) {
            failures.push('[add --help] Expected --crud described as alias for --preset crud');
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
      ['--crud --help', ['add', '--crud', '--help']],
      ['--preset crud --help', ['add', '--preset', 'crud', '--help']],
      ['--preset scenarios --path --help', ['add', '--preset', 'scenarios', '--path', 'api-mocks', '--help']]
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
        if (!combined.includes('--preset')) {
          failures.push(`[${ label }] Expected --preset in help output`);
        }
      } finally {
        cleanup();
      }
    }

    // Invalid preset should fail before prompts
    {
      const { workspaceDir, cleanup } = createWorkspace(null, { skipMocksDir: true });

      try {
        const result = await runCli({
          cwd: workspaceDir,
          args: ['add', '--preset', 'not-a-preset'],
          timeoutMs: 12000
        });
        const combined = `${ result.stdout }\n${ result.stderr }`;

        if (result.spawnError) {
          failures.push(`[invalid-preset] ${ result.spawnError }`);
        } else {
          if (result.exitCode === 0) {
            failures.push('[invalid-preset] Expected non-zero exit for unknown preset');
          }
          if (!combined.includes('Unknown add preset')) {
            failures.push(
              formatMissingMatchFailure(
                '[invalid-preset] Missing error',
                'Unknown add preset',
                combined
              )
            );
          }
        }
      } finally {
        cleanup();
      }
    }

    // --crud + conflicting --preset should fail without prompts
    {
      const { workspaceDir, cleanup } = createWorkspace(null, { skipMocksDir: true });

      try {
        const result = await runCli({
          cwd: workspaceDir,
          args: ['add', '--crud', '--preset', 'scenarios'],
          timeoutMs: 12000
        });
        const combined = `${ result.stdout }\n${ result.stderr }`;

        if (result.spawnError) {
          failures.push(`[crud+preset-conflict] ${ result.spawnError }`);
        } else {
          if (result.timedOut) {
            failures.push('[crud+preset-conflict] Timed out (should fail before prompts)');
          }
          if (result.exitCode === 0) {
            failures.push('[crud+preset-conflict] Expected non-zero exit');
          }
          if (!combined.includes('Cannot combine --crud')) {
            failures.push(
              formatMissingMatchFailure(
                '[crud+preset-conflict] Missing error',
                'Cannot combine --crud',
                combined
              )
            );
          }
        }
      } finally {
        cleanup();
      }
    }

    return {
      name: 'system/add-cli-flags',
      description: 'CLI add --help and combined --preset/--crud/--path flag surface',
      passed: failures.length === 0,
      failures,
      durationMs: Date.now() - startedAt,
      expectedOutcome: 'success'
    };
  }
};
