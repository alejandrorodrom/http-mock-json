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

export interface MocksData {
  apis: Api[];
  stores: StoreDefinition[];
  config: MockConfig | null;
}

export const getMocksData = (
  folderPath: string,
  loadedConfig?: LoadMockConfigResult
): MocksData => {
  if (!fs.existsSync(folderPath)) {
    throw new Error('The mocks directory does not exist');
  }

  const errorsByFile: Record<string, ValidationIssue[]> = {};
  const warningsByFile: Record<string, ValidationIssue[]> = {};

  const { config, errors: configErrors } = loadedConfig ?? loadMockConfig(folderPath);
  addIssues(errorsByFile, MOCK_CONFIG_FILENAME, configErrors);

  const { files, errors: discoveryErrors } = discoverMockFiles(folderPath, config);
  addIssues(errorsByFile, MOCK_CONFIG_FILENAME, discoveryErrors);

  if (!files.length) {
    const hasConfigIssues = hasItems(getAllIssues(errorsByFile));
    if (!hasConfigIssues) {
      throw new Error('No files found');
    }
  }

  const mockData: Api[] = [];
  const stores = new Map<string, StoreDefinition>();
  const parsed = new Map<string, RawMockFile>();

  for (const file of files) {
    const data = loadMockFile(file, folderPath, errorsByFile);
    if (data) {
      parsed.set(file, data);
    }
  }

  const fileDefaultsByPath = new Map(
    [...parsed.keys()].map(file => [file, resolveFileDefaults(file, config)])
  );

  for (const [file, data] of parsed) {
    collectStoresFromData(
      file,
      data,
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

  for (const [file, data] of parsed) {
    processMockData(
      file,
      data,
      errorsByFile,
      warningsByFile,
      mockData,
      stores,
      fileDefaultsByPath.get(file),
      routeOwners
    );
  }

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
