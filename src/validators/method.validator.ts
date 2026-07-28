import { RawMockMethod, RawMockResponse } from '../interfaces/data.interface';
import {
  hasProperty,
  isArray,
  isEmpty,
  isExisting,
  isObject,
  isPositiveInt
} from '../scripts/guards.script';
import { VALID_HTTP_METHODS } from '../constants/validation.constant';
import { LocalIssue, MethodValidationResult } from '../types/validation.type';
import { validateDelay } from './delay.validator';
import { validateProxyValue } from './proxy.validator';
import { validateRequest } from './request.validator';

const serializeCallBy = (by: unknown): string | undefined => {
  if (!isObject(by)) {
    return undefined;
  }

  const byObject = by as Record<string, unknown>;
  const key = (['body', 'query', 'params'] as const).find(candidate => {
    return hasProperty(byObject, candidate);
  });

  if (key === undefined || typeof byObject[key] !== 'string') {
    return undefined;
  }

  return `${ key }:${ byObject[key] }`;
};

const collectCallMeta = (
  responses: RawMockResponse[]
): { byKeys: string[]; indexes: number[]; hasLoop: boolean } => {
  const byKeys: string[] = [];
  const indexes: number[] = [];
  let hasLoop = false;

  for (const response of responses) {
    if (!isObject(response) || !isExisting(response.match) || !isObject(response.match)) {
      continue;
    }

    const match = response.match as Record<string, unknown>;

    if (!hasProperty(match, 'call')) {
      continue;
    }

    const call = match.call;

    if (isPositiveInt(call)) {
      indexes.push(call);
      continue;
    }

    if (!isObject(call)) {
      continue;
    }

    const callObject = call as Record<string, unknown>;

    if (isPositiveInt(callObject.index)) {
      indexes.push(callObject.index);
    }

    if (callObject.loop === true) {
      hasLoop = true;
    }

    if (hasProperty(callObject, 'by')) {
      const key = serializeCallBy(callObject.by);

      if (key !== undefined) {
        byKeys.push(key);
      }
    }
  }

  return { byKeys, indexes, hasLoop };
};

const validateCallConsistency = (
  endpoint: string,
  method: string,
  responses: RawMockResponse[]
): MethodValidationResult => {
  const errors: LocalIssue[] = [];
  const warnings: LocalIssue[] = [];
  const { byKeys, indexes, hasLoop } = collectCallMeta(responses);

  if (new Set(byKeys).size > 1) {
    errors.push({
      endpoint,
      method,
      message: 'All "match.call.by" values in a method must be identical'
    });
  }

  if (hasLoop && indexes.length > 0) {
    const maxIndex = Math.max(...indexes);
    const unique = new Set(indexes);
    const dense = unique.size === maxIndex
      && [...unique].every(index => index >= 1 && index <= maxIndex);

    if (!dense) {
      warnings.push({
        endpoint,
        method,
        message: 'When "match.call.loop" is true, "index" values should be contiguous from 1 to max'
      });
    }
  }

  return { errors, warnings };
};

export const validateMethod = (
  endpoint: string,
  method: string,
  methodData: RawMockMethod
): MethodValidationResult => {
  const errors: LocalIssue[] = [];
  const warnings: LocalIssue[] = [];

  if (!VALID_HTTP_METHODS.includes(method.toUpperCase())) {
    errors.push({
      endpoint,
      method,
      message: `Invalid HTTP method. Valid methods: ${ VALID_HTTP_METHODS.join(', ') }`
    });
  }

  if (!isObject(methodData)) {
    errors.push({
      endpoint,
      method,
      message: 'The method must be an object'
    });

    return { errors, warnings };
  }

  if (!isExisting(methodData.nameResponse)) {
    errors.push({
      endpoint,
      method,
      message: 'Missing property "nameResponse"'
    });
  }

  if (isExisting(methodData.delay)) {
    errors.push(...validateDelay(endpoint, method, methodData.delay));
  }

  if (isExisting(methodData.proxy)) {
    errors.push(...validateProxyValue(endpoint, method, methodData.proxy, { allowTrue: false }));
  }

  if (!isExisting(methodData.responses)) {
    errors.push({
      endpoint,
      method,
      message: 'Missing property "responses"'
    });

    return { errors, warnings };
  }

  if (!isArray(methodData.responses)) {
    errors.push({
      endpoint,
      method,
      message: 'The "responses" property must be an array'
    });

    return { errors, warnings };
  }

  if (isEmpty(methodData.responses)) {
    errors.push({
      endpoint,
      method,
      message: 'The responses array is empty'
    });

    return { errors, warnings };
  }

  if (methodData.nameResponse) {
    const nameResponseExists = methodData.responses.some(
      (response: RawMockResponse) => response.name === methodData.nameResponse,
    );

    if (!nameResponseExists) {
      errors.push({
        endpoint,
        method,
        message: `The "nameResponse" "${ methodData.nameResponse }" does not exist in responses`
      });
    }
  }

  if (isExisting(methodData.request)) {
    const requestResult = validateRequest(
      endpoint,
      method,
      methodData.request,
      methodData.responses
    );
    errors.push(...requestResult.errors);
    warnings.push(...requestResult.warnings);
  }

  const callConsistency = validateCallConsistency(endpoint, method, methodData.responses);
  errors.push(...callConsistency.errors);
  warnings.push(...callConsistency.warnings);

  return { errors, warnings };
};
