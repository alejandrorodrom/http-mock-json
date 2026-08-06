import * as fs from 'fs';
import { Api } from '../../../models/api.model';
import { ValidationIssue } from '../../../interfaces/validation.interface';
import { logError, logWarning } from '../../../scripts/log.script';
import { hasItems, isEmpty } from '../../../scripts/guards.script';
import {
  collectStoresFromData,
  loadMockFile,
  processMockData
} from './process-file';
import { formatIssues, getAllIssues, addIssues } from '../../../scripts/issues.script';
import { StoreDefinition } from '../../../types/store.type';
import { RawMockFile } from '../../../types/mock.type';
import { validateStoreRelationsIntegrity } from '../../../validators/store.validator';
import { MOCK_CONFIG_FILENAME } from '../../../constants/mock-config.constant';
import { MockConfig } from '../../../types/mock-config.type';
import {
  discoverMockFiles,
  LoadMockConfigResult,
  loadMockConfig,
  resolveFileDefaults
} from '../../../scripts/mock-config.script';
import { discoverRecordingFiles } from '../../../scripts/record-discover.script';
import { RecordingsMode } from '../../../types/recordings.type';
import { RECORDINGS_DIR } from '../../../constants/recordings.constant';

export interface MocksData {
  apis: Api[];
  stores: StoreDefinition[];
  config: MockConfig | null;
}

const recordingDefaultsFile = (file: string): string => {
  const marker = `/${ RECORDINGS_DIR }/`;
  const index = file.indexOf(marker);

  if (index === -1) {
    if (file.startsWith(`${ RECORDINGS_DIR }/`)) {
      return file.slice(RECORDINGS_DIR.length + 1);
    }

    return file;
  }

  return `${ file.slice(0, index) }/`;
};

export const getMocksData = (
  folderPath: string,
  loadedConfig?: LoadMockConfigResult,
  recordingsMode: RecordingsMode = 'include'
): MocksData => {
  if (!fs.existsSync(folderPath)) {
    throw new Error('The mocks directory does not exist');
  }

  const errorsByFile: Record<string, ValidationIssue[]> = {};
  const warningsByFile: Record<string, ValidationIssue[]> = {};

  const { config, errors: configErrors } = loadedConfig ?? loadMockConfig(folderPath);
  addIssues(errorsByFile, MOCK_CONFIG_FILENAME, configErrors);

  const discovered = recordingsMode === 'only'
    ? { files: [] as string[], errors: [] as ValidationIssue[] }
    : discoverMockFiles(folderPath, config);
  const mockFiles = discovered.files;
  addIssues(errorsByFile, MOCK_CONFIG_FILENAME, discovered.errors);

  const recordingFiles = recordingsMode === 'exclude'
    ? []
    : discoverRecordingFiles(folderPath, config);

  const files = [...mockFiles, ...recordingFiles];

  if (!files.length) {
    const hasConfigIssues = hasItems(getAllIssues(errorsByFile));
    if (!hasConfigIssues) {
      throw new Error('No files found');
    }
  }

  const mockData: Api[] = [];
  const stores = new Map<string, StoreDefinition>();
  const parsed = new Map<string, { data: RawMockFile; source: 'mock' | 'recording' }>();

  for (const file of mockFiles) {
    const data = loadMockFile(file, folderPath, errorsByFile);
    if (data) {
      parsed.set(file, { data, source: 'mock' });
    }
  }

  for (const file of recordingFiles) {
    const data = loadMockFile(file, folderPath, errorsByFile);
    if (data) {
      parsed.set(file, { data, source: 'recording' });
    }
  }

  const fileDefaultsByPath = new Map(
    [...parsed.keys()].map(file => {
      const source = parsed.get(file)?.source;
      const defaultsKey = source === 'recording'
        ? recordingDefaultsFile(file)
        : file;
      return [file, resolveFileDefaults(defaultsKey, config)] as const;
    })
  );

  for (const [file, entry] of parsed) {
    if (entry.source !== 'mock') {
      continue;
    }

    collectStoresFromData(
      file,
      entry.data,
      errorsByFile,
      warningsByFile,
      stores,
      folderPath,
      fileDefaultsByPath.get(file)?.storeNamespace
    );
  }

  const relationIssues = validateStoreRelationsIntegrity(stores);
  if (relationIssues.length > 0) {
    if (!errorsByFile['__stores__']) {
      errorsByFile['__stores__'] = [];
    }
    for (const issue of relationIssues) {
      errorsByFile['__stores__'].push({
        file: '__stores__',
        ...issue
      });
    }
  }

  const routeOwners = config?.strictDuplicates
    ? new Map<string, string>()
    : undefined;

  const mockApis: Api[] = [];
  const recordingApis: Api[] = [];

  for (const [file, entry] of parsed) {
    const target = entry.source === 'mock' ? mockApis : recordingApis;
    processMockData(
      file,
      entry.data,
      errorsByFile,
      warningsByFile,
      target,
      stores,
      fileDefaultsByPath.get(file),
      entry.source === 'mock' ? routeOwners : undefined,
      entry.source
    );
  }

  const mockRouteKeys = new Set(
    mockApis.map((api) => `${ api.method }:${ api.route }`)
  );

  for (const api of recordingApis) {
    const routeKey = `${ api.method }:${ api.route }`;

    if (mockRouteKeys.has(routeKey) && recordingsMode === 'include') {
      logWarning(
        `Recording skipped (mock wins): [${ api.method.toUpperCase() }] ${ api.route } from ${ api.sourceFile }`
      );
      continue;
    }

    mockData.push(api);
  }

  mockData.unshift(...mockApis);

  const totalWarnings = getAllIssues(warningsByFile);
  const totalErrors = getAllIssues(errorsByFile);

  if (hasItems(totalWarnings)) {
    const warningMessage = formatIssues(warningsByFile);
    logWarning(`Warnings:`, { lineBreakStart: true });
    logWarning(warningMessage, { showIcon: false, isBold: false, lineBreakEnd: isEmpty(totalErrors) });
  }

  if (hasItems(totalErrors)) {
    const errorMessage = formatIssues(errorsByFile);
    logError(`Error:`, { lineBreakStart: true });
    logError(errorMessage, { showIcon: false, isBold: false, lineBreakEnd: true });
    throw new Error('Invalid mock configuration');
  }

  return {
    apis: mockData,
    stores: [...stores.values()],
    config
  };
};
