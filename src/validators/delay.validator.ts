import { isValidNumber } from '../scripts/guards.script';
import { LocalIssue } from '../types/validation.type';

export const validateDelay = (
  endpoint: string,
  method: string,
  delay: unknown,
  propertyPath = 'delay'
): LocalIssue[] => {
  if (!isValidNumber(delay)) {
    return [{
      endpoint,
      method,
      message: `The "${ propertyPath }" "${ delay }" is not a valid number`
    }];
  }

  if (Number(delay) < 0) {
    return [{
      endpoint,
      method,
      message: `The "${ propertyPath }" must be greater than or equal to 0`
    }];
  }

  return [];
};
