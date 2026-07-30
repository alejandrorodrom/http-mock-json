import { Command } from 'commander';
import { executeMock } from './commands/start/execute-mock';
import { logError } from '../scripts/log.script';
import { initialize } from "./commands/init/initialize";
import { AddOptions, InitOptions, StartOptions } from "../types/options.type";
import { addMock } from "./commands/add/add-mock";
import { isHttpUrl } from "../scripts/http-url.script";
import { DEFAULT_MOCKS_DIR } from '../constants/mocks-path.constant';

export const interactive = () => {
  const mock = new Command();

  mock
    .name('mock-server')
    .version('4.0.2', '-v, --version', 'Output the version number')
    .description('Mock server for frontend project')
    .helpOption('-h, --help', 'Lists available commands and their short descriptions.');

  mock
    .command('init')
    .option(
      '-p, --path <path>',
      `Path to the mocks directory to create (default: ${ DEFAULT_MOCKS_DIR })`,
      DEFAULT_MOCKS_DIR
    )
    .option(
      '-m, --mock [value]',
      'Create a first mock.',
      (value) => {
        if (value === undefined || value === null) return true;
        return value === 'true' || value === '1';
      },
      true
    )
    .option(
      '-s, --script [value]',
      'Add script to start the mock in the package.json file',
      (value) => {
        if (value === undefined || value === null) return true;
        return value === 'true' || value === '1';
      },
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
      'Indicates the port where the mock will be executed (overrides mock.config.json port)',
      (value: string): number => {
        const port = parseInt(value, 10);
        if (isNaN(port)) {
          throw new Error('Port must be a valid number');
        }
        if (port < 1 || port > 65535) {
          throw new Error('Port must be between 1 and 65535');
        }
        return port;
      }
    )
    .option(
      '-f, --path <path>',
      `Path to the mocks directory (default: ${ DEFAULT_MOCKS_DIR })`,
      DEFAULT_MOCKS_DIR
    )
    .option(
      '--proxy <url>',
      'Global proxy target for responses with "proxy": true and unmatched routes',
      (value: string): string => {
        if (!isHttpUrl(value)) {
          throw new Error('Proxy must be a valid http or https URL');
        }
        return value;
      }
    )
    .option(
      '--reset-store [ids]',
      'Clear persisted store snapshots before start (all stores, or comma-separated ids)',
      (value: string | boolean | undefined) => {
        if (value === undefined || value === true || value === '') {
          return true;
        }

        const ids = String(value)
          .split(',')
          .map(item => item.trim())
          .filter(item => item.length > 0);

        if (ids.length === 0) {
          throw new Error('Reset store ids must be a non-empty comma-separated list');
        }

        return ids;
      }
    )
    .description('Start mock server.')
    .action(async (options: StartOptions) => {
      try {
        await executeMock({
          port: options.port,
          folderPath: options.path,
          proxy: options.proxy,
          resetStore: options.resetStore
        });
      } catch (e) {
        if (!(e instanceof Error && e.message === 'Invalid mock configuration')) {
          logError(e);
        }
        process.exit(1);
      }
    });

  mock
    .command('add')
    .option(
      '-p, --path <path>',
      `Path to the mocks directory (default: ${ DEFAULT_MOCKS_DIR })`,
      DEFAULT_MOCKS_DIR
    )
    .option(
      '--crud',
      'Generate collection + /:id with store actions (list/create/get/update/patch/delete)',
      false
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
