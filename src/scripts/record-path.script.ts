import { NormalizedRecordPath } from '../types/recordings.type';

const VERSION_SEGMENT = /^v\d+$/i;
const NUMERIC_SEGMENT = /^\d+$/;

export const trimPathSlashes = (value: string): string =>
  value.replace(/^\/+|\/+$/g, '');

export const normalizeRecordPath = (pathname: string): NormalizedRecordPath => {
  const trimmed = trimPathSlashes(pathname);
  const rawSegments = trimmed.length === 0 ? [] : trimmed.split('/');
  const params: Record<string, string> = {};
  let idIndex = 0;

  const hasLiteralSegment = rawSegments.some((segment) => (
    !VERSION_SEGMENT.test(segment) && !NUMERIC_SEGMENT.test(segment)
  ));

  if (!hasLiteralSegment) {
    return {
      endpoint: rawSegments.join('/'),
      params: {},
      segments: rawSegments
    };
  }

  const segments = rawSegments.map((segment) => {
    if (VERSION_SEGMENT.test(segment)) {
      return segment;
    }

    if (NUMERIC_SEGMENT.test(segment)) {
      idIndex += 1;
      const paramName = idIndex === 1 ? 'id' : `id${ idIndex }`;
      params[paramName] = segment;
      return `:${ paramName }`;
    }

    return segment;
  });

  return {
    endpoint: segments.join('/'),
    params,
    segments
  };
};

export const stripPrefixFromPath = (
  pathname: string,
  prefix: string | null
): string => {
  if (!prefix) {
    return trimPathSlashes(pathname);
  }

  const normalizedPrefix = trimPathSlashes(prefix);
  const normalizedPath = trimPathSlashes(pathname);

  if (
    normalizedPath === normalizedPrefix
    || normalizedPath.startsWith(`${ normalizedPrefix }/`)
  ) {
    return normalizedPath.slice(normalizedPrefix.length).replace(/^\/+/, '');
  }

  return normalizedPath;
};

export const safeRecordFileBase = (endpoint: string, method: string): string => {
  const safeEndpoint = (endpoint.length > 0 ? endpoint : 'root')
    .replace(/[^A-Za-z0-9._:-]+/g, '__')
    .replace(/:/g, '_');

  return `${ safeEndpoint }__${ method.toUpperCase() }`;
};

export const canonicalQuery = (
  query: Record<string, unknown> | undefined
): Record<string, string> => {
  if (!query) {
    return {};
  }

  const result: Record<string, string> = {};
  const keys = Object.keys(query).sort();

  for (const key of keys) {
    const value = query[key];

    if (value === undefined || value === null) {
      continue;
    }

    if (Array.isArray(value)) {
      result[key] = value.map((item) => String(item)).join(',');
      continue;
    }

    result[key] = String(value);
  }

  return result;
};
