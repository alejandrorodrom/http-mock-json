'use strict';

const fs = require('fs');
const path = require('path');
const prompts = require('prompts');
const { runUnitUseCase, PROJECT_ROOT } = require('../../lib/execute-mock-file');
const { createWorkspace } = require('../../lib/server-harness');
const { stripAnsi } = require('../../lib/strip-ansi');

const FIXTURES = path.join(PROJECT_ROOT, 'tests/e2e/fixtures/openapi');

/**
 * @param {() => Promise<void>} fn
 * @returns {Promise<{ logs: string, exitCode: number | undefined }>}
 */
async function captureImport(fn) {
  const logs = [];
  const originalLog = console.log;
  const previousExitCode = process.exitCode;
  process.exitCode = 0;
  console.log = (...args) => {
    logs.push(stripAnsi(args.map(String).join(' ')));
  };
  try {
    await fn();
    return { logs: logs.join('\n'), exitCode: process.exitCode };
  } finally {
    console.log = originalLog;
    process.exitCode = previousExitCode;
  }
}

/**
 * @param {string} logs
 * @param {string} needle
 * @param {string} label
 * @returns {string[]}
 */
function expectLogIncludes(logs, needle, label) {
  if (!logs.includes(needle)) {
    return [`[${ label }] Expected log to include ${ JSON.stringify(needle) }. Logs:\n${ logs }`];
  }
  return [];
}

module.exports = {
  name: 'unit/import-openapi-errors',
  description: 'importOpenApi fatal errors: missing file, bad syntax, invalid OAS, $ref, empty ops, overwrite abort',
  run: () => runUnitUseCase({
    name: 'unit/import-openapi-errors',
    description: 'importOpenApi fatal errors: missing file, bad syntax, invalid OAS, $ref, empty ops, overwrite abort',
    expectedOutcome: 'success',
    async assert() {
      const { importOpenApi } = require(
        path.join(PROJECT_ROOT, 'dist/src/cli/commands/import/import-openapi.js')
      );
      const failures = [];
      const { workspaceDir, cleanup } = createWorkspace(null, { skipMocksDir: true });
      const previousCwd = process.cwd();

      try {
        process.chdir(workspaceDir);

        /** @type {Array<{ label: string, openapi: string, needle: string }>} */
        const fatalCases = [
          {
            label: 'missing-file',
            openapi: 'does-not-exist.json',
            needle: 'OpenAPI file not found'
          },
          {
            label: 'broken-json',
            openapi: path.join(FIXTURES, 'broken-json.json'),
            needle: 'Failed to load OpenAPI document'
          },
          {
            label: 'broken-yaml',
            openapi: path.join(FIXTURES, 'broken-yaml.yaml'),
            needle: 'Failed to load OpenAPI document'
          },
          {
            label: 'missing-version',
            openapi: path.join(FIXTURES, 'missing-version.json'),
            needle: 'Failed to load OpenAPI document'
          },
          {
            label: 'broken-ref',
            openapi: path.join(FIXTURES, 'broken-ref.json'),
            needle: 'Invalid OpenAPI document'
          },
          {
            label: 'head-only',
            openapi: path.join(FIXTURES, 'head-only.json'),
            needle: 'No importable operations found'
          },
          {
            label: 'bad-url',
            openapi: 'http://127.0.0.1:9/openapi.json',
            needle: 'Failed to load OpenAPI document'
          }
        ];

        for (const testCase of fatalCases) {
          const result = await captureImport(() => importOpenApi({
            path: `err-${ testCase.label }`,
            openapi: testCase.openapi,
            overwrite: true
          }));

          if (result.exitCode !== 1) {
            failures.push(
              `[${ testCase.label }] Expected exitCode 1, got ${ result.exitCode }`
            );
          }
          failures.push(...expectLogIncludes(result.logs, testCase.needle, testCase.label));

          const outDir = path.join(workspaceDir, `err-${ testCase.label }`);
          if (fs.existsSync(outDir) && fs.readdirSync(outDir).length > 0) {
            failures.push(
              `[${ testCase.label }] Expected no mock files written, found: ${ fs.readdirSync(outDir).join(', ') }`
            );
          }
        }

        // Overwrite abort: seed a file, then decline overwrite
        const petsFixture = path.join(FIXTURES, 'pets.yaml');
        await captureImport(() => importOpenApi({
          path: 'err-overwrite',
          openapi: petsFixture,
          serverPrefix: false,
          overwrite: true
        }));

        const petsFile = path.join(workspaceDir, 'err-overwrite', 'pets.json');
        if (!fs.existsSync(petsFile)) {
          failures.push('Overwrite setup: expected pets.json before abort prompt');
        } else {
          const before = fs.readFileSync(petsFile, 'utf8');
          fs.writeFileSync(petsFile, `${ before }\n`, 'utf8');
          const stamped = fs.readFileSync(petsFile, 'utf8');

          prompts.inject([false]);
          const abort = await captureImport(() => importOpenApi({
            path: 'err-overwrite',
            openapi: petsFixture,
            serverPrefix: false,
            overwrite: false
          }));

          failures.push(...expectLogIncludes(abort.logs, 'Aborting', 'overwrite-abort'));
          if (fs.readFileSync(petsFile, 'utf8') !== stamped) {
            failures.push('Overwrite abort should leave existing pets.json unchanged');
          }
        }
      } finally {
        process.chdir(previousCwd);
        cleanup();
      }

      return failures;
    }
  })
};
