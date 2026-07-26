import path from 'path';
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
import { formatIssues, getAllIssues } from '../../../scripts/issues.script';
import { StoreDefinition } from '../../../types/store.type';
import { RawMockFile } from '../../../types/mock.type';

export interface MocksData {
  apis: Api[];
  stores: StoreDefinition[];
}

export const getMocksData = (folderPath: string): MocksData => {
  if (!fs.existsSync(folderPath)) {
    throw new Error('The directory named mocks does not exist');
  }

  const files = fs.readdirSync(folderPath).filter(file => path.extname(file) === '.json');

  if (!files.length) {
    throw new Error('No files found');
  }

  const errorsByFile: Record<string, ValidationIssue[]> = {};
  const warningsByFile: Record<string, ValidationIssue[]> = {};
  const mockData: Api[] = [];
  const stores = new Map<string, StoreDefinition>();
  const parsed = new Map<string, RawMockFile>();

  for (const file of files) {
    const data = loadMockFile(file, folderPath, errorsByFile);
    if (data) {
      parsed.set(file, data);
    }
  }

  for (const [file, data] of parsed) {
    collectStoresFromData(file, data, errorsByFile, stores, folderPath);
  }

  for (const [file, data] of parsed) {
    processMockData(file, data, errorsByFile, warningsByFile, mockData, stores);
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
    stores: [...stores.values()]
  };
};
