import { RawMockResponse } from '../interfaces/data.interface';
import { hasProperty, isExisting, isObject, isValidNumber } from '../scripts/guards.script';
import { VALID_STATUS_CODES } from '../constants/validation.constant';
import { LocalIssue, ResponseValidationResult } from '../types/validation.type';

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

  if (!isExisting(response.statusCode)) {
    errors.push({
      endpoint,
      method,
      message: 'Missing property "statusCode"'
    });

    return { errors, warnings };
  }

  if (!isValidNumber(response.statusCode)) {
    errors.push({
      endpoint,
      method,
      message: `The "statusCode" "${ response.statusCode }" is not a valid number`
    });

    return { errors, warnings };
  }

  const statusCode = Number(response.statusCode);

  if (!VALID_STATUS_CODES.includes(statusCode)) {
    warnings.push({
      endpoint,
      method,
      message: `The "statusCode" ${ statusCode } is not a standard HTTP status code`
    });
  }

  if (!hasProperty(response, 'body')) {
    errors.push({
      endpoint,
      method,
      message: 'Missing property "body"'
    });
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



