import { Request } from 'express';
import { RequestAs } from '../types/request.type';

export const headerMap = (req: Request): Record<string, string> => {
  const result: Record<string, string> = {};

  for (const [key, value] of Object.entries(req.headers)) {
    if (value === undefined) {
      continue;
    }

    result[key.toLowerCase()] = Array.isArray(value) ? value.join(', ') : value;
  }

  return result;
};

export const detectRequestAs = (contentType: string | undefined): RequestAs | null => {
  if (!contentType) {
    return null;
  }

  const normalized = contentType.split(';')[0].trim().toLowerCase();

  if (normalized === 'application/json' || normalized.endsWith('+json')) {
    return 'json';
  }

  if (normalized === 'application/x-www-form-urlencoded') {
    return 'form';
  }

  if (normalized === 'multipart/form-data') {
    return 'multipart';
  }

  if (normalized === 'text/plain') {
    return 'text';
  }

  if (
    normalized.startsWith('image/')
    || normalized === 'application/pdf'
    || normalized === 'application/octet-stream'
    || normalized.startsWith('audio/')
    || normalized.startsWith('video/')
  ) {
    return 'raw';
  }

  return null;
};

export const contentTypeMatchesAs = (
  contentType: string | undefined,
  expected: RequestAs
): boolean => {
  const detected = detectRequestAs(contentType);

  if (expected === 'raw') {
    return detected === 'raw' || (detected === null && Boolean(contentType));
  }

  return detected === expected;
};
