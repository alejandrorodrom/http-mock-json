import { JsonValue } from '../types/json.type';
import { StoreListResult } from '../types/store.type';
import { isObject } from './guards.script';

const PLACEHOLDER_KEYS = [
  'items',
  'total',
  'page',
  'pageSize',
  'offset',
  'limit',
  'totalPages',
  'sort',
  'order',
  'self',
  'next',
  'previous',
  'hasNext',
  'hasPrevious',
  'linkHeader',
  'nextCursor',
  'hasMore'
] as const;

type PlaceholderKey = typeof PLACEHOLDER_KEYS[number];

const PLACEHOLDER_KEY_SET = new Set<string>(PLACEHOLDER_KEYS);

const placeholderMap = (result: StoreListResult): Record<PlaceholderKey, JsonValue> => ({
  items: result.items,
  total: result.total,
  page: result.page,
  pageSize: result.pageSize,
  offset: result.offset,
  limit: result.limit,
  totalPages: result.totalPages,
  sort: result.sort,
  order: result.order,
  self: result.self,
  next: result.next,
  previous: result.previous,
  hasNext: result.hasNext,
  hasPrevious: result.hasPrevious,
  linkHeader: result.linkHeader,
  nextCursor: result.nextCursor,
  hasMore: result.hasMore
});

const formatInlinePlaceholder = (key: PlaceholderKey, values: Record<PlaceholderKey, JsonValue>): string => {
  const value = values[key];
  if (key === 'items') {
    return JSON.stringify(value);
  }
  if (value === null || value === undefined) {
    return '';
  }
  return String(value);
};

const replaceListPlaceholders = (
  value: JsonValue,
  values: Record<PlaceholderKey, JsonValue>
): JsonValue => {
  if (typeof value === 'string') {
    for (const key of PLACEHOLDER_KEYS) {
      if (value === `{{${ key }}}`) {
        return values[key] ?? null;
      }
    }

    return value.replace(/\{\{(\w+)\}\}/g, (match, key: string) => {
      if (!PLACEHOLDER_KEY_SET.has(key)) {
        return match;
      }
      return formatInlinePlaceholder(key as PlaceholderKey, values);
    });
  }

  if (Array.isArray(value)) {
    return value.map(item => replaceListPlaceholders(item, values));
  }

  if (isObject(value)) {
    const result: Record<string, JsonValue> = {};
    for (const [key, nested] of Object.entries(value as Record<string, JsonValue>)) {
      result[key] = replaceListPlaceholders(nested, values);
    }
    return result;
  }

  return value;
};

export const applyListTemplate = (
  template: JsonValue,
  result: StoreListResult
): JsonValue => replaceListPlaceholders(template, placeholderMap(result));

export const applyListHeaderTemplate = (
  headers: Record<string, string>,
  result: StoreListResult
): Record<string, string> => {
  const values = placeholderMap(result);
  const mapped: Record<string, string> = {};

  for (const [key, value] of Object.entries(headers)) {
    const replaced = replaceListPlaceholders(value, values);
    if (replaced === null || replaced === undefined) {
      mapped[key] = '';
      continue;
    }
    mapped[key] = typeof replaced === 'string' ? replaced : String(replaced);
  }

  return mapped;
};
