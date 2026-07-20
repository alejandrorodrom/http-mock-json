import { RawMockResponse } from '../interfaces/data.interface';
import { hasProperty, isEmpty, isExisting, isObject, isValidNumber } from '../scripts/guards.script';
import { VALID_STATUS_CODES } from '../constants/validation.constant';
import { LocalIssue, ResponseValidationResult } from '../types/validation.type';
import { validateDelay } from './delay.validator';
import { validateProxyValue } from './proxy.validator';

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

  if (!hasParams && !hasQuery && !hasBody) {
    errors.push({
      endpoint,
      method,
      message: 'The "match" property must include "params", "query" and/or "body"'
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
  response: RawMockResponse
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

  if (!hasProxy && !hasProperty(response, 'body')) {
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
