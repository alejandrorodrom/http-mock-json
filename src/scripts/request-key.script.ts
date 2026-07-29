import { FIELD_TYPE_SET } from '../constants/request.constant';
import { FieldRule, FieldSchema, FieldType, RequestAs } from '../types/request.type';
import { isObject } from './guards.script';

export const RULE_KEYS = new Set([
  'type',
  'minLength',
  'maxLength',
  'min',
  'max',
  'pattern',
  'format',
  'enum',
  'minItems',
  'maxItems',
  'maxSize',
  'minSize',
  'requireFilename',
  'message',
  'messages',
  'properties',
  'items'
]);

export const parseKey = (key: string): { path: string; required: boolean } => {
  if (key.endsWith('?')) {
    return { path: key.slice(0, -1), required: false };
  }

  return { path: key, required: true };
};

export const isFieldType = (value: unknown): value is FieldType => {
  return typeof value === 'string' && FIELD_TYPE_SET.has(value);
};

export const isRuleObject = (value: unknown): value is FieldRule => {
  if (!isObject(value)) {
    return false;
  }

  const record = value as Record<string, unknown>;

  if (typeof record.type !== 'string') {
    return false;
  }

  return Object.keys(record).every((key) => RULE_KEYS.has(key));
};

export const isWholeBodyPayload = (
  payload: unknown,
  as?: RequestAs
): payload is FieldRule => {
  if (!isRuleObject(payload)) {
    return false;
  }

  if (as === 'text' || as === 'raw') {
    return true;
  }

  return payload.type === 'file';
};

export const toFieldRule = (schema: FieldSchema): FieldRule | null => {
  if (typeof schema === 'string') {
    return isFieldType(schema) ? { type: schema } : null;
  }

  if (!isObject(schema)) {
    return null;
  }

  return schema;
};
