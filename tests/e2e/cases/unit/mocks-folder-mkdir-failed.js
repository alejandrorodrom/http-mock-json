'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { runUnitUseCase, PROJECT_ROOT } = require('../../lib/execute-mock-file');
const { stripAnsi } = require('../../lib/strip-ansi');

module.exports = {
  name: 'unit/mocks-folder-mkdir-failed',
  description: 'init addMocksFolder logs ENOTDIR when parent path is a file',
  run: () => runUnitUseCase({
    name: 'unit/mocks-folder-mkdir-failed',
    description: 'init addMocksFolder logs ENOTDIR when parent path is a file',
    expectedOutcome: 'error',
    async assert() {
      const { addMocksFolder } = require(
        path.join(PROJECT_ROOT, 'dist/src/cli/commands/init/add-mocks-folder.js')
      );

      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hmj-mkdir-fail-'));
      const blockedParent = path.join(tempDir, 'blocked');
      fs.writeFileSync(blockedParent, 'not-a-directory');
      const mocksPath = path.join(blockedParent, 'mocks');

      const logs = [];
      const originalLog = console.log;
      console.log = (...args) => {
        logs.push(stripAnsi(args.map(String).join(' ')));
      };

      try {
        addMocksFolder(mocksPath);
      } finally {
        console.log = originalLog;
        fs.rmSync(tempDir, { recursive: true, force: true });
      }

      const output = logs.join('\n');
      if (!output.includes('ENOTDIR') && !output.includes('not a directory')) {
        return [`Expected mkdir failure (ENOTDIR). Output:\n${ output }`];
      }

      return [];
    }
  })
};
