import { MockResponseConfig } from '../interfaces/data.interface';
import {
  DEFAULT_CONFLICT_MESSAGE,
  DEFAULT_CONFLICT_STATUS
} from '../constants/store.constant';
import { JsonValue } from '../types/json.type';
import { StoreConflictConfig, StoreConflictItem } from '../types/store.type';
import { isObject } from './guards.script';

const formatConflictValue = (value: JsonValue): string => {
  if (Array.isArray(value) || (value !== null && typeof value === 'object')) {
    return JSON.stringify(value);
  }
  return String(value);
};

const applyConflictTemplate = (
  template: string,
  conflict: StoreConflictItem
): string => {
  const fields = conflict.fields ?? [conflict.field];

  return template
    .replace(/\{\{field\}\}/g, String(conflict.field))
    .replace(/\{\{fields\}\}/g, JSON.stringify(fields))
    .replace(/\{\{value\}\}/g, formatConflictValue(conflict.value))
    .replace(/\{\{message\}\}/g, String(conflict.message));
};

const toConflictDetails = (
  conflicts: StoreConflictItem[],
  detail?: StoreConflictConfig['detail']
): JsonValue => {
  if (typeof detail === 'string') {
    return conflicts.map(conflict => applyConflictTemplate(detail, conflict));
  }

  if (isObject(detail)) {
    return conflicts.map(conflict => {
      const item: Record<string, string> = {};
      for (const [key, template] of Object.entries(detail)) {
        item[key] = applyConflictTemplate(template, conflict);
      }
      return item;
    });
  }

  return conflicts.map(conflict => {
    const detailItem: Record<string, JsonValue> = {
      field: conflict.field,
      value: conflict.value,
      message: conflict.message
    };

    if (conflict.fields && conflict.fields.length > 1) {
      detailItem.fields = conflict.fields;
    }

    return detailItem;
  });
};

const replacePlaceholders = (
  value: JsonValue,
  conflicts: StoreConflictItem[],
  detail?: StoreConflictConfig['detail']
): JsonValue => {
  if (typeof value === 'string') {
    if (value === '{{conflicts}}') {
      return toConflictDetails(conflicts, detail);
    }

    const first = conflicts[0];
    if (!first) {
      return value;
    }

    return applyConflictTemplate(value, first)
      .replace(/\{\{conflicts\}\}/g, JSON.stringify(toConflictDetails(conflicts, detail)));
  }

  if (Array.isArray(value)) {
    return value.map(item => replacePlaceholders(item, conflicts, detail));
  }

  if (isObject(value)) {
    const result: Record<string, JsonValue> = {};
    for (const [key, nested] of Object.entries(value as Record<string, JsonValue>)) {
      result[key] = replacePlaceholders(nested, conflicts, detail);
    }
    return result;
  }

  return value;
};

export const buildStoreConflictResponse = (
  conflicts: StoreConflictItem[],
  responses: MockResponseConfig[],
  responseName?: string,
  detail?: StoreConflictConfig['detail']
): MockResponseConfig => {
  if (responseName) {
    const selected = responses.find(response => response.name === responseName);
    if (!selected) {
      throw new Error(
        `Store conflict response "${ responseName }" was not found in the responses array`
      );
    }

    return {
      name: selected.name,
      status: selected.status,
      headers: selected.headers,
      body: replacePlaceholders(selected.body, conflicts, detail),
      delay: selected.delay
    };
  }

  return {
    name: '__store_conflict__',
    status: DEFAULT_CONFLICT_STATUS,
    headers: {},
    body: {
      message: DEFAULT_CONFLICT_MESSAGE,
      conflicts: toConflictDetails(conflicts, detail)
    }
  };
};
