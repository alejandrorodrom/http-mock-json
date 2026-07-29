import { resolveFileFormat } from '../constants/request.constant';
import {
  ParsedMultipartFile,
  RequestIssue,
  Rule
} from '../types/request.type';
import { isObject } from './guards.script';

const isMultipartFile = (value: unknown): value is ParsedMultipartFile => {
  return isObject(value) && Buffer.isBuffer((value as ParsedMultipartFile).buffer);
};

const asFiles = (value: unknown): ParsedMultipartFile[] => {
  if (Array.isArray(value)) {
    return value.filter(isMultipartFile);
  }

  if (isMultipartFile(value)) {
    return [value];
  }

  return [];
};

const mimeMatches = (actual: string | undefined, expected: string): boolean => {
  if (!actual) {
    return expected === '*/*' || expected === 'file';
  }

  const resolved = resolveFileFormat(expected).toLowerCase();
  const normalized = actual.toLowerCase();

  if (resolved === '*/*' || resolved === 'file') {
    return true;
  }

  if (resolved.endsWith('/*')) {
    return normalized.startsWith(resolved.slice(0, -1));
  }

  return normalized === resolved;
};

const defaultFileMsg = (path: string, rule: string, expected: unknown): string => {
  switch (rule) {
    case 'required':
      return `${ path } is required`;
    case 'minItems':
      return `${ path } must have minItems ${ expected }`;
    case 'maxItems':
      return `${ path } must have maxItems ${ expected }`;
    case 'maxSize':
      return `${ path } must have maxSize ${ expected }`;
    case 'minSize':
      return `${ path } must have minSize ${ expected }`;
    case 'requireFilename':
      return `${ path } must include a filename`;
    case 'format':
      return `${ path } must be a valid ${ Array.isArray(expected) ? expected.join(', ') : expected }`;
    case 'pattern':
      return `${ path } must match pattern ${ expected }`;
    default:
      return `${ path } is invalid`;
  }
};

export const resolveRuleMessage = (rule: Rule, name: string): string | undefined => {
  if (rule.messages && rule.messages[name]) {
    return rule.messages[name];
  }

  return rule.message;
};

export const checkFileValue = (
  path: string,
  value: unknown,
  required: boolean,
  rule: Rule,
  issues: RequestIssue[]
): void => {
  const fail = (name: string, expected: unknown, received: unknown) => {
    const message = resolveRuleMessage(rule, name) || defaultFileMsg(path, name, expected);
    issues.push({ path, rule: name, expected, received, message });
  };

  const files = asFiles(value);

  if (files.length === 0) {
    if (required) {
      fail('required', true, undefined);
    }
    return;
  }

  if (rule.minItems !== undefined && files.length < rule.minItems) {
    fail('minItems', rule.minItems, files.length);
  }

  if (rule.maxItems !== undefined && files.length > rule.maxItems) {
    fail('maxItems', rule.maxItems, files.length);
  }

  const formats = rule.format === undefined
    ? undefined
    : Array.isArray(rule.format)
      ? rule.format
      : [rule.format];

  for (const file of files) {
    if (rule.requireFilename && (!file.filename || file.filename.trim() === '')) {
      fail('requireFilename', true, file.filename);
    }

    if (rule.maxSize !== undefined && file.buffer.length > rule.maxSize) {
      fail('maxSize', rule.maxSize, file.buffer.length);
    }

    if (rule.minSize !== undefined && file.buffer.length < rule.minSize) {
      fail('minSize', rule.minSize, file.buffer.length);
    }

    if (formats) {
      const ok = formats.some((format) => mimeMatches(file.mimeType, String(format)));
      if (!ok) {
        fail('format', formats, file.mimeType);
      }
    }

    if (rule.pattern) {
      if (!file.filename || file.filename.trim() === '') {
        fail('pattern', rule.pattern.source, file.filename);
      } else if (!rule.pattern.test(file.filename)) {
        fail('pattern', rule.pattern.source, file.filename);
      }
    }
  }
};
