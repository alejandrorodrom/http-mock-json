'use strict';

const { runCliUseCase } = require('../../lib/execute-mock-file');

module.exports = {
  name: 'system/cli-version-help',
  description: 'CLI --version and --help exit cleanly with expected output',
  async run() {
    const startedAt = Date.now();
    const failures = [];

    const version = await runCliUseCase({
      name: 'system/cli-version-help/version',
      description: 'CLI --version',
      args: ['--version'],
      workspace: { skipMocksDir: true },
      expected: {
        outcome: 'cli',
        exitCode: 0,
        stdoutIncludes: ['5.0.0']
      }
    });

    if (!version.passed) {
      failures.push(...version.failures.map((f) => `[--version] ${ f }`));
    }

    const help = await runCliUseCase({
      name: 'system/cli-version-help/help',
      description: 'CLI --help',
      args: ['--help'],
      workspace: { skipMocksDir: true },
      expected: {
        outcome: 'cli',
        exitCode: 0,
        stdoutIncludes: [
          'Usage: mock-server [options] [command]',
          'init [options]   Create the folder that will contain the mocks.',
          'start [options]  Start mock server.',
          'add [options]    Create a mock.'
        ]
      }
    });

    if (!help.passed) {
      failures.push(...help.failures.map((f) => `[--help] ${ f }`));
    }

    return {
      name: 'system/cli-version-help',
      description: 'CLI --version and --help exit cleanly with expected output',
      passed: failures.length === 0,
      failures,
      durationMs: Date.now() - startedAt,
      expectedOutcome: 'success'
    };
  }
};
