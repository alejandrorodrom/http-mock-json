'use strict';

const fs = require('fs');
const path = require('path');
const { runHttpUseCase } = require('../../lib/execute-mock-file');

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = {
  name: 'runtime/watch-restart-failed',
  description: 'Watch mode: deleting mocks triggers restart failure message',
  run: () => runHttpUseCase({
    name: 'runtime/watch-restart-failed',
    description: 'Watch mode: deleting mocks triggers restart failure message',
    mockRelativePath: 'mocks/01-basic-multiple-responses.json',
    timeoutMs: 15000,
    async assert({ mocksDir, getStdout }) {
      const failures = [];
      const mockFile = path.join(mocksDir, '01-basic-multiple-responses.json');

      // watchMock is attached after the "running" log — wait for the watcher.
      await sleep(800);

      fs.unlinkSync(mockFile);

      const deadline = Date.now() + 10000;
      const expected = 'Mock server could not be restarted due to an invalid mock configuration. Please fix the mocks and run the command again.';

      while (Date.now() < deadline) {
        const stdout = getStdout();
        if (stdout.includes(expected) && stdout.includes('No files found')) {
          return failures;
        }
        await sleep(100);
      }

      failures.push(
        `Expected watch restart failure output.\nLast stdout:\n${ getStdout() }`
      );
      return failures;
    }
  })
};
