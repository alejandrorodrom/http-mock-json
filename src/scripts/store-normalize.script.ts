import {
  DEFAULT_LIST_LIMIT_QUERY,
  DEFAULT_LIST_OFFSET,
  DEFAULT_LIST_OFFSET_QUERY,
  DEFAULT_LIST_ORDER,
  DEFAULT_LIST_ORDER_QUERY,
  DEFAULT_LIST_PAGE,
  DEFAULT_LIST_PAGE_QUERY,
  DEFAULT_LIST_PAGE_SIZE,
  DEFAULT_LIST_PAGE_SIZE_ALIASES,
  DEFAULT_LIST_PAGE_SIZE_MAX,
  DEFAULT_LIST_PAGE_SIZE_QUERY,
  DEFAULT_LIST_CURSOR_QUERY,
  DEFAULT_LIST_SEARCH_QUERY,
  DEFAULT_LIST_SORT_FIELD,
  DEFAULT_LIST_SORT_QUERY,
  DEFAULT_STORE_KEY,
  STORE_LIST_FILTER_OP_SET
} from '../constants/store.constant';
import {
  NormalizedUniqueField,
  RawStoreConfig,
  RawStoreKey,
  RawStoreList,
  RawStoreListCursor,
  RawStoreListFilter,
  RawStoreListFilterField,
  RawStoreListObject,
  RawStorePersist,
  RawStoreUnique,
  StoreConflictConfig,
  StoreDefinition,
  StoreItem,
  StoreListConfig,
  StoreListCursorConfig,
  StoreListFilterConfig,
  StoreListFilterFieldConfig,
  StoreListFilterOp,
  StoreListOrder,
  StorePersistConfig,
  StoreUniqueField
} from '../types/store.type';
import { isArray, isObject } from './guards.script';

const defaultPageListConfig = (): StoreListConfig => ({
  page: {
    query: DEFAULT_LIST_PAGE_QUERY,
    default: DEFAULT_LIST_PAGE
  },
  pageSize: {
    query: DEFAULT_LIST_PAGE_SIZE_QUERY,
    default: DEFAULT_LIST_PAGE_SIZE,
    max: DEFAULT_LIST_PAGE_SIZE_MAX,
    aliases: [...DEFAULT_LIST_PAGE_SIZE_ALIASES]
  },
  sort: {
    query: DEFAULT_LIST_SORT_QUERY,
    default: DEFAULT_LIST_SORT_FIELD
  },
  order: {
    query: DEFAULT_LIST_ORDER_QUERY,
    default: DEFAULT_LIST_ORDER
  }
});

const normalizeOrderDefault = (value: unknown): StoreListOrder => {
  if (typeof value === 'string') {
    const normalized = value.toLowerCase();
    if (normalized === 'asc' || normalized === 'desc') {
      return normalized;
    }
  }
  return DEFAULT_LIST_ORDER;
};

export const normalizeList = (
  list: RawStoreList | undefined
): StoreListConfig | undefined | null => {
  if (list === undefined || list === false) {
    return undefined;
  }

  if (list === true) {
    return defaultPageListConfig();
  }

  if (!isObject(list)) {
    return null;
  }

  const raw = list as RawStoreListObject;
  const result: StoreListConfig = {
    sort: {
      query: DEFAULT_LIST_SORT_QUERY,
      default: DEFAULT_LIST_SORT_FIELD
    },
    order: {
      query: DEFAULT_LIST_ORDER_QUERY,
      default: DEFAULT_LIST_ORDER
    }
  };

  const hasPage = raw.page !== undefined;
  const hasPageSize = raw.pageSize !== undefined;
  const hasOffset = raw.offset !== undefined;
  const hasLimit = raw.limit !== undefined;
  const hasCursor = raw.cursor !== undefined && raw.cursor !== false;

  if (!hasPage && !hasPageSize && !hasOffset && !hasLimit && !hasCursor) {
    const defaults = defaultPageListConfig();
    result.page = defaults.page;
    result.pageSize = defaults.pageSize;
  }

  if (hasPage) {
    if (!isObject(raw.page)) {
      return null;
    }
    result.page = {
      query: raw.page.query ?? DEFAULT_LIST_PAGE_QUERY,
      default: raw.page.default ?? DEFAULT_LIST_PAGE
    };
  }

  if (hasPageSize) {
    if (!isObject(raw.pageSize)) {
      return null;
    }
    result.pageSize = {
      query: raw.pageSize.query ?? DEFAULT_LIST_PAGE_SIZE_QUERY,
      default: raw.pageSize.default ?? DEFAULT_LIST_PAGE_SIZE,
      max: raw.pageSize.max ?? DEFAULT_LIST_PAGE_SIZE_MAX,
      aliases: raw.pageSize.aliases ?? [...DEFAULT_LIST_PAGE_SIZE_ALIASES]
    };
  }

  if (hasOffset) {
    if (!isObject(raw.offset)) {
      return null;
    }
    result.offset = {
      query: raw.offset.query ?? DEFAULT_LIST_OFFSET_QUERY,
      default: raw.offset.default ?? DEFAULT_LIST_OFFSET
    };
  }

  if (hasLimit) {
    if (!isObject(raw.limit)) {
      return null;
    }
    result.limit = {
      query: raw.limit.query ?? DEFAULT_LIST_LIMIT_QUERY,
      default: raw.limit.default ?? DEFAULT_LIST_PAGE_SIZE,
      max: raw.limit.max ?? DEFAULT_LIST_PAGE_SIZE_MAX
    };
  }

  if ((hasOffset || hasLimit) && !hasPage && !hasPageSize) {
    if (!result.offset) {
      result.offset = {
        query: DEFAULT_LIST_OFFSET_QUERY,
        default: DEFAULT_LIST_OFFSET
      };
    }
    if (!result.limit) {
      result.limit = {
        query: DEFAULT_LIST_LIMIT_QUERY,
        default: DEFAULT_LIST_PAGE_SIZE,
        max: DEFAULT_LIST_PAGE_SIZE_MAX
      };
    }
  }

  if ((hasPage || hasPageSize) && !hasOffset && !hasLimit) {
    if (!result.page) {
      result.page = {
        query: DEFAULT_LIST_PAGE_QUERY,
        default: DEFAULT_LIST_PAGE
      };
    }
    if (!result.pageSize) {
      result.pageSize = {
        query: DEFAULT_LIST_PAGE_SIZE_QUERY,
        default: DEFAULT_LIST_PAGE_SIZE,
        max: DEFAULT_LIST_PAGE_SIZE_MAX,
        aliases: [...DEFAULT_LIST_PAGE_SIZE_ALIASES]
      };
    }
  }

  if (raw.sort !== undefined) {
    if (!isObject(raw.sort)) {
      return null;
    }
    result.sort = {
      query: raw.sort.query ?? DEFAULT_LIST_SORT_QUERY,
      default: raw.sort.default ?? DEFAULT_LIST_SORT_FIELD,
      ...(raw.sort.fields !== undefined ? { fields: raw.sort.fields } : {})
    };
  }

  if (raw.order !== undefined) {
    if (!isObject(raw.order)) {
      return null;
    }
    result.order = {
      query: raw.order.query ?? DEFAULT_LIST_ORDER_QUERY,
      default: normalizeOrderDefault(raw.order.default ?? DEFAULT_LIST_ORDER)
    };
  }

  if (raw.filter !== undefined) {
    const filter = normalizeListFilter(raw.filter);
    if (!filter) {
      return null;
    }
    result.filter = filter;
  }

  if (raw.cursor !== undefined && raw.cursor !== false) {
    const cursor = normalizeListCursor(raw.cursor);
    if (!cursor) {
      return null;
    }
    result.cursor = cursor;
  }

  return result;
};

const normalizeListCursor = (
  cursor: Exclude<RawStoreListCursor, false>
): StoreListCursorConfig | null => {
  if (cursor === true) {
    return {
      query: DEFAULT_LIST_CURSOR_QUERY,
      limit: {
        query: DEFAULT_LIST_LIMIT_QUERY,
        default: DEFAULT_LIST_PAGE_SIZE,
        max: DEFAULT_LIST_PAGE_SIZE_MAX
      }
    };
  }

  if (!isObject(cursor)) {
    return null;
  }

  if (cursor.limit !== undefined && !isObject(cursor.limit)) {
    return null;
  }

  const limit = cursor.limit !== undefined
    ? {
      query: cursor.limit.query ?? DEFAULT_LIST_LIMIT_QUERY,
      default: cursor.limit.default ?? DEFAULT_LIST_PAGE_SIZE,
      max: cursor.limit.max ?? DEFAULT_LIST_PAGE_SIZE_MAX
    }
    : {
      query: DEFAULT_LIST_LIMIT_QUERY,
      default: DEFAULT_LIST_PAGE_SIZE,
      max: DEFAULT_LIST_PAGE_SIZE_MAX
    };

  return {
    query: cursor.query ?? DEFAULT_LIST_CURSOR_QUERY,
    limit
  };
};

const normalizeFilterField = (
  entry: RawStoreListFilterField
): StoreListFilterFieldConfig | null => {
  if (typeof entry === 'string') {
    if (entry.length === 0) {
      return null;
    }
    return { field: entry, op: 'eq', query: entry };
  }

  if (!isObject(entry)) {
    return null;
  }

  const field = entry.field;
  if (typeof field !== 'string' || field.length === 0) {
    return null;
  }

  const opRaw = entry.op ?? 'eq';
  if (typeof opRaw !== 'string' || !STORE_LIST_FILTER_OP_SET.has(opRaw)) {
    return null;
  }
  const op = opRaw as StoreListFilterOp;

  const query = entry.query ?? field;
  if (typeof query !== 'string' || query.length === 0) {
    return null;
  }

  return { field, op, query };
};

const normalizeFilterFields = (
  entries: RawStoreListFilterField[]
): StoreListFilterFieldConfig[] | null => {
  if (entries.length === 0) {
    return null;
  }

  const fields: StoreListFilterFieldConfig[] = [];
  for (const entry of entries) {
    const normalized = normalizeFilterField(entry);
    if (!normalized) {
      return null;
    }
    fields.push(normalized);
  }
  return fields;
};

const normalizeListFilter = (filter: RawStoreListFilter): StoreListFilterConfig | null => {
  if (isArray(filter)) {
    const fields = normalizeFilterFields(filter);
    if (!fields) {
      return null;
    }
    return { fields };
  }

  if (!isObject(filter)) {
    return null;
  }

  let fields: StoreListFilterFieldConfig[] = [];
  if (filter.fields !== undefined) {
    if (!isArray(filter.fields)) {
      return null;
    }
    const normalized = normalizeFilterFields(filter.fields);
    if (!normalized) {
      return null;
    }
    fields = normalized;
  }

  let or: StoreListFilterFieldConfig[] | undefined;
  if (filter.or !== undefined) {
    if (!isArray(filter.or)) {
      return null;
    }
    const normalized = normalizeFilterFields(filter.or);
    if (!normalized) {
      return null;
    }
    or = normalized;
  }

  let search: StoreListFilterConfig['search'];
  if (filter.search !== undefined) {
    if (!isObject(filter.search) || !isArray(filter.search.fields)) {
      return null;
    }
    search = {
      query: filter.search.query ?? DEFAULT_LIST_SEARCH_QUERY,
      fields: filter.search.fields
    };
  }

  if (fields.length === 0 && !or && !search) {
    return null;
  }

  return { fields, or, search };
};

const normalizeConflict = (value: unknown): StoreConflictConfig | undefined => {
  if (!isObject(value)) {
    return undefined;
  }

  const conflict = value as StoreConflictConfig;
  const result: StoreConflictConfig = {};

  if (typeof conflict.response === 'string') {
    result.response = conflict.response;
  }

  if (typeof conflict.detail === 'string' || isObject(conflict.detail)) {
    result.detail = conflict.detail as StoreConflictConfig['detail'];
  }

  return result;
};

const normalizeUniqueField = (entry: StoreUniqueField): NormalizedUniqueField | null => {
  if (typeof entry === 'string') {
    return entry.length > 0 ? { field: entry } : null;
  }

  if (!isObject(entry) || typeof entry.field !== 'string' || entry.field.length === 0) {
    return null;
  }

  return {
    field: entry.field,
    conflict: normalizeConflict(entry.conflict)
  };
};

export const normalizeUnique = (
  unique: RawStoreUnique
): { fields: NormalizedUniqueField[]; conflict?: StoreConflictConfig } | null => {
  if (isArray(unique)) {
    const fields = unique
      .map(entry => normalizeUniqueField(entry as StoreUniqueField))
      .filter((field): field is NormalizedUniqueField => field !== null);

    return { fields };
  }

  if (!isObject(unique) || !isArray(unique.fields)) {
    return null;
  }

  const fields = unique.fields
    .map(entry => normalizeUniqueField(entry as StoreUniqueField))
    .filter((field): field is NormalizedUniqueField => field !== null);

  return {
    fields,
    conflict: normalizeConflict(unique.conflict)
  };
};

export const normalizeKey = (
  key: RawStoreKey | undefined
): { fields: string[]; conflict?: StoreConflictConfig } | null => {
  if (key === undefined) {
    return { fields: [DEFAULT_STORE_KEY] };
  }

  if (typeof key === 'string') {
    return key.length > 0 ? { fields: [key] } : null;
  }

  if (isArray(key)) {
    const fields = key.filter((item): item is string => typeof item === 'string' && item.length > 0);
    return fields.length > 0 ? { fields } : null;
  }

  if (!isObject(key)) {
    return null;
  }

  if (isArray(key.fields)) {
    const fields = key.fields.filter((item): item is string => typeof item === 'string' && item.length > 0);
    if (fields.length === 0) {
      return null;
    }

    return {
      fields,
      conflict: normalizeConflict(key.conflict)
    };
  }

  if (typeof key.field === 'string' && key.field.length > 0) {
    return {
      fields: [key.field],
      conflict: normalizeConflict(key.conflict)
    };
  }

  return null;
};

export const isStoreReference = (store: RawStoreConfig): boolean => {
  const keys = Object.keys(store);
  return keys.length === 1 && keys[0] === 'id';
};

export const normalizePersist = (
  persist: RawStorePersist | undefined
): StorePersistConfig | undefined | null => {
  if (persist === undefined) {
    return undefined;
  }

  if (typeof persist === 'boolean') {
    return persist ? { enabled: true } : { enabled: false };
  }

  if (!isObject(persist) || typeof persist.enabled !== 'boolean') {
    return null;
  }

  if (persist.file !== undefined) {
    if (typeof persist.file !== 'string' || persist.file.length === 0) {
      return null;
    }
  }

  return {
    enabled: persist.enabled,
    file: persist.file
  };
};

export const normalizeStoreDefinition = (store: RawStoreConfig): StoreDefinition | null => {
  if (typeof store.id !== 'string' || store.id.length === 0) {
    return null;
  }

  const key = normalizeKey(store.key);
  if (!key) {
    return null;
  }

  let uniqueFields: NormalizedUniqueField[] = [];
  let uniqueConflict: StoreConflictConfig | undefined;

  if (store.unique !== undefined) {
    const unique = normalizeUnique(store.unique);
    if (!unique) {
      return null;
    }
    uniqueFields = unique.fields;
    uniqueConflict = unique.conflict;
  }

  const seed: StoreItem[] = [];
  if (store.seed !== undefined) {
    if (!isArray(store.seed)) {
      return null;
    }

    for (const item of store.seed) {
      if (!isObject(item)) {
        return null;
      }
      seed.push(item as StoreItem);
    }
  }

  let template: StoreItem | undefined;
  if (store.template !== undefined) {
    if (!isObject(store.template)) {
      return null;
    }
    template = store.template as StoreItem;
  }

  const persist = normalizePersist(store.persist);
  if (persist === null) {
    return null;
  }

  const list = normalizeList(store.list);
  if (list === null) {
    return null;
  }

  return {
    id: store.id,
    keyFields: key.fields,
    keyConflict: key.conflict,
    seed,
    template,
    uniqueFields,
    uniqueConflict,
    persist: persist?.enabled ? persist : undefined,
    list
  };
};
