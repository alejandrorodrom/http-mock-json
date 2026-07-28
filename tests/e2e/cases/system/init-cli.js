'use strict';

const fs = require('fs');
const path = require('path');
const { createWorkspace, runCli } = require('../../lib/server-harness');
const { hasExactConsoleMatch, formatMissingMatchFailure } = require('../../lib/strip-ansi');

/**
 * @param {string} stdout
 * @param {string[]} snippets
 * @param {string} label
 * @returns {string[]}
 */
function expectIncludes(stdout, snippets, label) {
  const failures = [];

  for (const snippet of snippets) {
    if (!hasExactConsoleMatch(stdout, snippet)) {
      failures.push(formatMissingMatchFailure(`[${ label }] Missing console match`, snippet, stdout));
    }
  }

  return failures;
}

module.exports = {
  name: 'system/init-cli',
  description: 'CLI init: path, --mock/--script flags, package.json script, idempotent mocks dir',
  async run() {
    const startedAt = Date.now();
    const failures = [];

    // 1) init --mock false --script false → creates ./mocks
    {
      const { workspaceDir, cleanup } = createWorkspace(null, { skipMocksDir: true });

      try {
        const result = await runCli({
          cwd: workspaceDir,
          args: ['init', '--mock', 'false', '--script', 'false'],
          timeoutMs: 12000
        });

        if (result.spawnError) {
          failures.push(`[default-path] ${ result.spawnError }`);
        } else {
          if (result.exitCode !== 0) {
            failures.push(`[default-path] Expected exit 0, got ${ result.exitCode }`);
          }
          failures.push(...expectIncludes(result.stdout, [
            'The mocks directory was created successfully'
          ], 'default-path'));

          if (!fs.existsSync(path.join(workspaceDir, 'mocks'))) {
            failures.push('[default-path] Expected ./mocks directory');
          }
          if (fs.existsSync(path.join(workspaceDir, 'package.json'))) {
            failures.push('[default-path] Did not expect package.json when --script false');
          }
        }
      } finally {
        cleanup();
      }
    }

    // 2) init --path api-mocks --mock false --script false → creates ./api-mocks
    {
      const { workspaceDir, cleanup } = createWorkspace(null, { skipMocksDir: true });

      try {
        const result = await runCli({
          cwd: workspaceDir,
          args: ['init', '--path', 'api-mocks', '--mock', 'false', '--script', 'false'],
          timeoutMs: 12000
        });

        if (result.spawnError) {
          failures.push(`[custom-path] ${ result.spawnError }`);
        } else {
          if (result.exitCode !== 0) {
            failures.push(`[custom-path] Expected exit 0, got ${ result.exitCode }`);
          }
          failures.push(...expectIncludes(result.stdout, [
            'The mocks directory was created successfully'
          ], 'custom-path'));

          if (!fs.existsSync(path.join(workspaceDir, 'api-mocks'))) {
            failures.push('[custom-path] Expected ./api-mocks directory');
          }
          if (fs.existsSync(path.join(workspaceDir, 'mocks'))) {
            failures.push('[custom-path] Did not expect ./mocks at workspace root');
          }
        }
      } finally {
        cleanup();
      }
    }

    // 3) init --script true with package.json → adds mock:start
    {
      const { workspaceDir, cleanup } = createWorkspace(null, { skipMocksDir: true });

      try {
        fs.writeFileSync(
          path.join(workspaceDir, 'package.json'),
          `${ JSON.stringify({ name: 'demo', version: '0.0.0' }, null, 2) }\n`,
          'utf8'
        );

        const result = await runCli({
          cwd: workspaceDir,
          args: ['init', '--mock', 'false', '--script', 'true'],
          timeoutMs: 12000
        });

        if (result.spawnError) {
          failures.push(`[script-true] ${ result.spawnError }`);
        } else {
          failures.push(...expectIncludes(result.stdout, [
            'The mocks directory was created successfully',
            'The script was added successfully'
          ], 'script-true'));

          const pkg = JSON.parse(
            fs.readFileSync(path.join(workspaceDir, 'package.json'), 'utf8')
          );

          if (pkg.scripts?.['mock:start'] !== 'mock-server start -p 3001') {
            failures.push(
              `[script-true] Unexpected scripts.mock:start: ${ JSON.stringify(pkg.scripts) }`
            );
          }
        }
      } finally {
        cleanup();
      }
    }

    // 4) init --script true without package.json → logs missing file, still creates mocks
    {
      const { workspaceDir, cleanup } = createWorkspace(null, { skipMocksDir: true });

      try {
        const result = await runCli({
          cwd: workspaceDir,
          args: ['init', '--mock', 'false', '--script', 'true'],
          timeoutMs: 12000
        });

        if (result.spawnError) {
          failures.push(`[script-no-pkg] ${ result.spawnError }`);
        } else {
          failures.push(...expectIncludes(result.stdout, [
            'The mocks directory was created successfully',
            'The file "package.json" was not found'
          ], 'script-no-pkg'));

          if (!fs.existsSync(path.join(workspaceDir, 'mocks'))) {
            failures.push('[script-no-pkg] Expected ./mocks even when package.json is missing');
          }
        }
      } finally {
        cleanup();
      }
    }

    // 5) init twice → second run reports mocks already exists
    {
      const { workspaceDir, cleanup } = createWorkspace(null, { skipMocksDir: true });

      try {
        await runCli({
          cwd: workspaceDir,
          args: ['init', '--mock', 'false', '--script', 'false'],
          timeoutMs: 12000
        });

        const result = await runCli({
          cwd: workspaceDir,
          args: ['init', '--mock', 'false', '--script', 'false'],
          timeoutMs: 12000
        });

        if (result.spawnError) {
          failures.push(`[idempotent] ${ result.spawnError }`);
        } else {
          failures.push(...expectIncludes(result.stdout, [
            'The mocks directory already exists'
          ], 'idempotent'));
        }
      } finally {
        cleanup();
      }
    }

    return {
      name: 'system/init-cli',
      description: 'CLI init: path, --mock/--script flags, package.json script, idempotent mocks dir',
      passed: failures.length === 0,
      failures,
      durationMs: Date.now() - startedAt,
      expectedOutcome: 'success'
    };
  }
};
