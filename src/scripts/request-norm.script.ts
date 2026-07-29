import { ERROR_KEY } from '../constants/request.constant';
import {
  Field,
  FieldSchema,
  MockRequest,
  RawMockRequest,
  Rule
} from '../types/request.type';
import { isObject } from './guards.script';
import { isWholeBodyPayload, parseKey } from './request-key.script';

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
    maxSize: schema.maxSize,
    minSize: schema.minSize,
    requireFilename: schema.requireFilename,
    message: schema.message,
    messages: schema.messages
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
  const error = request.error ?? {};
  const payload = request.payload;

  let fields: Field[] | undefined;
  let rawPayload: Rule | undefined;

  if (payload !== undefined) {
    if (typeof payload === 'string' || Array.isArray(payload)) {
      rawPayload = {
        type: 'file',
        format: payload
      };
    } else if (isWholeBodyPayload(payload, request.as)) {
      rawPayload = toRule(payload);
    } else if (isObject(payload)) {
      fields = toFields(payload as Record<string, FieldSchema>);
    }
  }

  return {
    as: request.as,
    payload: fields,
    rawPayload,
    query: request.query ? toFields(request.query) : undefined,
    headers: request.headers ? toFields(request.headers) : undefined,
    error: {
      response: error.response,
      format: error.format ?? 'array',
      detail: error.detail,
      key: error.key ?? ERROR_KEY
    }
  };
};
