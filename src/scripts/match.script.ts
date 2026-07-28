import { Request } from 'express';
import {
  MockMatch,
  MockMatchCall,
  MockMatchCallBy,
  MockResponseConfig
} from '../interfaces/data.interface';
import { isObject } from './guards.script';
import { JsonValue } from '../types/json.type';

const callCounters = new Map<string, number>();

export const resetCallCounters = (): void => {
  callCounters.clear();
};

const nextCall = (key: string): number => {
  const next = (callCounters.get(key) ?? 0) + 1;
  callCounters.set(key, next);
  return next;
};

const clearCall = (key: string): void => {
  callCounters.delete(key);
};

const normalizeCall = (call: number | MockMatchCall): MockMatchCall => {
  if (typeof call === 'number') {
    return { index: call };
  }

  return call;
};

const getPathValue = (source: unknown, path: string): unknown => {
  return path.split('.').reduce<unknown>((current, key) => {
    if (!isObject(current) || !(key in current)) {
      return undefined;
    }

    return (current as Record<string, unknown>)[key];
  }, source);
};

const resolveByScope = (
  req: Request,
  by: MockMatchCallBy | undefined
): string | undefined => {
  if (by === undefined) {
    return undefined;
  }

  let value: unknown;

  if (by.body !== undefined) {
    value = getPathValue(req.body, by.body);
  } else if (by.query !== undefined) {
    value = getPathValue(req.query, by.query);
  } else if (by.params !== undefined) {
    value = getPathValue(req.params, by.params);
  } else {
    return undefined;
  }

  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value === 'object') {
    return undefined;
  }

  return String(value);
};

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

export const matchesRequest = (
  match: MockMatch,
  req: Request,
  callNumber?: number
): boolean => {
  const hasParams = isObject(match.params);
  const hasQuery = isObject(match.query);
  const hasBody = match.body !== undefined;
  const hasCall = match.call !== undefined;

  if (!hasParams && !hasQuery && !hasBody && !hasCall) {
    return false;
  }

  if (hasCall) {
    const call = normalizeCall(match.call as number | MockMatchCall);

    if (call.index !== undefined) {
      if (callNumber === undefined || call.index !== callNumber) {
        return false;
      }
    }
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
  req: Request,
  callKey?: string
): MockResponseConfig => {
  const callConfigs = responses
    .filter((response): response is MockResponseConfig & { match: MockMatch } => {
      return response.match?.call !== undefined;
    })
    .map(response => normalizeCall(response.match.call as number | MockMatchCall));

  let counterKey: string | undefined;
  let callNumber: number | undefined;

  if (callConfigs.length > 0 && callKey !== undefined) {
    const byConfig = callConfigs.find(config => config.by !== undefined)?.by;
    const scope = resolveByScope(req, byConfig);

    if (byConfig === undefined || scope !== undefined) {
      counterKey = byConfig !== undefined && scope !== undefined
        ? `${ callKey }:${ scope }`
        : callKey;

      const raw = nextCall(counterKey);
      const maxIndex = Math.max(
        0,
        ...callConfigs.map(config => config.index ?? 0)
      );
      const loop = callConfigs.some(config => config.loop === true);

      callNumber = loop && maxIndex >= 1
        ? ((raw - 1) % maxIndex) + 1
        : raw;
    }
  }

  const matchedResponse = responses.find(response => {
    return response.match !== undefined && matchesRequest(response.match, req, callNumber);
  });

  if (matchedResponse) {
    if (matchedResponse.match?.call !== undefined && counterKey !== undefined) {
      const call = normalizeCall(matchedResponse.match.call);

      if (call.reset === true) {
        clearCall(counterKey);
      }
    }

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
