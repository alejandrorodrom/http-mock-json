import { RawMockResponse } from '../interfaces/data.interface';
import {
  ERROR_FORMAT_SET,
  ERROR_FORMATS,
  FIELD_TYPES,
  FIELD_TYPE_SET,
  FILE_FORMAT_ALIASES,
  REQUEST_AS_SET,
  REQUEST_AS_VALUES,
  STRING_FIELD_FORMAT_SET,
  STRING_FIELD_FORMATS,
  resolveFileFormat
} from '../constants/request.constant';
import { LocalIssue, MethodValidationResult } from '../types/validation.type';
import { FieldRule, FieldSchema, RawMockRequest, RawRequestError } from '../types/request.type';
import {
  hasProperty,
  isArray,
  isEmpty,
  isExisting,
  isObject,
  isValidNumber
} from '../scripts/guards.script';
import { getKeys } from '../scripts/objects.script';
import { isWholeBodyPayload, isRuleObject, parseKey, toFieldRule } from '../scripts/request-key.script';

const NUMBER_RULES: Array<keyof FieldRule> = [
  'minLength',
  'maxLength',
  'min',
  'max',
  'minItems',
  'maxItems',
  'maxSize',
  'minSize'
];

const push = (
  errors: LocalIssue[],
  endpoint: string,
  method: string,
  message: string
): void => {
  errors.push({ endpoint, method, message });
};

const FILE_FORMAT_RE = /^[\w.+-]+\/([\w.+-]+|\*)$/;

const isValidFileFormat = (format: string): boolean => {
  const normalized = format.trim().toLowerCase();

  if (normalized in FILE_FORMAT_ALIASES) {
    return true;
  }

  return FILE_FORMAT_RE.test(resolveFileFormat(normalized));
};

const checkFileFormat = (
  endpoint: string,
  method: string,
  label: string,
  format: unknown,
  errors: LocalIssue[]
): void => {
  const values = Array.isArray(format) ? format : [format];

  if (isEmpty(values) || !values.every((item) => typeof item === 'string' && item.length > 0)) {
    push(errors, endpoint, method, `The "${ label }.format" must be a non-empty string or array of strings`);
    return;
  }

  for (const item of values) {
    if (!isValidFileFormat(String(item))) {
      push(
        errors,
        endpoint,
        method,
        `The "${ label }.format" value "${ item }" must be a MIME type, wildcard (e.g. image/*), or known alias`
      );
    }
  }
};

const checkField = (
  endpoint: string,
  method: string,
  location: string,
  key: string,
  schema: FieldSchema,
  errors: LocalIssue[]
): void => {
  const { path } = parseKey(key);
  const label = `${ location }.${ path }`;
  const rule = toFieldRule(schema);

  if (!rule) {
    push(errors, endpoint, method, `The "${ label }" field must be a type string or a rule object with "type"`);
    return;
  }

  if (!FIELD_TYPE_SET.has(rule.type)) {
    push(errors, endpoint, method, `The "${ label }.type" must be one of: ${ FIELD_TYPES.join(', ') }`);
    return;
  }

  for (const name of NUMBER_RULES) {
    if (!hasProperty(rule, name)) {
      continue;
    }

    const value = rule[name];
    if (!isValidNumber(value) || Number(value) < 0) {
      push(errors, endpoint, method, `The "${ label }.${ name }" must be a non-negative number`);
    }
  }

  const hasLengthRules = hasProperty(rule, 'minLength') || hasProperty(rule, 'maxLength');

  if (hasLengthRules && rule.type !== 'string') {
    push(
      errors,
      endpoint,
      method,
      `The "${ label }" string rules (minLength, maxLength) require type "string"`
    );
  }

  if ((hasProperty(rule, 'min') || hasProperty(rule, 'max')) && rule.type !== 'number') {
    push(errors, endpoint, method, `The "${ label }" range rules (min, max) require type "number"`);
  }

  if (
    (hasProperty(rule, 'minItems') || hasProperty(rule, 'maxItems'))
    && rule.type !== 'array'
    && rule.type !== 'file'
  ) {
    push(
      errors,
      endpoint,
      method,
      `The "${ label }" rules (minItems, maxItems) require type "array" or "file"`
    );
  }

  if (hasProperty(rule, 'items') && rule.type !== 'array') {
    push(errors, endpoint, method, `The "${ label }.items" requires type "array"`);
  }

  if (hasProperty(rule, 'properties') && rule.type !== 'object') {
    push(errors, endpoint, method, `The "${ label }.properties" requires type "object"`);
  }

  if (hasProperty(rule, 'maxSize') || hasProperty(rule, 'minSize') || hasProperty(rule, 'requireFilename')) {
    if (rule.type !== 'file') {
      push(errors, endpoint, method, `The "${ label }" file rules (maxSize, minSize, requireFilename) require type "file"`);
    }
  }

  if (hasProperty(rule, 'pattern')) {
    if (rule.type !== 'string' && rule.type !== 'file') {
      push(errors, endpoint, method, `The "${ label }.pattern" requires type "string" or "file"`);
    } else if (typeof rule.pattern !== 'string' || rule.pattern.length === 0) {
      push(errors, endpoint, method, `The "${ label }.pattern" must be a non-empty string`);
    } else {
      try {
        new RegExp(rule.pattern);
      } catch {
        push(errors, endpoint, method, `The "${ label }.pattern" is not a valid regular expression`);
      }
    }
  }

  if (hasProperty(rule, 'format')) {
    if (rule.type === 'string') {
      if (typeof rule.format !== 'string' || !STRING_FIELD_FORMAT_SET.has(rule.format)) {
        push(
          errors,
          endpoint,
          method,
          `The "${ label }.format" must be one of: ${ STRING_FIELD_FORMATS.join(', ') }`
        );
      }
    } else if (rule.type === 'file') {
      checkFileFormat(endpoint, method, label, rule.format, errors);
    } else {
      push(errors, endpoint, method, `The "${ label }.format" requires type "string" or "file"`);
    }
  }

  if (hasProperty(rule, 'enum')) {
    if (!isArray(rule.enum) || isEmpty(rule.enum)) {
      push(errors, endpoint, method, `The "${ label }.enum" must be a non-empty array`);
    } else if (!rule.enum.every(item => typeof item === 'string' || typeof item === 'number')) {
      push(errors, endpoint, method, `The "${ label }.enum" values must be strings or numbers`);
    }
  }

  if (hasProperty(rule, 'message') && typeof rule.message !== 'string') {
    push(errors, endpoint, method, `The "${ label }.message" must be a string`);
  }

  if (hasProperty(rule, 'messages')) {
    if (!isObject(rule.messages) || isEmpty(rule.messages)) {
      push(errors, endpoint, method, `The "${ label }.messages" must be a non-empty object`);
    } else {
      const bad = Object.values(rule.messages).some((value) => typeof value !== 'string');
      if (bad) {
        push(errors, endpoint, method, `The "${ label }.messages" values must be strings`);
      }
    }
  }

  if (hasProperty(rule, 'requireFilename') && typeof rule.requireFilename !== 'boolean') {
    push(errors, endpoint, method, `The "${ label }.requireFilename" must be a boolean`);
  }

  if (hasProperty(rule, 'properties')) {
    if (!isObject(rule.properties) || isEmpty(rule.properties)) {
      push(errors, endpoint, method, `The "${ label }.properties" must be a non-empty object`);
    } else {
      for (const [childKey, childSchema] of Object.entries(rule.properties)) {
        checkField(endpoint, method, label, childKey, childSchema, errors);
      }
    }
  }

  if (hasProperty(rule, 'items') && rule.items !== undefined && rule.type === 'array') {
    checkField(endpoint, method, label, 'items', rule.items, errors);
  }
};

const checkMap = (
  endpoint: string,
  method: string,
  location: string,
  fields: unknown,
  errors: LocalIssue[]
): void => {
  if (!isObject(fields)) {
    push(errors, endpoint, method, `The "${ location }" property must be an object`);
    return;
  }

  if (isEmpty(fields)) {
    push(errors, endpoint, method, `The "${ location }" property must not be empty`);
    return;
  }

  for (const [key, schema] of Object.entries(fields as Record<string, FieldSchema>)) {
    const { path } = parseKey(key);

    if (!path) {
      push(errors, endpoint, method, `The "${ location }" contains an invalid field name`);
      continue;
    }

    checkField(endpoint, method, location, key, schema, errors);
  }
};

const fieldMapHasFile = (fields: unknown): boolean => {
  if (!isObject(fields)) {
    return false;
  }

  return Object.values(fields as Record<string, FieldSchema>).some((schema) => {
    const rule = toFieldRule(schema);
    return rule?.type === 'file';
  });
};

const validateErrorConfig = (
  endpoint: string,
  method: string,
  error: RawRequestError | undefined,
  responses: RawMockResponse[],
  errors: LocalIssue[]
): void => {
  if (!isExisting(error)) {
    return;
  }

  if (!isObject(error)) {
    push(errors, endpoint, method, 'The "request.error" property must be an object');
    return;
  }

  if (isExisting(error.response)) {
    if (typeof error.response !== 'string' || error.response.length === 0) {
      push(errors, endpoint, method, 'The "request.error.response" must be a non-empty string');
    } else if (isArray(responses) && !isEmpty(responses)) {
      const selected = responses.find(response => response.name === error.response);

      if (!selected) {
        push(
          errors,
          endpoint,
          method,
          `The "request.error.response" "${ error.response }" does not exist in responses`
        );
      } else if (hasProperty(selected, 'encoding')) {
        push(
          errors,
          endpoint,
          method,
          'The "request.error.response" cannot reference a response with "encoding"'
        );
      }
    }
  }

  if (isExisting(error.format) && !ERROR_FORMAT_SET.has(String(error.format))) {
    push(errors, endpoint, method, `The "request.error.format" must be one of: ${ ERROR_FORMATS.join(', ') }`);
  }

  if (isExisting(error.key)) {
    if (typeof error.key !== 'string' || error.key.length === 0) {
      push(errors, endpoint, method, 'The "request.error.key" must be a non-empty string');
    }
  }

  if (isExisting(error.detail)) {
    if (typeof error.detail === 'string') {
      if (error.detail.length === 0) {
        push(errors, endpoint, method, 'The "request.error.detail" must be a non-empty string or object');
      }
    } else if (!isObject(error.detail) || isEmpty(error.detail)) {
      push(errors, endpoint, method, 'The "request.error.detail" must be a non-empty string or object');
    } else {
      const badValue = getKeys(error.detail).some(key => {
        return typeof (error.detail as Record<string, unknown>)[key] !== 'string';
      });

      if (badValue) {
        push(errors, endpoint, method, 'The "request.error.detail" object values must be strings');
      }
    }
  }
};

export const validateRequest = (
  endpoint: string,
  method: string,
  request: unknown,
  responses: RawMockResponse[] = []
): MethodValidationResult => {
  const errors: LocalIssue[] = [];
  const warnings: LocalIssue[] = [];

  if (!isObject(request)) {
    push(errors, endpoint, method, 'The "request" property must be an object');
    return { errors, warnings };
  }

  const config = request as Record<string, unknown> & RawMockRequest;

  if (hasProperty(config, 'body')) {
    push(errors, endpoint, method, 'The "request.body" property is not supported; use "payload"');
  }

  if (hasProperty(config, 'invalidResponse')) {
    push(errors, endpoint, method, 'The "request.invalidResponse" property is not supported; use "error.response"');
  }

  if (hasProperty(config, 'errorFormat')) {
    push(errors, endpoint, method, 'The "request.errorFormat" property is not supported; use "error.format"');
  }

  if (hasProperty(config, 'errorDetail')) {
    push(errors, endpoint, method, 'The "request.errorDetail" property is not supported; use "error.detail"');
  }

  if (hasProperty(config, 'errorDetailsKey')) {
    push(errors, endpoint, method, 'The "request.errorDetailsKey" property is not supported; use "error.key"');
  }

  const hasPayload = hasProperty(config, 'payload');
  const hasQuery = hasProperty(config, 'query');
  const hasHeaders = hasProperty(config, 'headers');

  if (!hasPayload && !hasQuery && !hasHeaders) {
    push(
      errors,
      endpoint,
      method,
      'The "request" property must include "payload", "query" and/or "headers"'
    );
    return { errors, warnings };
  }

  if (isExisting(config.as) && !REQUEST_AS_SET.has(String(config.as))) {
    push(
      errors,
      endpoint,
      method,
      `The "request.as" must be one of: ${ REQUEST_AS_VALUES.join(', ') }`
    );
  }

  if (hasPayload) {
    const payload = config.payload;

    if (typeof payload === 'string' || isArray(payload)) {
      checkFileFormat(endpoint, method, 'request.payload', payload, errors);
    } else if (isWholeBodyPayload(payload, config.as)) {
      checkField(endpoint, method, 'request', 'payload', payload as FieldSchema, errors);
    } else if (
      isRuleObject(payload)
      && payload.type !== 'file'
      && Object.keys(payload).some((key) => key !== 'type')
    ) {
      push(
        errors,
        endpoint,
        method,
        'The "request.payload" rule object requires "as": "text" or "as": "raw" (or use type "file")'
      );
    } else if (config.as === 'text' || config.as === 'raw') {
      push(
        errors,
        endpoint,
        method,
        'The "request.payload" must be a single rule object when "as" is "text" or "raw"'
      );
    } else {
      checkMap(endpoint, method, 'request.payload', payload, errors);

      if (fieldMapHasFile(payload) && config.as !== 'multipart') {
        push(
          errors,
          endpoint,
          method,
          'The "request.payload" fields with type "file" require "as": "multipart"'
        );
      }
    }
  }

  if (hasQuery) {
    checkMap(endpoint, method, 'request.query', config.query, errors);
  }

  if (hasHeaders) {
    checkMap(endpoint, method, 'request.headers', config.headers, errors);
  }

  validateErrorConfig(endpoint, method, config.error, responses, errors);

  return { errors, warnings };
};
