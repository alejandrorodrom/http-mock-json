'use strict';

const net = require('net');
const { runCliUseCase } = require('../../lib/execute-mock-file');

function listen(port) {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => resolve(server));
  });
}

module.exports = {
  name: 'system/port-in-use',
  description: 'CLI start on occupied port → Port X is already in use',
  async run() {
    const port = 34104;
    const blocker = await listen(port);

    try {
      return await runCliUseCase({
        name: 'system/port-in-use',
        description: 'CLI start on occupied port → Port X is already in use',
        args: ['start', '-p', String(port), '-f', ''],
        workspace: {
          mockRelativePath: 'mocks/01-basic-multiple-responses.json'
        },
        expected: {
          outcome: 'error',
          stdoutIncludes: [
            `Port ${ port } is already in use. Please use a different port.`
          ],
          stdoutExcludes: ['Mock server is running']
        }
      });
    } finally {
      await new Promise((resolve) => blocker.close(resolve));
    }
  }
};
