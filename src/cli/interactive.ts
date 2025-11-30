import { Command } from 'commander';
import { executeMock } from './commands/start/execute-mock';
import { logError } from '../scripts/log.script';
import { initialize } from "./commands/init/initialize";
import { AddOptions, InitOptions, StartOptions } from "../types/options.type";
import { addMock } from "./commands/add/add-mock";

export const interactive = () => {
  const mock = new Command();

  mock
    .name('mock-server')
    .version('1.6.0', '-v, --version', 'Output the version number')
    .description('Mock server for frontend project')
    .helpOption('-h, --help', 'Lists available commands and their short descriptions.');

  mock
    .command('init')
    .option(
      '-p, --path <path>',
      'Indicates where the mocks folder will be created',
      ''
    )
    .option(
      '-m, --mock',
      'Create a first mock.',
      true
    )
    .option(
      '-s, --script',
      'Add script to start the mock in the package.json file',
      true
    )
    .description('Create the folder that will contain the mocks.')
    .action((options: InitOptions) => {
      try {
        initialize(options);
      } catch (e) {
        logError(e);
      }
    });

  mock
    .command('start')
    .option(
      '-p, --port <port>',
      'Indicates the port where the mock will be executed',
      (value: string): number => {
        const port = parseInt(value, 10);
        if (isNaN(port)) {
          throw new Error('Port must be a valid number');
        }
        if (port < 1 || port > 65535) {
          throw new Error('Port must be between 1 and 65535');
        }
        return port;
      },
      3000
    )
    .option(
      '-f, --path <path>',
      'Indicates the location of the mocks in a specific folder.',
      ''
    )
    .description('Start mock server.')
    .action(async (options: StartOptions) => {
      try {
        await executeMock({
          port: options.port,
          folderPath: options.path
        });
      } catch (e) {
        logError(e);
        process.exit(1);
      }
    });

  mock
    .command('add')
    .requiredOption(
      '-p, --path <path>',
      'Indicates where the mocks folder is located',
      ''
    )
    .description('Create a mock.')
    .action((options: AddOptions) => {
      addMock(options)
    });

  try {
    mock.parse(process.argv);
  } catch (e) {
    logError(e);
    process.exit(1);
  }
}
