import { Request } from 'express';
import { MockMatch, MockResponseConfig } from '../interfaces/data.interface';
import { isObject } from './guards.script';
import { JsonValue } from '../types/json.type';

const matchesPartial = (expected: unknown, actual: unknown): boolean => {
  if (expected === null || typeof expected !== 'object') {
    if (expected === actual) {
      return true;
    }

    if (expected === undefined || actual === undefined) {
      return false;
    }

    return String(expected) === String(actual);
  }

  if (Array.isArray(expected)) {
    if (!Array.isArray(actual) || actual.length < expected.length) {
      return false;
    }

    return expected.every((item, index) => matchesPartial(item, actual[index]));
  }

  if (!isObject(actual)) {
    return false;
  }

  const actualObject = actual as Record<string, unknown>;

  return Object.entries(expected).every(([key, value]) => {
    return key in actualObject && matchesPartial(value, actualObject[key]);
  });
};

const matchesParams = (
  expected: Record<string, JsonValue>,
  params: Request['params']
): boolean => {
  return Object.entries(expected).every(([key, value]) => {
    const actual = params[key];

    if (actual === undefined) {
      return false;
    }

    const actualValue = Array.isArray(actual) ? actual[0] : actual;

    return String(value) === String(actualValue);
  });
};

const matchesQuery = (
  expected: Record<string, JsonValue>,
  query: Request['query']
): boolean => {
  return Object.entries(expected).every(([key, value]) => {
    const actual = query[key];

    if (actual === undefined) {
      return false;
    }

    const actualValue = Array.isArray(actual) ? actual[0] : actual;

    if (actualValue === undefined || actualValue === null || typeof actualValue === 'object') {
      return matchesPartial(value, actualValue);
    }

    return String(value) === String(actualValue);
  });
};

export const matchesRequest = (match: MockMatch, req: Request): boolean => {
  const hasParams = isObject(match.params);
  const hasQuery = isObject(match.query);
  const hasBody = match.body !== undefined;

  if (!hasParams && !hasQuery && !hasBody) {
    return false;
  }

  if (hasParams && !matchesParams(match.params as Record<string, JsonValue>, req.params)) {
    return false;
  }

  if (hasQuery && !matchesQuery(match.query as Record<string, JsonValue>, req.query)) {
    return false;
  }

  if (hasBody && !matchesPartial(match.body, req.body)) {
    return false;
  }

  return true;
};

export const selectResponse = (
  responses: MockResponseConfig[],
  nameResponse: string,
  req: Request
): MockResponseConfig => {
  const matchedResponse = responses.find(response => {
    return response.match !== undefined && matchesRequest(response.match, req);
  });

  if (matchedResponse) {
    return matchedResponse;
  }

  const fallbackResponse = responses.find(response => response.name === nameResponse);

  if (!fallbackResponse) {
    throw new Error(
      `Fallback response "${ nameResponse }" was not found in the responses array`
    );
  }

  return fallbackResponse;
};
