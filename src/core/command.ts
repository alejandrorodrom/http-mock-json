import { Command } from 'commander';
import { executeMock } from '../server/mock';
import { logError } from '../scripts/log';

export const command = () => {
  const mock = new Command();

  mock
    .name('mock-server')
    .version('0.1.5', '-v, --version', 'Output the version number')
    .description('Mock server for frontend project')
    .helpOption('-h, --help', 'Lists available commands and their short descriptions.')

  mock
    .command('start')
    .option(
      '-p, --port <port>',
      'Indicates the port where the mock will be executed',
      '3000'
    )
    .description('Start mocked server.')
    .action((options) => {
      try {
        executeMock(Number(options.port))
      } catch (e) {
        logError(e);
      }
    })

  mock.parse(process.argv)
}
