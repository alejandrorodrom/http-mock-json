export const isObject = (value: unknown): value is object => {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
};

export const isExisting = (value: unknown): boolean => {
  return value !== undefined && value !== null;
};

export const isEmpty = (value: unknown): boolean => {
  if (Array.isArray(value)) {
    return value.length === 0;
  }
  if (isObject(value)) {
    return Object.keys(value).length === 0;
  }
  return false;
};

export const isValidNumber = (value: unknown): value is number => {
  if (typeof value === 'number') {
    return !isNaN(value);
  }
  const num = Number(value);
  return !isNaN(num);
};

export const isArray = (value: unknown): value is unknown[] => {
  return Array.isArray(value);
};

export const hasItems = <T>(array: T[]): boolean => {
  return array.length > 0;
};

