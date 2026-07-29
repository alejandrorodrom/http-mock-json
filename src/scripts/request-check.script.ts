import { Request } from 'express';
import {
  DATE_RE,
  EMAIL_RE,
  UUID_RE
} from '../constants/request.constant';
import {
  Field,
  FieldType,
  MockRequest,
  ParsedMultipartFile,
  RequestIssue,
  Rule
} from '../types/request.type';
import { contentTypeMatchesAs, detectRequestAs, headerMap } from './content-type.script';
import { isObject } from './guards.script';
import { checkFileValue, resolveRuleMessage } from './request-check-file.script';

const getByPath = (value: unknown, path: string): unknown => {
  if (!path) {
    return value;
  }

  let current: unknown = value;

  for (const segment of path.split('.')) {
    if (current === null || current === undefined) {
      return undefined;
    }

    if (Array.isArray(current)) {
      const index = Number(segment);
      if (!Number.isInteger(index)) {
        return undefined;
      }
      current = current[index];
      continue;
    }

    if (!isObject(current)) {
      return undefined;
    }

    current = (current as Record<string, unknown>)[segment];
  }

  return current;
};

const valueType = (value: unknown): FieldType | 'null' | 'undefined' => {
  if (value === null) {
    return 'null';
  }
  if (value === undefined) {
    return 'undefined';
  }
  if (Array.isArray(value)) {
    return 'array';
  }

  const type = typeof value;
  if (type === 'string' || type === 'number' || type === 'boolean' || type === 'object') {
    return type;
  }

  return 'undefined';
};

const coerceQuery = (value: unknown, type: FieldType): unknown => {
  let current = Array.isArray(value) && type !== 'array' ? value[0] : value;

  if (typeof current !== 'string') {
    return current;
  }

  if (type === 'number') {
    const parsed = Number(current);
    return Number.isNaN(parsed) ? current : parsed;
  }

  if (type === 'boolean') {
    if (current === 'true') {
      return true;
    }
    if (current === 'false') {
      return false;
    }
  }

  return current;
};

const matchFormat = (value: string, format: string): boolean => {
  switch (format) {
    case 'email':
      return EMAIL_RE.test(value);
    case 'uuid':
      return UUID_RE.test(value);
    case 'url': {
      try {
        const url = new URL(value);
        return url.protocol === 'http:' || url.protocol === 'https:';
      } catch {
        return false;
      }
    }
    case 'date':
      return DATE_RE.test(value) && !Number.isNaN(Date.parse(value));
    default:
      return false;
  }
};

const defaultMsg = (issue: Omit<RequestIssue, 'message'>): string => {
  const { path, rule, expected } = issue;

  switch (rule) {
    case 'required':
      return `${ path } is required`;
    case 'type':
      return `${ path } must be ${ expected }`;
    case 'minLength':
      return `${ path } must have minLength ${ expected }`;
    case 'maxLength':
      return `${ path } must have maxLength ${ expected }`;
    case 'min':
      return `${ path } must be >= ${ expected }`;
    case 'max':
      return `${ path } must be <= ${ expected }`;
    case 'pattern':
      return `${ path } must match pattern ${ expected }`;
    case 'format':
      return `${ path } must be a valid ${ Array.isArray(expected) ? expected.join(', ') : expected }`;
    case 'enum':
      return `${ path } must be one of: ${ Array.isArray(expected) ? expected.join(', ') : expected }`;
    case 'minItems':
      return `${ path } must have minItems ${ expected }`;
    case 'maxItems':
      return `${ path } must have maxItems ${ expected }`;
    case 'contentType':
      return `request content-type must be ${ expected }`;
    default:
      return `${ path } is invalid`;
  }
};

const addIssue = (
  issues: RequestIssue[],
  path: string,
  ruleName: string,
  expected: unknown,
  received: unknown,
  message?: string
): void => {
  const partial = { path, rule: ruleName, expected, received };
  issues.push({
    ...partial,
    message: message || defaultMsg(partial)
  });
};

const checkValue = (
  path: string,
  value: unknown,
  required: boolean,
  rule: Rule,
  issues: RequestIssue[],
  asQuery: boolean
): void => {
  if (rule.type === 'file') {
    checkFileValue(path, value, required, rule, issues);
    return;
  }

  const actual = asQuery ? coerceQuery(value, rule.type) : value;
  const fail = (name: string, expected: unknown, received: unknown) => {
    addIssue(issues, path, name, expected, received, resolveRuleMessage(rule, name));
  };

  if (actual === undefined || actual === null) {
    if (required) {
      fail('required', true, actual);
    }
    return;
  }

  const type = valueType(actual);
  if (type !== rule.type) {
    fail('type', rule.type, type);
    return;
  }

  if (rule.type === 'string' && typeof actual === 'string') {
    if (rule.minLength !== undefined && actual.length < rule.minLength) {
      fail('minLength', rule.minLength, actual.length);
    }
    if (rule.maxLength !== undefined && actual.length > rule.maxLength) {
      fail('maxLength', rule.maxLength, actual.length);
    }
    if (rule.pattern && !rule.pattern.test(actual)) {
      fail('pattern', rule.pattern.source, actual);
    }
    if (rule.format && typeof rule.format === 'string' && !matchFormat(actual, rule.format)) {
      fail('format', rule.format, actual);
    }
  }

  if (rule.type === 'number' && typeof actual === 'number') {
    if (rule.min !== undefined && actual < rule.min) {
      fail('min', rule.min, actual);
    }
    if (rule.max !== undefined && actual > rule.max) {
      fail('max', rule.max, actual);
    }
  }

  if (rule.enum && !rule.enum.includes(actual as string | number)) {
    fail('enum', rule.enum, actual);
  }

  if (rule.type === 'array' && Array.isArray(actual)) {
    if (rule.minItems !== undefined && actual.length < rule.minItems) {
      fail('minItems', rule.minItems, actual.length);
    }
    if (rule.maxItems !== undefined && actual.length > rule.maxItems) {
      fail('maxItems', rule.maxItems, actual.length);
    }
    if (rule.items) {
      actual.forEach((item, index) => {
        checkValue(`${ path }.${ index }`, item, true, rule.items as Rule, issues, asQuery);
      });
    }
  }

  if (rule.type === 'object' && isObject(actual) && rule.properties) {
    for (const child of rule.properties) {
      checkValue(
        `${ path }.${ child.path }`,
        getByPath(actual, child.path),
        child.required,
        child.rule,
        issues,
        asQuery
      );
    }
  }
};

const checkFields = (
  fields: Field[],
  data: unknown,
  issues: RequestIssue[],
  asQuery: boolean,
  prefix?: string
): void => {
  for (const field of fields) {
    const path = prefix ? `${ prefix }.${ field.path }` : field.path;
    checkValue(path, getByPath(data, field.path), field.required, field.rule, issues, asQuery);
  }
};

export const checkRequest = (
  request: MockRequest,
  req: Request
): RequestIssue[] => {
  const issues: RequestIssue[] = [];
  const contentType = req.headers['content-type'];
  const contentTypeValue = typeof contentType === 'string' ? contentType : undefined;
  const detected = detectRequestAs(contentTypeValue);

  if (request.as) {
    if (!contentTypeMatchesAs(contentTypeValue, request.as)) {
      addIssue(
        issues,
        'content-type',
        'contentType',
        request.as,
        contentType ?? null
      );
      return issues;
    }
  }

  const mode = request.as ?? detected;

  if (request.rawPayload) {
    if (mode === 'text' || request.rawPayload.type === 'string') {
      const text = req.rawBody ? req.rawBody.toString('utf8') : (
        typeof req.body === 'string' ? req.body : undefined
      );
      checkValue('payload', text, true, request.rawPayload, issues, false);
    } else {
      const file: ParsedMultipartFile | undefined = req.rawBody
        ? {
          fieldname: 'payload',
          mimeType: contentTypeValue ? contentTypeValue.split(';')[0].trim() : undefined,
          buffer: req.rawBody
        }
        : undefined;
      checkValue('payload', file, true, request.rawPayload, issues, false);
    }
  }

  if (request.payload) {
    if (mode === 'multipart') {
      const parsed = req.multipart ?? { fields: {}, files: {} };

      for (const field of request.payload) {
        if (field.rule.type === 'file') {
          checkValue(field.path, parsed.files[field.path], field.required, field.rule, issues, false);
        } else {
          checkValue(field.path, parsed.fields[field.path], field.required, field.rule, issues, true);
        }
      }
    } else if (mode === 'form') {
      checkFields(request.payload, req.body, issues, true);
    } else {
      checkFields(request.payload, req.body, issues, false);
    }
  }

  if (request.query) {
    checkFields(request.query, req.query, issues, true, 'query');
  }

  if (request.headers) {
    const headers = headerMap(req);
    for (const field of request.headers) {
      checkValue(
        field.path,
        headers[field.path.toLowerCase()],
        field.required,
        field.rule,
        issues,
        false
      );
    }
  }

  return issues;
};
