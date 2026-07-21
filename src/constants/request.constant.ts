import { ErrorFormat, FieldFormat, FieldType } from '../types/request.type';

export const FIELD_TYPES: FieldType[] = [
  'string',
  'number',
  'boolean',
  'object',
  'array'
];

export const FIELD_TYPE_SET = new Set<string>(FIELD_TYPES);

export const FIELD_FORMATS: FieldFormat[] = [
  'email',
  'uuid',
  'url',
  'date'
];

export const FIELD_FORMAT_SET = new Set<string>(FIELD_FORMATS);

export const ERROR_FORMATS: ErrorFormat[] = [
  'array',
  'map'
];

export const ERROR_FORMAT_SET = new Set<string>(ERROR_FORMATS);

export const ERROR_KEY = 'errors';

export const ERROR_STATUS = 400;

export const ERROR_MESSAGE = 'Invalid request';

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const DATE_RE =
  /^\d{4}-\d{2}-\d{2}(?:[Tt ][\d:.+Zz-]+)?$/;
