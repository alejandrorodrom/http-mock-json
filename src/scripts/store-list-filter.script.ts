import { Request } from 'express';
import { JsonValue } from '../types/json.type';
import {
  StoreItem,
  StoreListConfig,
  StoreListFilterFieldConfig,
  StoreListSortSpec
} from '../types/store.type';
import { isObject } from './guards.script';
import { queryValue, queryValues } from './store-list-query.script';

export const getItemValue = (item: StoreItem, path: string): JsonValue | undefined => {
  const parts = path.split('.').filter(part => part.length > 0);
  if (parts.length === 0) {
    return undefined;
  }

  let current: unknown = item;
  for (const part of parts) {
    if (!isObject(current) || !(part in current)) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }

  return current as JsonValue;
};

export const compareValues = (
  left: JsonValue | undefined,
  right: JsonValue | undefined
): number => {
  if (left === undefined || left === null) {
    return right === undefined || right === null ? 0 : 1;
  }
  if (right === undefined || right === null) {
    return -1;
  }

  if (typeof left === 'number' && typeof right === 'number') {
    return left - right;
  }

  if (typeof left === 'boolean' && typeof right === 'boolean') {
    return Number(left) - Number(right);
  }

  const leftNumber = typeof left === 'string' && left !== '' && !Number.isNaN(Number(left))
    ? Number(left)
    : null;
  const rightNumber = typeof right === 'string' && right !== '' && !Number.isNaN(Number(right))
    ? Number(right)
    : null;

  if (leftNumber !== null && rightNumber !== null) {
    return leftNumber - rightNumber;
  }

  return String(left).localeCompare(String(right));
};

const parseFilterNumber = (
  raw: string,
  label: string
): { ok: true; value: number } | { ok: false; message: string } => {
  if (raw.trim().length === 0 || Number.isNaN(Number(raw))) {
    return { ok: false, message: `Query "${ label }" must be a number` };
  }
  return { ok: true, value: Number(raw) };
};

type ResolvedFilterRule =
  | { kind: 'skip' }
  | { kind: 'error'; message: string }
  | { kind: 'match'; matches: (item: StoreItem) => boolean };

const resolveFilterRule = (
  rule: StoreListFilterFieldConfig,
  req: Request
): ResolvedFilterRule => {
  if (rule.op === 'in') {
    const values = queryValues(req.query, rule.query);
    if (values === undefined) {
      return { kind: 'skip' };
    }
    if (values.length === 0) {
      return { kind: 'error', message: `Query "${ rule.query }" must not be empty` };
    }
    const allowed = new Set(values);
    return {
      kind: 'match',
      matches: item => {
        const current = getItemValue(item, rule.field);
        if (current === undefined || current === null) {
          return false;
        }
        return allowed.has(String(current));
      }
    };
  }

  const value = queryValue(req.query, rule.query);
  if (value === undefined) {
    return { kind: 'skip' };
  }
  if (value.length === 0) {
    return { kind: 'error', message: `Query "${ rule.query }" must not be empty` };
  }

  if (rule.op === 'eq') {
    return {
      kind: 'match',
      matches: item => {
        const current = getItemValue(item, rule.field);
        if (current === undefined || current === null) {
          return false;
        }
        return String(current) === value;
      }
    };
  }

  if (rule.op === 'ne') {
    return {
      kind: 'match',
      matches: item => {
        const current = getItemValue(item, rule.field);
        if (current === undefined || current === null) {
          return true;
        }
        return String(current) !== value;
      }
    };
  }

  const parsed = parseFilterNumber(value, rule.query);
  if (!parsed.ok) {
    return { kind: 'error', message: parsed.message };
  }

  return {
    kind: 'match',
    matches: item => {
      const current = getItemValue(item, rule.field);
      if (current === undefined || current === null) {
        return false;
      }
      const cmp = compareValues(current, parsed.value);
      switch (rule.op) {
        case 'gt':
          return cmp > 0;
        case 'gte':
          return cmp >= 0;
        case 'lt':
          return cmp < 0;
        case 'lte':
          return cmp <= 0;
        default:
          return false;
      }
    }
  };
};

export const sortStoreItems = (
  items: StoreItem[],
  specs: StoreListSortSpec[],
  keyFields: string[] = []
): StoreItem[] => {
  return [...items].sort((a, b) => {
    for (const spec of specs) {
      const direction = spec.order === 'asc' ? 1 : -1;
      const compared = direction * compareValues(
        getItemValue(a, spec.field),
        getItemValue(b, spec.field)
      );
      if (compared !== 0) {
        return compared;
      }
    }

    for (const field of keyFields) {
      const compared = compareValues(getItemValue(a, field), getItemValue(b, field));
      if (compared !== 0) {
        return compared;
      }
    }

    return 0;
  });
};

export const filterStoreItems = (
  items: StoreItem[],
  config: StoreListConfig,
  req: Request
): { ok: true; items: StoreItem[] } | { ok: false; message: string } => {
  const filter = config.filter;
  if (!filter) {
    return { ok: true, items };
  }

  let result = items;

  for (const rule of filter.fields) {
    const resolved = resolveFilterRule(rule, req);
    if (resolved.kind === 'skip') {
      continue;
    }
    if (resolved.kind === 'error') {
      return { ok: false, message: resolved.message };
    }
    result = result.filter(resolved.matches);
  }

  if (filter.or && filter.or.length > 0) {
    const matchers: Array<(item: StoreItem) => boolean> = [];
    for (const rule of filter.or) {
      const resolved = resolveFilterRule(rule, req);
      if (resolved.kind === 'skip') {
        continue;
      }
      if (resolved.kind === 'error') {
        return { ok: false, message: resolved.message };
      }
      matchers.push(resolved.matches);
    }
    if (matchers.length > 0) {
      result = result.filter(item => matchers.some(matches => matches(item)));
    }
  }

  if (filter.search) {
    const term = queryValue(req.query, filter.search.query);
    if (term !== undefined && term.length > 0) {
      const needle = term.toLowerCase();
      result = result.filter(item => filter.search!.fields.some(field => {
        const raw = getItemValue(item, field);
        if (raw === undefined || raw === null) {
          return false;
        }
        return String(raw).toLowerCase().includes(needle);
      }));
    }
  }

  return { ok: true, items: result };
};
