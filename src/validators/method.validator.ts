import { RawMockMethod, RawMockResponse } from '../interfaces/data.interface';
import { isArray, isEmpty, isExisting, isObject } from '../scripts/guards.script';
import { VALID_HTTP_METHODS } from '../constants/validation.constant';
import { LocalIssue, MethodValidationResult } from '../types/validation.type';

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

  return { errors, warnings };
};


