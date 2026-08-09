import { Command } from 'commander';
import { executeMock } from './commands/start/execute-mock';
import { logError } from '../scripts/log.script';
import { initialize } from "./commands/init/initialize";
import { AddOptions, ImportOptions, InitOptions, StartOptions } from "../types/options.type";
import { addMock } from "./commands/add/add-mock";
import { importOpenApi } from "./commands/import/import-openapi";
import { isHttpUrl } from "../scripts/http-url.script";
import { DEFAULT_MOCKS_DIR } from '../constants/mocks-path.constant';

export const interactive = () => {
  const mock = new Command();

  mock
    .name('mock-server')
    .version('5.2.0', '-v, --version', 'Output the version number')
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
    .option(
      '--record',
      'Record proxied responses into .recordings/ for later replay',
      false
    )
    .option(
      '--exclude-recordings',
      'Do not load .recordings/ (mocks only)',
      false
    )
    .option(
      '--recordings-only',
      'Load only .recordings/ (ignore regular mocks)',
      false
    )
    .description('Start mock server.')
    .action(async (options: StartOptions) => {
      try {
        if (options.excludeRecordings && options.recordingsOnly) {
          throw new Error('Cannot use --exclude-recordings and --recordings-only together');
        }

        const recordingsMode = options.recordingsOnly
          ? 'only'
          : options.excludeRecordings
            ? 'exclude'
            : 'include';

        await executeMock({
          port: options.port,
          folderPath: options.path,
          proxy: options.proxy,
          resetStore: options.resetStore,
          record: options.record === true,
          recordingsMode
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

  mock
    .command('import')
    .requiredOption(
      '--openapi <source>',
      'OpenAPI 3.x file path or http(s) URL'
    )
    .option(
      '-p, --path <path>',
      `Path to the mocks directory (default: ${ DEFAULT_MOCKS_DIR })`,
      DEFAULT_MOCKS_DIR
    )
    .option(
      '--out <name>',
      'Output file base name when not splitting by tags'
    )
    .option(
      '--no-split-tags',
      'Write a single mock JSON file instead of one file per OpenAPI tag'
    )
    .option(
      '--prefix <path>',
      'Route prefix for mock.config folders (overrides OpenAPI servers[0] path)'
    )
    .option(
      '--no-server-prefix',
      'Do not use OpenAPI servers[0] path as mock.config folder prefix'
    )
    .option(
      '--overwrite',
      'Overwrite existing mock files without prompting',
      false
    )
    .option(
      '--no-request',
      'Do not generate request.payload / query / headers from OpenAPI schemas'
    )
    .description('Import an OpenAPI 3.x document into mock JSON files.')
    .action(async (
      options: ImportOptions & { splitTags?: boolean; serverPrefix?: boolean; request?: boolean }
    ) => {
      try {
        await importOpenApi({
          path: options.path,
          openapi: options.openapi,
          out: options.out,
          splitTags: options.splitTags !== false,
          overwrite: options.overwrite === true,
          prefix: options.prefix,
          serverPrefix: options.serverPrefix !== false,
          request: options.request !== false
        });
      } catch (e) {
        logError(e);
        process.exit(1);
      }
    });

  try {
    mock.parse(process.argv);
  } catch (e) {
    logError(e);
    process.exit(1);
  }
}
