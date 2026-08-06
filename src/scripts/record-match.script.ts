import { JsonValue } from '../types/json.type';
import { RecordMatchMultipart, RecordRequestContext } from '../types/recordings.type';
import { isArray, isObject } from './guards.script';

export type RecordedMatch = {
  params?: Record<string, string>;
  query?: Record<string, string>;
  body?: JsonValue;
  headers?: Record<string, string>;
  multipart?: RecordMatchMultipart;
};

const MATCH_BODY_MAX_CHARS = 2000;
const MATCH_MULTIPART_MAX_CHARS = 2000;
const RECORD_MATCH_HEADER_NAMES = ['authorization', 'cookie'] as const;

export const responseDedupeKey = (response: {
  match?: RecordedMatch;
}): string => {
  return JSON.stringify({
    params: response.match?.params ?? {},
    query: response.match?.query ?? {},
    body: response.match?.body ?? null,
    headers: response.match?.headers ?? {},
    multipart: response.match?.multipart ?? {}
  });
};

const pickMatchHeaders = (
  headers: Record<string, string | string[] | undefined> | undefined
): Record<string, string> => {
  const result: Record<string, string> = {};

  if (!headers) {
    return result;
  }

  for (const name of RECORD_MATCH_HEADER_NAMES) {
    const value = Object.entries(headers).find(([key]) => key.toLowerCase() === name)?.[1];

    if (value === undefined) {
      continue;
    }

    const normalized = Array.isArray(value) ? value.join('; ') : String(value);
    if (normalized.length > 0) {
      result[name] = normalized;
    }
  }

  return result;
};

const buildMatchMultipart = (
  multipart: RecordRequestContext['multipart']
): RecordMatchMultipart | undefined => {
  if (!multipart) {
    return undefined;
  }

  const withFiles: RecordMatchMultipart = {};

  for (const [key, files] of Object.entries(multipart.files)) {
    if (!files || files.length === 0) {
      continue;
    }

    const file = files[0];
    withFiles[key] = {
      filename: file.filename ?? null,
      mimeType: file.mimeType ?? null,
      size: file.buffer.length
    };
  }

  const withFields: RecordMatchMultipart = { ...withFiles };

  for (const [key, value] of Object.entries(multipart.fields)) {
    if (key in withFiles) {
      continue;
    }

    withFields[key] = value;
  }

  if (Object.keys(withFields).length === 0) {
    return undefined;
  }

  if (JSON.stringify(withFields).length <= MATCH_MULTIPART_MAX_CHARS) {
    return withFields;
  }

  if (Object.keys(withFiles).length > 0
    && JSON.stringify(withFiles).length <= MATCH_MULTIPART_MAX_CHARS) {
    return withFiles;
  }

  return undefined;
};

export const buildMatch = (
  params: Record<string, string>,
  query: Record<string, string>,
  body: JsonValue | undefined,
  requestHeaders?: Record<string, string | string[] | undefined>,
  multipart?: RecordRequestContext['multipart']
): RecordedMatch | undefined => {
  const match: RecordedMatch = {};

  if (Object.keys(params).length > 0) {
    match.params = params;
  }

  if (Object.keys(query).length > 0) {
    match.query = query;
  }

  if (
    isObject(body)
    && !isArray(body)
    && Object.keys(body).length > 0
    && JSON.stringify(body).length <= MATCH_BODY_MAX_CHARS
  ) {
    match.body = body;
  }

  const matchHeaders = pickMatchHeaders(requestHeaders);
  if (Object.keys(matchHeaders).length > 0) {
    match.headers = matchHeaders;
  }

  const matchMultipart = buildMatchMultipart(multipart);
  if (matchMultipart) {
    match.multipart = matchMultipart;
  }

  if (
    !match.params
    && !match.query
    && !match.body
    && !match.headers
    && !match.multipart
  ) {
    return undefined;
  }

  return match;
};

export const matchNameSuffix = (match: RecordedMatch): string => {
  const keys = [
    ...Object.keys(match.query ?? {}),
    ...Object.keys(match.params ?? {}),
    ...Object.keys(match.multipart ?? {}),
    ...Object.keys(match.headers ?? {})
  ];

  return keys.join('-') || 'match';
};
