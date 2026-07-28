'use strict';

const fs = require('fs');
const path = require('path');
const prompts = require('prompts');
const { runUnitUseCase, PROJECT_ROOT } = require('../../lib/execute-mock-file');
const { createWorkspace } = require('../../lib/server-harness');
const { stripAnsi } = require('../../lib/strip-ansi');

module.exports = {
  name: 'unit/add-mock',
  description: 'addMock writes JSON under custom --path and respects abort confirm',
  run: () => runUnitUseCase({
    name: 'unit/add-mock',
    description: 'addMock writes JSON under custom --path and respects abort confirm',
    expectedOutcome: 'success',
    async assert() {
      const { addMock } = require(
        path.join(PROJECT_ROOT, 'dist/src/cli/commands/add/add-mock.js')
      );
      const failures = [];
      const { workspaceDir, cleanup } = createWorkspace(null, { skipMocksDir: true });
      const previousCwd = process.cwd();
      const logs = [];
      const originalLog = console.log;

      console.log = (...args) => {
        logs.push(stripAnsi(args.map(String).join(' ')));
      };

      try {
        process.chdir(workspaceDir);

        // Custom path: api-mocks/<name>.json
        const mocksDir = path.join(workspaceDir, 'api-mocks');
        fs.mkdirSync(mocksDir, { recursive: true });

        prompts.inject(['users-api', 'users', ['get', 'post'], true]);
        await addMock({ path: 'api-mocks' });

        const mockFile = path.join(mocksDir, 'users-api.json');
        if (!fs.existsSync(mockFile)) {
          failures.push(`Expected mock file at ${ mockFile }`);
        } else {
          const parsed = JSON.parse(fs.readFileSync(mockFile, 'utf8'));
          if (!parsed.users?.GET || !parsed.users?.POST) {
            failures.push(
              `Expected GET+POST on users endpoint, got: ${ JSON.stringify(parsed) }`
            );
          }
        }

        const joinedLogs = logs.join('\n');
        if (!joinedLogs.includes('Mock ready')) {
          failures.push(`Expected "Mock ready" after confirm. Logs:\n${ joinedLogs }`);
        }

        // Abort: confirm=false → no new file
        prompts.inject(['aborted-api', 'gone', ['get'], false]);
        const beforeAbort = fs.readdirSync(mocksDir);
        await addMock({ path: 'api-mocks' });
        const afterAbort = fs.readdirSync(mocksDir);

        if (afterAbort.includes('aborted-api.json')) {
          failures.push('Abort confirm should not write aborted-api.json');
        }
        if (afterAbort.length !== beforeAbort.length) {
          failures.push('Abort confirm should not add files under mocks/');
        }
        if (!logs.join('\n').includes('Aborting')) {
          failures.push(`Expected abort message. Logs:\n${ logs.join('\n') }`);
        }
      } finally {
        console.log = originalLog;
        process.chdir(previousCwd);
        cleanup();
      }

      return failures;
    }
  })
};
