import { FIELD_TYPE_SET } from '../constants/request.constant';
import { FieldRule, FieldSchema, FieldType } from '../types/request.type';
import { isObject } from './guards.script';

export const parseKey = (key: string): { path: string; required: boolean } => {
  if (key.endsWith('?')) {
    return { path: key.slice(0, -1), required: false };
  }

  return { path: key, required: true };
};

export const isFieldType = (value: unknown): value is FieldType => {
  return typeof value === 'string' && FIELD_TYPE_SET.has(value);
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
