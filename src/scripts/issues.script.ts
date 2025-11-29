import { LocalIssue } from '../types/validation.type';
import { isEmpty } from './guards.script';
import { getAllValues, iterateEntries } from './objects.script';

export const addIssues = (
  issuesByFile: Record<string, LocalIssue[]>,
  file: string,
  issues: LocalIssue[]
): void => {
  if (!isEmpty(issues)) {
    if (!issuesByFile[file]) {
      issuesByFile[file] = [];
    }
    issuesByFile[file].push(...issues);
  }
};

export const getAllIssues = (issuesByFile: Record<string, LocalIssue[]>): LocalIssue[] => {
  return getAllValues(issuesByFile);
};

export const formatIssues = (issuesByFile: Record<string, LocalIssue[]>): string => {
  const messages: string[] = [];

  for (const [file, issues] of iterateEntries(issuesByFile)) {
    if (isEmpty(issues)) {
      continue;
    }

    messages.push(`\nFile: ${file}`);
    for (const issue of issues) {
      const location = issue.endpoint && issue.method
        ? `[${issue.method}] ${issue.endpoint}`
        : issue.endpoint
        ? issue.endpoint
        : '';

      const prefix = location ? `  ${location}: ` : '  ';
      messages.push(`${prefix}${issue.message}`);
    }
  }

  return messages.join('\n');
};
