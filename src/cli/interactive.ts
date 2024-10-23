import { Command } from 'commander';
import { executeMock } from './commands/start/execute-mock';
import { logError } from '../scripts/log';
import { initialize } from "./commands/init/initialize";
import { AddOptions, InitOptions, StartOptions } from "../types/options";
import { addMock } from "./commands/add/add-mock";

export const interactive = () => {
  const mock = new Command();

  mock
    .name('mock-server')
    .version('1.2.6', '-v, --version', 'Output the version number')
    .description('Mock server for frontend project')
    .helpOption('-h, --help', 'Lists available commands and their short descriptions.')

  mock
    .command('start')
    .option(
      '-p, --port <port>',
      'Indicates the port where the mock will be executed',
      '3000'
    )
    .option(
      '-f, --path <path>',
      'Indicates the location of the mocks in a specific folder.',
      ''
    )
    .description('Start mock server.')
    .action((options: StartOptions) => {
      try {
        executeMock({
          port: Number(options.port),
          folderPath: options.path
        });
      } catch (e) {
        logError(e);
      }
    });

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

  mock.parse(process.argv)
}
