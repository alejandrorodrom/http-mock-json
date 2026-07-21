import { RawMockResponse } from '../interfaces/data.interface';
import {
  ERROR_FORMAT_SET,
  ERROR_FORMATS,
  FIELD_FORMAT_SET,
  FIELD_FORMATS,
  FIELD_TYPE_SET,
  FIELD_TYPES
} from '../constants/request.constant';
import { LocalIssue, MethodValidationResult } from '../types/validation.type';
import { FieldRule, FieldSchema, RawMockRequest } from '../types/request.type';
import {
  hasProperty,
  isArray,
  isEmpty,
  isExisting,
  isObject,
  isValidNumber
} from '../scripts/guards.script';
import { getKeys } from '../scripts/objects.script';
import { parseKey, toFieldRule } from '../scripts/request-key.script';

const NUMBER_RULES: Array<keyof FieldRule> = [
  'minLength',
  'maxLength',
  'min',
  'max',
  'minItems',
  'maxItems'
];

const push = (
  errors: LocalIssue[],
  endpoint: string,
  method: string,
  message: string
): void => {
  errors.push({ endpoint, method, message });
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

  const hasStringRules = hasProperty(rule, 'minLength')
    || hasProperty(rule, 'maxLength')
    || hasProperty(rule, 'format')
    || hasProperty(rule, 'pattern');

  if (hasStringRules && rule.type !== 'string') {
    push(
      errors,
      endpoint,
      method,
      `The "${ label }" string rules (minLength, maxLength, pattern, format) require type "string"`
    );
  }

  if ((hasProperty(rule, 'min') || hasProperty(rule, 'max')) && rule.type !== 'number') {
    push(errors, endpoint, method, `The "${ label }" range rules (min, max) require type "number"`);
  }

  const hasArrayRules = hasProperty(rule, 'minItems')
    || hasProperty(rule, 'maxItems')
    || hasProperty(rule, 'items');

  if (hasArrayRules && rule.type !== 'array') {
    push(
      errors,
      endpoint,
      method,
      `The "${ label }" array rules (minItems, maxItems, items) require type "array"`
    );
  }

  if (hasProperty(rule, 'properties') && rule.type !== 'object') {
    push(errors, endpoint, method, `The "${ label }.properties" requires type "object"`);
  }

  if (hasProperty(rule, 'pattern')) {
    if (typeof rule.pattern !== 'string' || rule.pattern.length === 0) {
      push(errors, endpoint, method, `The "${ label }.pattern" must be a non-empty string`);
    } else {
      try {
        new RegExp(rule.pattern);
      } catch {
        push(errors, endpoint, method, `The "${ label }.pattern" is not a valid regular expression`);
      }
    }
  }

  if (hasProperty(rule, 'format') && !FIELD_FORMAT_SET.has(String(rule.format))) {
    push(errors, endpoint, method, `The "${ label }.format" must be one of: ${ FIELD_FORMATS.join(', ') }`);
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

  if (hasProperty(rule, 'properties')) {
    if (!isObject(rule.properties) || isEmpty(rule.properties)) {
      push(errors, endpoint, method, `The "${ label }.properties" must be a non-empty object`);
    } else {
      for (const [childKey, childSchema] of Object.entries(rule.properties)) {
        checkField(endpoint, method, label, childKey, childSchema, errors);
      }
    }
  }

  if (hasProperty(rule, 'items') && rule.items !== undefined) {
    checkField(endpoint, method, label, 'items', rule.items, errors);
  }
};

const checkMap = (
  endpoint: string,
  method: string,
  location: 'request.body' | 'request.query',
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

  const config = request as RawMockRequest;
  const hasBody = hasProperty(config, 'body');
  const hasQuery = hasProperty(config, 'query');

  if (!hasBody && !hasQuery) {
    push(errors, endpoint, method, 'The "request" property must include "body" and/or "query"');
    return { errors, warnings };
  }

  if (hasBody) {
    checkMap(endpoint, method, 'request.body', config.body, errors);
  }

  if (hasQuery) {
    checkMap(endpoint, method, 'request.query', config.query, errors);
  }

  if (isExisting(config.invalidResponse)) {
    if (typeof config.invalidResponse !== 'string' || config.invalidResponse.length === 0) {
      push(errors, endpoint, method, 'The "request.invalidResponse" must be a non-empty string');
    } else if (isArray(responses) && !isEmpty(responses)) {
      const exists = responses.some(response => response.name === config.invalidResponse);
      if (!exists) {
        push(
          errors,
          endpoint,
          method,
          `The "request.invalidResponse" "${ config.invalidResponse }" does not exist in responses`
        );
      }
    }
  }

  if (isExisting(config.errorFormat) && !ERROR_FORMAT_SET.has(String(config.errorFormat))) {
    push(errors, endpoint, method, `The "request.errorFormat" must be one of: ${ ERROR_FORMATS.join(', ') }`);
  }

  if (isExisting(config.errorDetailsKey)) {
    if (typeof config.errorDetailsKey !== 'string' || config.errorDetailsKey.length === 0) {
      push(errors, endpoint, method, 'The "request.errorDetailsKey" must be a non-empty string');
    }
  }

  if (isExisting(config.errorDetail)) {
    if (typeof config.errorDetail === 'string') {
      if (config.errorDetail.length === 0) {
        push(errors, endpoint, method, 'The "request.errorDetail" must be a non-empty string or object');
      }
    } else if (!isObject(config.errorDetail) || isEmpty(config.errorDetail)) {
      push(errors, endpoint, method, 'The "request.errorDetail" must be a non-empty string or object');
    } else {
      const badValue = getKeys(config.errorDetail).some(key => {
        return typeof (config.errorDetail as Record<string, unknown>)[key] !== 'string';
      });

      if (badValue) {
        push(errors, endpoint, method, 'The "request.errorDetail" object values must be strings');
      }
    }
  }

  return { errors, warnings };
};
