import { ERROR_KEY } from '../constants/request.constant';
import {
  Field,
  FieldSchema,
  MockRequest,
  RawMockRequest,
  Rule
} from '../types/request.type';
import { isObject } from './guards.script';
import { parseKey } from './request-key.script';

const toRule = (schema: FieldSchema): Rule => {
  if (typeof schema === 'string') {
    return { type: schema };
  }

  const rule: Rule = {
    type: schema.type,
    minLength: schema.minLength,
    maxLength: schema.maxLength,
    min: schema.min,
    max: schema.max,
    format: schema.format,
    enum: schema.enum,
    minItems: schema.minItems,
    maxItems: schema.maxItems,
    message: schema.message
  };

  if (typeof schema.pattern === 'string' && schema.pattern.length > 0) {
    rule.pattern = new RegExp(schema.pattern);
  }

  if (schema.properties && isObject(schema.properties)) {
    rule.properties = toFields(schema.properties);
  }

  if (schema.items !== undefined) {
    rule.items = toRule(schema.items);
  }

  return rule;
};

const toFields = (fields: Record<string, FieldSchema>): Field[] => {
  return Object.entries(fields).map(([key, schema]) => {
    const { path, required } = parseKey(key);

    return {
      path,
      required,
      rule: toRule(schema)
    };
  });
};

export const normalizeRequest = (request: RawMockRequest): MockRequest => {
  return {
    body: request.body ? toFields(request.body) : undefined,
    query: request.query ? toFields(request.query) : undefined,
    invalidResponse: request.invalidResponse,
    errorFormat: request.errorFormat ?? 'array',
    errorDetail: request.errorDetail,
    errorDetailsKey: request.errorDetailsKey ?? ERROR_KEY
  };
};
