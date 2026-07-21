import { RawMockMethod, RawMockResponse } from '../interfaces/data.interface';
import { isArray, isEmpty, isExisting, isObject } from '../scripts/guards.script';
import { VALID_HTTP_METHODS } from '../constants/validation.constant';
import { LocalIssue, MethodValidationResult } from '../types/validation.type';
import { validateDelay } from './delay.validator';
import { validateProxyValue } from './proxy.validator';
import { validateRequest } from './request.validator';

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

  return { errors, warnings };
};


