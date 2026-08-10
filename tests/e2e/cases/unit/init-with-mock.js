'use strict';

const fs = require('fs');
const path = require('path');
const prompts = require('prompts');
const { runUnitUseCase, PROJECT_ROOT } = require('../../lib/execute-mock-file');
const { createWorkspace } = require('../../lib/server-harness');
const { stripAnsi } = require('../../lib/strip-ansi');

module.exports = {
  name: 'unit/init-with-mock',
  description: 'initialize --mock true + custom path creates mocks dir and first mock via prompts',
  run: () => runUnitUseCase({
    name: 'unit/init-with-mock',
    description: 'initialize --mock true + custom path creates mocks dir and first mock via prompts',
    expectedOutcome: 'success',
    async assert() {
      const { initialize } = require(
        path.join(PROJECT_ROOT, 'dist/src/cli/commands/init/initialize.js')
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
        prompts.inject(['welcome', 'hello', ['get'], true]);

        await initialize({
          path: 'api-mocks',
          mock: true,
          script: false
        });

        const mocksDir = path.join(workspaceDir, 'api-mocks');
        const mockFile = path.join(mocksDir, 'welcome.json');

        if (!fs.existsSync(mocksDir)) {
          failures.push('Expected api-mocks after initialize');
        }
        if (!fs.existsSync(mockFile)) {
          failures.push(`Expected first mock at ${ mockFile }`);
        } else {
          const parsed = JSON.parse(fs.readFileSync(mockFile, 'utf8'));
          if (!parsed.hello?.GET) {
            failures.push(`Expected hello.GET in mock, got: ${ JSON.stringify(parsed) }`);
          }
          const successBody = parsed.hello?.GET?.responses?.find((r) => r.name === 'success')?.body;
          const errorBody = parsed.hello?.GET?.responses?.find((r) => r.name === 'error')?.body;
          if (successBody?.message !== 'ok') {
            failures.push(`Expected success body message "ok", got: ${ JSON.stringify(successBody) }`);
          }
          if (errorBody?.message !== 'Not found') {
            failures.push(`Expected error body message "Not found", got: ${ JSON.stringify(errorBody) }`);
          }
        }

        const joined = logs.join('\n');
        if (!joined.includes('The mocks directory was created successfully')) {
          failures.push(`Expected mocks created message. Logs:\n${ joined }`);
        }
        if (!joined.includes('Mock ready')) {
          failures.push(`Expected Mock ready after --mock true. Logs:\n${ joined }`);
        }
        if (!joined.includes('Next:')) {
          failures.push(`Expected Next: after --mock true. Logs:\n${ joined }`);
        }
        if (!joined.includes('curl -i http://localhost:3001/hello')) {
          failures.push(`Expected curl for hello endpoint. Logs:\n${ joined }`);
        }
        if (joined.includes('The script was added successfully')) {
          failures.push('Did not expect package script when script:false');
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
