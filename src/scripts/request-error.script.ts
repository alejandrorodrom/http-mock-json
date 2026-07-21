import { MockResponseConfig } from '../interfaces/data.interface';
import {
  ERROR_MESSAGE,
  ERROR_STATUS
} from '../constants/request.constant';
import { JsonValue } from '../types/json.type';
import { MockRequest, RequestIssue } from '../types/request.type';
import { isObject } from './guards.script';

const applyTemplate = (template: string, issue: RequestIssue): string => {
  return template
    .replace(/\{\{path\}\}/g, String(issue.path))
    .replace(/\{\{rule\}\}/g, String(issue.rule))
    .replace(/\{\{expected\}\}/g, String(issue.expected))
    .replace(/\{\{received\}\}/g, String(issue.received))
    .replace(/\{\{message\}\}/g, String(issue.message));
};

const toArrayErrors = (
  issues: RequestIssue[],
  detail?: Record<string, string> | string
): JsonValue[] => {
  if (typeof detail === 'string') {
    return issues.map(issue => applyTemplate(detail, issue));
  }

  if (isObject(detail)) {
    return issues.map(issue => {
      const item: Record<string, string> = {};
      for (const [key, template] of Object.entries(detail)) {
        item[key] = applyTemplate(template, issue);
      }
      return item;
    });
  }

  return issues.map(issue => ({
    path: issue.path,
    rule: issue.rule,
    expected: issue.expected as JsonValue,
    received: issue.received as JsonValue,
    message: issue.message
  }));
};

const toMapErrors = (
  issues: RequestIssue[],
  detail?: Record<string, string> | string
): Record<string, string[]> => {
  const result: Record<string, string[]> = {};

  for (const issue of issues) {
    const message = typeof detail === 'string'
      ? applyTemplate(detail, issue)
      : issue.message;

    if (!result[issue.path]) {
      result[issue.path] = [];
    }
    result[issue.path].push(message);
  }

  return result;
};

const withErrors = (
  body: JsonValue,
  key: string,
  errors: JsonValue
): Record<string, JsonValue> => {
  if (isObject(body)) {
    return {
      ...(body as Record<string, JsonValue>),
      [key]: errors
    };
  }

  return {
    message: ERROR_MESSAGE,
    [key]: errors
  };
};

export const buildRequestError = (
  request: MockRequest,
  issues: RequestIssue[],
  responses: MockResponseConfig[]
): MockResponseConfig => {
  const errors = request.errorFormat === 'map'
    ? toMapErrors(issues, request.errorDetail)
    : toArrayErrors(issues, request.errorDetail);

  const payload = errors as JsonValue;

  if (request.invalidResponse) {
    const selected = responses.find(response => response.name === request.invalidResponse);

    if (!selected) {
      throw new Error(
        `Invalid response "${ request.invalidResponse }" was not found in the responses array`
      );
    }

    return {
      name: selected.name,
      status: selected.status,
      headers: selected.headers,
      body: withErrors(selected.body, request.errorDetailsKey, payload),
      delay: selected.delay
    };
  }

  return {
    name: '__request_error__',
    status: ERROR_STATUS,
    headers: {},
    body: {
      message: ERROR_MESSAGE,
      [request.errorDetailsKey]: payload
    }
  };
};
