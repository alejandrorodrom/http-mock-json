import {
  ErrorFormat,
  FieldType,
  RequestAs,
  StringFieldFormat
} from '../types/request.type';

export const FIELD_TYPES: FieldType[] = [
  'string',
  'number',
  'boolean',
  'object',
  'array',
  'file'
];

export const FIELD_TYPE_SET = new Set<string>(FIELD_TYPES);

export const STRING_FIELD_FORMATS: StringFieldFormat[] = [
  'email',
  'uuid',
  'url',
  'date'
];

export const STRING_FIELD_FORMAT_SET = new Set<string>(STRING_FIELD_FORMATS);

export const FILE_FORMAT_ALIASES: Record<string, string> = {
  png: 'image/png',
  jpeg: 'image/jpeg',
  jpg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif',
  pdf: 'application/pdf',
  file: '*/*',
  '*/*': '*/*',
  'image/*': 'image/*'
};

export const ERROR_FORMATS: ErrorFormat[] = [
  'array',
  'map'
];

export const ERROR_FORMAT_SET = new Set<string>(ERROR_FORMATS);

export const REQUEST_AS_VALUES: RequestAs[] = [
  'json',
  'form',
  'multipart',
  'raw',
  'text'
];

export const REQUEST_AS_SET = new Set<string>(REQUEST_AS_VALUES);

export const ERROR_KEY = 'errors';

export const ERROR_STATUS = 400;

export const ERROR_MESSAGE = 'Invalid request';

export const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{1,63}$/;

export const EMAIL_MAX_LENGTH = 254;

export const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const DATE_RE =
  /^\d{4}-\d{2}-\d{2}(?:[Tt ][\d:.+Zz-]+)?$/;

export const resolveFileFormat = (format: string): string => {
  const normalized = format.trim().toLowerCase();
  return FILE_FORMAT_ALIASES[normalized] ?? format;
};
