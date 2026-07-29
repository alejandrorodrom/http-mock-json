'use strict';

const fs = require('fs');
const path = require('path');
const prompts = require('prompts');
const { runUnitUseCase, PROJECT_ROOT } = require('../../lib/execute-mock-file');
const { createWorkspace } = require('../../lib/server-harness');
const { captureLogs } = require('../../lib/capture-logs');

module.exports = {
  name: 'unit/cli-io-errors',
  description: 'init/add IO failures: missing mocks dir, corrupt package.json, unwritable package.json',
  run: () => runUnitUseCase({
    name: 'unit/cli-io-errors',
    description: 'init/add IO failures: missing mocks dir, corrupt package.json, unwritable package.json',
    expectedOutcome: 'error',
    async assert() {
      const { addMock } = require(
        path.join(PROJECT_ROOT, 'dist/src/cli/commands/add/add-mock.js')
      );
      const { addScriptToPackageJson } = require(
        path.join(PROJECT_ROOT, 'dist/src/cli/commands/init/add-script.js')
      );
      const failures = [];
      const { workspaceDir, cleanup } = createWorkspace(null, { skipMocksDir: true });
      const previousCwd = process.cwd();

      try {
        process.chdir(workspaceDir);

        // 1) addMock write fails when mocks/ does not exist (ENOENT)
        {
          prompts.inject(['broken', 'ping', ['get'], true]);
          const output = await captureLogs(() => addMock({ path: '' }));

          if (!output.includes('ENOENT') && !output.includes('no such file')) {
            failures.push(`[add-enoent] Expected write failure. Output:\n${ output }`);
          }
          if (output.includes('Mock ready')) {
            failures.push('[add-enoent] Should not print Mock ready after write failure');
          }
        }

        // 2) add-script with invalid package.json JSON
        {
          fs.writeFileSync(path.join(workspaceDir, 'package.json'), '{ not-json', 'utf8');
          const output = await captureLogs(() => addScriptToPackageJson());

          if (!output.includes('JSON') && !output.includes('Unexpected') && !output.includes('SyntaxError')) {
            failures.push(`[script-bad-json] Expected JSON parse error. Output:\n${ output }`);
          }
          if (output.includes('The script was added successfully')) {
            failures.push('[script-bad-json] Should not report script added');
          }
          fs.rmSync(path.join(workspaceDir, 'package.json'), { force: true });
        }

        // 3) add-script write fails when package.json is not writable
        {
          const pkgPath = path.join(workspaceDir, 'package.json');
          fs.writeFileSync(pkgPath, `${ JSON.stringify({ name: 'demo', version: '0.0.0' }, null, 2) }\n`, 'utf8');
          fs.chmodSync(pkgPath, 0o444);

          const output = await captureLogs(() => addScriptToPackageJson());

          if (
            !output.includes('EACCES')
            && !output.includes('permission')
            && !output.includes('EPERM')
            && !output.includes('read-only')
          ) {
            // Some environments may still allow overwrite of mode 444 for the owner.
            // Fallback: turn package.json into a directory so writeFileSync fails with EISDIR.
            fs.chmodSync(pkgPath, 0o644);
            fs.rmSync(pkgPath, { force: true });
            fs.mkdirSync(pkgPath);

            const fallbackOutput = await captureLogs(() => addScriptToPackageJson());
            if (
              !fallbackOutput.includes('EISDIR')
              && !fallbackOutput.includes('illegal operation')
              && !fallbackOutput.includes('directory')
            ) {
              failures.push(
                `[script-write] Expected write failure.\nchmod444:\n${ output }\neisdir:\n${ fallbackOutput }`
              );
            }
          } else if (output.includes('The script was added successfully')) {
            failures.push('[script-write] Should not report script added on write failure');
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
