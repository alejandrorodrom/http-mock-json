import { RawMockResponse } from '../interfaces/data.interface';
import {
  hasProperty,
  isEmpty,
  isExisting,
  isObject,
  isPositiveInt,
  isValidNumber
} from '../scripts/guards.script';
import { VALID_STATUS_CODES } from '../constants/validation.constant';
import { LocalIssue, ResponseValidationResult } from '../types/validation.type';
import { validateDelay } from './delay.validator';
import { validateProxyValue } from './proxy.validator';
import { validateAction } from './action.validator';

const validateCallBy = (
  endpoint: string,
  method: string,
  by: unknown
): LocalIssue[] => {
  if (!isObject(by)) {
    return [{
      endpoint,
      method,
      message: 'The "match.call.by" property must be an object'
    }];
  }

  const byObject = by as Record<string, unknown>;
  const keys = (['body', 'query', 'params'] as const).filter(key => hasProperty(byObject, key));

  if (keys.length !== 1) {
    return [{
      endpoint,
      method,
      message: 'The "match.call.by" property must include exactly one of "body", "query", or "params"'
    }];
  }

  const key = keys[0];
  const value = byObject[key];

  if (typeof value !== 'string' || value.trim() === '') {
    return [{
      endpoint,
      method,
      message: `The "match.call.by.${ key }" property must be a non-empty string`
    }];
  }

  return [];
};

const validateCall = (
  endpoint: string,
  method: string,
  call: unknown
): LocalIssue[] => {
  if (isPositiveInt(call)) {
    return [];
  }

  if (!isObject(call)) {
    return [{
      endpoint,
      method,
      message: 'The "match.call" property must be a positive integer (>= 1) or an object'
    }];
  }

  const callObject = call as Record<string, unknown>;
  const hasIndex = hasProperty(callObject, 'index');
  const hasBy = hasProperty(callObject, 'by');
  const hasLoop = hasProperty(callObject, 'loop');
  const hasReset = hasProperty(callObject, 'reset');
  const errors: LocalIssue[] = [];

  if (hasIndex && !isPositiveInt(callObject.index)) {
    errors.push({
      endpoint,
      method,
      message: 'The "match.call.index" property must be a positive integer (>= 1)'
    });
  }

  if (hasLoop && typeof callObject.loop !== 'boolean') {
    errors.push({
      endpoint,
      method,
      message: 'The "match.call.loop" property must be a boolean'
    });
  }

  if (hasReset && typeof callObject.reset !== 'boolean') {
    errors.push({
      endpoint,
      method,
      message: 'The "match.call.reset" property must be a boolean'
    });
  }

  const resetEnabled = hasReset && callObject.reset === true;

  if (!hasIndex && !resetEnabled) {
    errors.push({
      endpoint,
      method,
      message: 'The "match.call" object must include "index" and/or "reset": true'
    });
  }

  if (hasBy) {
    errors.push(...validateCallBy(endpoint, method, callObject.by));
  }

  return errors;
};

const isResetOnlyCall = (call: unknown): boolean => {
  if (!isObject(call)) {
    return false;
  }

  const callObject = call as Record<string, unknown>;

  return !hasProperty(callObject, 'index') && callObject.reset === true;
};

const validateMatch = (
  endpoint: string,
  method: string,
  match: unknown
): LocalIssue[] => {
  const errors: LocalIssue[] = [];

  if (!isObject(match)) {
    errors.push({
      endpoint,
      method,
      message: 'The "match" property must be an object'
    });

    return errors;
  }

  const matchObject = match as Record<string, unknown>;
  const hasParams = hasProperty(matchObject, 'params');
  const hasQuery = hasProperty(matchObject, 'query');
  const hasBody = hasProperty(matchObject, 'body');
  const hasCall = hasProperty(matchObject, 'call');

  if (!hasParams && !hasQuery && !hasBody && !hasCall) {
    errors.push({
      endpoint,
      method,
      message: 'The "match" property must include "params", "query", "body" and/or "call"'
    });

    return errors;
  }

  if (hasParams) {
    if (!isObject(matchObject.params)) {
      errors.push({
        endpoint,
        method,
        message: 'The "match.params" property must be an object'
      });
    } else if (isEmpty(matchObject.params)) {
      errors.push({
        endpoint,
        method,
        message: 'The "match.params" property must not be empty'
      });
    }
  }

  if (hasQuery) {
    if (!isObject(matchObject.query)) {
      errors.push({
        endpoint,
        method,
        message: 'The "match.query" property must be an object'
      });
    } else if (isEmpty(matchObject.query)) {
      errors.push({
        endpoint,
        method,
        message: 'The "match.query" property must not be empty'
      });
    }
  }

  if (hasCall) {
    errors.push(...validateCall(endpoint, method, matchObject.call));

    if (
      isResetOnlyCall(matchObject.call)
      && !hasParams
      && !hasQuery
      && !hasBody
    ) {
      errors.push({
        endpoint,
        method,
        message: 'A "match.call" with only "reset": true must also include "params", "query" and/or "body"'
      });
    }
  }

  return errors;
};

const validateStatusCode = (
  endpoint: string,
  method: string,
  statusCodeValue: string | number
): ResponseValidationResult => {
  const errors: LocalIssue[] = [];
  const warnings: LocalIssue[] = [];

  if (!isValidNumber(statusCodeValue)) {
    errors.push({
      endpoint,
      method,
      message: `The "statusCode" "${ statusCodeValue }" is not a valid number`
    });

    return { errors, warnings };
  }

  const statusCode = Number(statusCodeValue);

  if (!VALID_STATUS_CODES.includes(statusCode)) {
    warnings.push({
      endpoint,
      method,
      message: `The "statusCode" ${ statusCode } is not a standard HTTP status code`
    });
  }

  return { errors, warnings };
};

export const validateResponse = (
  endpoint: string,
  method: string,
  response: RawMockResponse,
  hasStore = false,
  hasSoftDelete = false
): ResponseValidationResult => {
  const errors: LocalIssue[] = [];
  const warnings: LocalIssue[] = [];

  if (!isObject(response)) {
    errors.push({
      endpoint,
      method,
      message: 'The response must be an object'
    });

    return { errors, warnings };
  }

  if (!isExisting(response.name)) {
    errors.push({
      endpoint,
      method,
      message: 'Missing property "name"'
    });
  }

  const hasProxy = hasProperty(response, 'proxy');
  const actionResult = validateAction(endpoint, method, response, hasStore, hasSoftDelete);
  errors.push(...actionResult.errors);
  warnings.push(...actionResult.warnings);
  const hasAction = hasProperty(response, 'action') && isEmpty(actionResult.errors);

  if (hasProxy) {
    errors.push(...validateProxyValue(endpoint, method, response.proxy));
  }

  if (isExisting(response.statusCode)) {
    const statusResult = validateStatusCode(endpoint, method, response.statusCode);
    errors.push(...statusResult.errors);
    warnings.push(...statusResult.warnings);

    if (!isEmpty(statusResult.errors)) {
      return { errors, warnings };
    }
  } else if (!hasProxy) {
    errors.push({
      endpoint,
      method,
      message: 'Missing property "statusCode"'
    });

    return { errors, warnings };
  }

  if (!hasProxy && !hasAction && !hasProperty(response, 'body')) {
    errors.push({
      endpoint,
      method,
      message: 'Missing property "body"'
    });
  }

  if (isExisting(response.delay)) {
    errors.push(...validateDelay(endpoint, method, response.delay, 'delay'));
  }

  if (isExisting(response.match)) {
    errors.push(...validateMatch(endpoint, method, response.match));
  }

  if (!isExisting(response.headers)) {
    return { errors, warnings };
  }

  if (!isObject(response.headers)) {
    errors.push({
      endpoint,
      method,
      message: 'The "headers" property must be an object'
    });
  }

  return { errors, warnings };
};
