'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { runUnitUseCase, PROJECT_ROOT } = require('../../lib/execute-mock-file');
const { stripAnsi } = require('../../lib/strip-ansi');

module.exports = {
  name: 'unit/package-json-missing',
  description: 'init add-script logs package.json not found',
  run: () => runUnitUseCase({
    name: 'unit/package-json-missing',
    description: 'init add-script logs package.json not found',
    expectedOutcome: 'error',
    async assert() {
      const { addScriptToPackageJson } = require(
        path.join(PROJECT_ROOT, 'dist/src/cli/commands/init/add-script.js')
      );

      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hmj-no-pkg-'));
      const previousCwd = process.cwd();
      const logs = [];
      const originalLog = console.log;

      console.log = (...args) => {
        logs.push(stripAnsi(args.map(String).join(' ')));
      };

      try {
        process.chdir(tempDir);
        addScriptToPackageJson();
      } finally {
        console.log = originalLog;
        process.chdir(previousCwd);
        fs.rmSync(tempDir, { recursive: true, force: true });
      }

      const output = logs.join('\n');
      if (!output.includes('The file "package.json" was not found')) {
        return [`Expected package.json missing error. Output:\n${ output }`];
      }

      return [];
    }
  })
};
