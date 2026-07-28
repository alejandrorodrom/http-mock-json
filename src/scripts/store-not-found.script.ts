import { MockResponseConfig } from '../interfaces/data.interface';
import {
  DEFAULT_NOT_FOUND_MESSAGE,
  DEFAULT_NOT_FOUND_STATUS
} from '../constants/store.constant';
import { JsonValue } from '../types/json.type';
import { StoreNotFoundContext } from '../types/store.type';
import { isObject } from './guards.script';

const formatValue = (value: JsonValue): string => {
  if (Array.isArray(value) || (value !== null && typeof value === 'object')) {
    return JSON.stringify(value);
  }
  return String(value);
};

const applyNotFoundTemplate = (
  template: string,
  context: StoreNotFoundContext
): string => {
  let result = template
    .replace(/\{\{message\}\}/g, DEFAULT_NOT_FOUND_MESSAGE)
    .replace(/\{\{key\}\}/g, context.key ?? '');

  for (const field of context.fields) {
    const value = context.values[field];
    const rendered = value === undefined ? '' : formatValue(value);
    result = result.replace(new RegExp(`\\{\\{${ field }\\}\\}`, 'g'), rendered);
  }

  return result;
};

const replacePlaceholders = (
  value: JsonValue,
  context: StoreNotFoundContext
): JsonValue => {
  if (typeof value === 'string') {
    return applyNotFoundTemplate(value, context);
  }

  if (Array.isArray(value)) {
    return value.map(item => replacePlaceholders(item, context));
  }

  if (isObject(value)) {
    const result: Record<string, JsonValue> = {};
    for (const [key, nested] of Object.entries(value as Record<string, JsonValue>)) {
      result[key] = replacePlaceholders(nested, context);
    }
    return result;
  }

  return value;
};

export const buildStoreNotFoundResponse = (
  context: StoreNotFoundContext,
  responses: MockResponseConfig[],
  responseName?: string
): MockResponseConfig => {
  if (responseName) {
    const selected = responses.find(response => response.name === responseName);
    if (!selected) {
      throw new Error(
        `Store notFound response "${ responseName }" was not found in the responses array`
      );
    }

    return {
      name: selected.name,
      status: selected.status,
      headers: Object.fromEntries(
        Object.entries(selected.headers).map(([header, headerValue]) => [
          header,
          applyNotFoundTemplate(headerValue, context)
        ])
      ),
      body: replacePlaceholders(selected.body, context),
      delay: selected.delay
    };
  }

  return {
    name: '__store_not_found__',
    status: DEFAULT_NOT_FOUND_STATUS,
    headers: {},
    body: {
      message: DEFAULT_NOT_FOUND_MESSAGE
    }
  };
};
