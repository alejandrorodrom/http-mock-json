import path from 'path';
import * as fs from 'fs';
import { Api } from '../../../models/api.model';
import { ValidationIssue } from '../../../interfaces/validation.interface';
import { logError, logWarning } from '../../../scripts/log.script';
import { hasItems, isEmpty } from '../../../scripts/guards.script';
import { processFile } from './process-file';
import { formatIssues, getAllIssues } from '../../../scripts/issues.script';

export const getMocksData = (folderPath: string): Api[] => {
  if (!fs.existsSync(folderPath)) {
    throw Error('The directory named mocks does not exist');
  }

  const files = fs.readdirSync(folderPath).filter(file => path.extname(file) === '.json');

  if (!files.length) {
    throw Error('No files found');
  }

  const errorsByFile: Record<string, ValidationIssue[]> = {};
  const warningsByFile: Record<string, ValidationIssue[]> = {};
  const mockData: Api[] = [];

  for (const file of files) {
    processFile(file, folderPath, errorsByFile, warningsByFile, mockData);
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
    process.exit(1);
  }

  return mockData;
}
