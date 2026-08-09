import { RawMockEndpoint } from '../types/mock.type';
import { isEmpty, isObject } from '../scripts/guards.script';
import { getKeys } from '../scripts/objects.script';
import { VALID_ENDPOINT_REGEXP } from '../constants/validation.constant';
import { STORE_PROPERTY } from '../constants/store.constant';
import { EndpointValidationResult, LocalIssue } from '../types/validation.type';

export const validateEndpoint = (
  endpoint: string,
  endpointData: RawMockEndpoint
): EndpointValidationResult => {
  const errors: LocalIssue[] = [];
  const warnings: LocalIssue[] = [];

  if (!VALID_ENDPOINT_REGEXP.test(endpoint)) {
    errors.push({
      endpoint,
      message: 'Invalid path. Literals: letters, numbers, "-", "_", ".", "~", "/". Params like ":id" or ":item-id" (letters, numbers, "_", "-" only).'
    });
  }

  if (!isObject(endpointData)) {
    errors.push({
      endpoint,
      message: 'Must be an object'
    });

    return { errors, warnings };
  }

  const methods = getKeys(endpointData).filter(key => key !== STORE_PROPERTY);

  if (isEmpty(methods)) {
    errors.push({
      endpoint,
      message: 'Does not contain any HTTP methods'
    });
  }

  return { errors, warnings };
};
