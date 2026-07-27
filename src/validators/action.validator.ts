import { STORE_ACTIONS, STORE_ACTION_SET } from '../constants/store.constant';
import { LocalIssue, ResponseValidationResult } from '../types/validation.type';
import { hasProperty } from '../scripts/guards.script';
import { RawMockResponse } from '../interfaces/data.interface';

export const validateAction = (
  endpoint: string,
  method: string,
  response: RawMockResponse,
  hasStore: boolean
): ResponseValidationResult => {
  const errors: LocalIssue[] = [];
  const warnings: LocalIssue[] = [];

  if (!hasProperty(response, 'action')) {
    return { errors, warnings };
  }

  const action = (response as { action?: unknown }).action;

  if (typeof action !== 'string' || !STORE_ACTION_SET.has(action)) {
    errors.push({
      endpoint,
      method,
      message: `The "action" must be one of: ${ STORE_ACTIONS.join(', ') }`
    });
    return { errors, warnings };
  }

  if (!hasStore) {
    errors.push({
      endpoint,
      method,
      message: 'The "action" property requires a "store" on the endpoint'
    });
  }

  if (hasProperty(response, 'proxy')) {
    errors.push({
      endpoint,
      method,
      message: 'The "action" property cannot be used together with "proxy"'
    });
  }

  if (hasProperty(response, 'body') && action !== 'list') {
    warnings.push({
      endpoint,
      method,
      message: 'The "body" property is ignored when "action" is set'
    });
  }

  if (
    action === 'delete'
    && hasProperty(response, 'statusCode')
    && Number(response.statusCode) !== 204
  ) {
    warnings.push({
      endpoint,
      method,
      message: 'The "statusCode" is ignored for action "delete" (always responds with 204)'
    });
  }

  return { errors, warnings };
};
