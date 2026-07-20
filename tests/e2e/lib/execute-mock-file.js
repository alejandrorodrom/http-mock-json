'use strict';

const {
  PROJECT_ROOT,
  createWorkspace,
  killProcessTree,
  runCli,
  startMockServer
} = require('./server-harness');
const { hasExactConsoleMatch, formatMissingMatchFailure } = require('./strip-ansi');

/**
 * @typedef {object} ExpectedConsole
 * @property {'success' | 'error'} outcome
 * @property {string[]} [stdoutIncludes]
 * @property {string[]} [stdoutExcludes]
 * @property {string[]} [stderrIncludes]
 */

/**
 * @param {string} stdout
 * @param {string} stderr
 * @param {ExpectedConsole} expected
 * @param {{ timedOut?: boolean, exitCode?: number | null, timeoutMs?: number }} meta
 * @returns {string[]}
 */
function assertConsole(stdout, stderr, expected, meta = {}) {
  const failures = [];
  const combined = `${ stdout }\n${ stderr }`;

  if (meta.timedOut) {
    failures.push(`Timed out after ${ meta.timeoutMs }ms waiting for process to finish or start`);
  }

  if (expected.outcome === 'success') {
    if (!stdout.includes('Mock server is running')) {
      failures.push('Expected server to start, but console did not contain "Mock server is running"');
    }
    if (stdout.includes('✖ Error:')) {
      failures.push('Expected success, but console contained validation errors (✖ Error:)');
    }
  }

  if (expected.outcome === 'error') {
    if (!stdout.includes('✖ Error:') && !combined.includes('✖ ')) {
      failures.push('Expected errors in console (✖ ...), but none were found');
    }
    if (stdout.includes('Mock server is running')) {
      failures.push('Expected failure, but server started successfully');
    }
    if (meta.exitCode === 0) {
      failures.push(`Expected non-zero exit code on error, received ${ meta.exitCode }`);
    }
  }

  for (const snippet of expected.stdoutIncludes ?? []) {
    if (!hasExactConsoleMatch(stdout, snippet) && !hasExactConsoleMatch(combined, snippet)) {
      failures.push(
        formatMissingMatchFailure('Missing exact console match', snippet, combined)
      );
    }
  }

  for (const snippet of expected.stdoutExcludes ?? []) {
    if (hasExactConsoleMatch(stdout, snippet) || hasExactConsoleMatch(combined, snippet)) {
      failures.push(
        [
          'Unexpected exact console match',
          `    not expected: ${ JSON.stringify(snippet) }`,
          '    but it was found in console output'
        ].join('\n')
      );
    }
  }

  for (const snippet of expected.stderrIncludes ?? []) {
    if (!hasExactConsoleMatch(stderr, snippet)) {
      failures.push(
        formatMissingMatchFailure('Missing exact stderr match', snippet, stderr)
      );
    }
  }

  return failures;
}

/**
 * Runs `mock-server start` against a single mock file in an isolated workspace.
 * @param {object} options
 * @param {string} options.mockRelativePath
 * @param {ExpectedConsole} options.expected
 * @param {number} [options.port]
 * @param {number} [options.timeoutMs]
 * @param {string} [options.proxy]
 */
async function executeMockFile(options) {
  const startedAt = Date.now();
  const timeoutMs = options.timeoutMs ?? 12000;
  const { workspaceDir, cleanup } = createWorkspace(options.mockRelativePath);

  try {
    const args = ['start', '-p', String(options.port ?? 0), '-f', ''];

    // port 0 is invalid for our CLI (must be 1-65535). Prefer explicit free-like high ports.
    if (!options.port) {
      args[2] = String(37000 + Math.floor(Math.random() * 2000));
    }

    if (options.proxy) {
      args.push('--proxy', options.proxy);
    }

    const shouldKeepAlive = options.expected.outcome === 'success';
    const result = await runCli({
      cwd: workspaceDir,
      args,
      timeoutMs,
      resolveWhen: shouldKeepAlive
        ? (stdout) => stdout.includes('Mock server is running')
        : undefined
    });

    if (result.spawnError) {
      return {
        passed: false,
        failures: [result.spawnError],
        stdout: result.stdout,
        stderr: result.stderr,
        exitCode: result.exitCode,
        durationMs: Date.now() - startedAt
      };
    }

    if (result.child) {
      killProcessTree(result.child);
    }

    const failures = assertConsole(result.stdout, result.stderr, options.expected, {
      timedOut: result.timedOut,
      exitCode: result.exitCode,
      timeoutMs
    });

    return {
      passed: failures.length === 0,
      failures,
      stdout: result.stdout,
      stderr: result.stderr,
      exitCode: result.exitCode,
      durationMs: Date.now() - startedAt
    };
  } finally {
    cleanup();
  }
}

/**
 * CLI / system errors that do not depend on a specific mock payload.
 * @param {object} definition
 * @param {string} definition.name
 * @param {string} definition.description
 * @param {string[]} definition.args
 * @param {ExpectedConsole} definition.expected
 * @param {{ emptyMocksDir?: boolean, skipMocksDir?: boolean, mockRelativePath?: string | string[] | null }} [definition.workspace]
 * @param {number} [definition.timeoutMs]
 */
async function runCliUseCase(definition) {
  const startedAt = Date.now();
  const timeoutMs = definition.timeoutMs ?? 12000;
  const workspace = definition.workspace ?? { skipMocksDir: true };
  const { workspaceDir, cleanup } = createWorkspace(
    workspace.mockRelativePath ?? null,
    {
      emptyMocksDir: workspace.emptyMocksDir,
      skipMocksDir: workspace.skipMocksDir
    }
  );

  try {
    const result = await runCli({
      cwd: workspaceDir,
      args: definition.args,
      timeoutMs
    });

    if (result.spawnError) {
      return {
        name: definition.name,
        description: definition.description,
        passed: false,
        failures: [result.spawnError],
        durationMs: Date.now() - startedAt,
        expectedOutcome: definition.expected.outcome
      };
    }

    const failures = assertConsole(result.stdout, result.stderr, definition.expected, {
      timedOut: result.timedOut,
      exitCode: result.exitCode,
      timeoutMs
    });

    return {
      name: definition.name,
      description: definition.description,
      passed: failures.length === 0,
      failures,
      durationMs: Date.now() - startedAt,
      expectedOutcome: definition.expected.outcome
    };
  } finally {
    cleanup();
  }
}

/**
 * Starts a mock, runs HTTP requests, asserts status/body/headers/timing.
 * @param {object} definition
 * @param {string} definition.name
 * @param {string} definition.description
 * @param {string | string[]} definition.mockRelativePath
 * @param {string} [definition.proxy]
 * @param {(ctx: { baseUrl: string, port: number, stdout: string }) => Promise<string[]>} definition.assert
 */
async function runHttpUseCase(definition) {
  const startedAt = Date.now();
  let server;

  try {
    server = await startMockServer({
      mockRelativePath: definition.mockRelativePath,
      proxy: definition.proxy,
      timeoutMs: definition.timeoutMs
    });

    const failures = await definition.assert({
      baseUrl: server.baseUrl,
      port: server.port,
      stdout: server.stdout,
      workspaceDir: server.workspaceDir,
      mocksDir: server.mocksDir,
      getStdout: server.getStdout,
      getStderr: server.getStderr
    });

    return {
      name: definition.name,
      description: definition.description,
      passed: failures.length === 0,
      failures,
      durationMs: Date.now() - startedAt,
      expectedOutcome: 'success'
    };
  } catch (error) {
    return {
      name: definition.name,
      description: definition.description,
      passed: false,
      failures: [error instanceof Error ? error.message : String(error)],
      durationMs: Date.now() - startedAt,
      expectedOutcome: 'success'
    };
  } finally {
    if (server) {
      await server.stop();
    }
  }
}

/**
 * Direct unit-style assertion against compiled modules / captured console.
 * @param {object} definition
 * @param {string} definition.name
 * @param {string} definition.description
 * @param {'success' | 'error'} [definition.expectedOutcome]
 * @param {() => Promise<string[]> | string[]} definition.assert
 */
async function runUnitUseCase(definition) {
  const startedAt = Date.now();

  try {
    const failures = await definition.assert();

    return {
      name: definition.name,
      description: definition.description,
      passed: failures.length === 0,
      failures,
      durationMs: Date.now() - startedAt,
      expectedOutcome: definition.expectedOutcome ?? 'error'
    };
  } catch (error) {
    return {
      name: definition.name,
      description: definition.description,
      passed: false,
      failures: [error instanceof Error ? error.message : String(error)],
      durationMs: Date.now() - startedAt,
      expectedOutcome: definition.expectedOutcome ?? 'error'
    };
  }
}

/**
 * @param {object} definition
 * @param {string} definition.name
 * @param {string} definition.description
 * @param {string} definition.mockRelativePath
 * @param {ExpectedConsole} definition.expected
 * @param {number} [definition.port]
 * @param {string} [definition.proxy]
 */
async function runUseCase(definition) {
  const result = await executeMockFile({
    mockRelativePath: definition.mockRelativePath,
    expected: definition.expected,
    port: definition.port,
    proxy: definition.proxy
  });

  return {
    name: definition.name,
    description: definition.description,
    passed: result.passed,
    failures: result.failures,
    durationMs: result.durationMs,
    expectedOutcome: definition.expected.outcome
  };
}

module.exports = {
  PROJECT_ROOT,
  executeMockFile,
  runUseCase,
  runCliUseCase,
  runHttpUseCase,
  runUnitUseCase
};
