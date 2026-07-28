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
  DEFAULT_SOFT_DELETE_FIELD,
  DEFAULT_RELATION_ON_DELETE,
  DEFAULT_RELATION_TYPE,
  STORE_LIST_FILTER_OP_SET,
  STORE_RELATION_ON_DELETE_SET,
  STORE_RELATION_TYPE_SET
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
  RawStoreRelation,
  RawStoreRelationEmbed,
  RawStoreRelationJoin,
  RawStoreRelationOnDelete,
  RawStoreRelations,
  RawRelationJoinColumns,
  RawStoreSoftDelete,
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
  StoreNotFoundConfig,
  StorePersistConfig,
  StoreRelationConfig,
  StoreRelationOnDelete,
  StoreRelationType,
  StoreSoftDeleteConfig,
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

export const normalizeConflict = (value: unknown): StoreConflictConfig | undefined => {
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

export const normalizeRelations = (
  relations: RawStoreRelations | undefined
): StoreRelationConfig[] | null => {
  if (relations === undefined) {
    return [];
  }

  if (!isObject(relations)) {
    return null;
  }

  const result: StoreRelationConfig[] = [];

  for (const [name, raw] of Object.entries(relations)) {
    if (typeof name !== 'string' || name.length === 0) {
      return null;
    }

    const normalized = normalizeRelationEntry(name, raw as RawStoreRelation);
    if (!normalized) {
      return null;
    }

    result.push(normalized);
  }

  return result;
};

const normalizeStringArray = (value: unknown): string[] | null => {
  if (!isArray(value) || value.length === 0) {
    return null;
  }

  const fields = value.filter((item): item is string => typeof item === 'string' && item.length > 0);
  if (fields.length !== value.length) {
    return null;
  }

  return fields;
};

const normalizeJoinColumns = (value: RawRelationJoinColumns | undefined): string[] | null => {
  if (value === undefined) {
    return null;
  }

  if (typeof value === 'string') {
    return value.length > 0 ? [value] : null;
  }

  return normalizeStringArray(value);
};

const normalizeRelationEmbed = (embed: RawStoreRelationEmbed | undefined): string | undefined | null => {
  if (embed === undefined) {
    return undefined;
  }

  if (typeof embed === 'string') {
    return embed.length > 0 ? embed : null;
  }

  if (!isObject(embed) || typeof embed.as !== 'string' || embed.as.length === 0) {
    return null;
  }

  return embed.as;
};

const normalizeRelationOnDelete = (
  onDelete: RawStoreRelationOnDelete | undefined
): { action: StoreRelationOnDelete; conflict?: StoreConflictConfig } | null => {
  if (onDelete === undefined) {
    return { action: DEFAULT_RELATION_ON_DELETE };
  }

  if (typeof onDelete === 'string') {
    if (!STORE_RELATION_ON_DELETE_SET.has(onDelete)) {
      return null;
    }
    return { action: onDelete };
  }

  if (!isObject(onDelete)) {
    return null;
  }

  if (typeof onDelete.action !== 'string' || !STORE_RELATION_ON_DELETE_SET.has(onDelete.action)) {
    return null;
  }

  return {
    action: onDelete.action,
    conflict: normalizeConflict(onDelete.conflict)
  };
};

const normalizeRelationEntry = (
  name: string,
  raw: RawStoreRelation
): StoreRelationConfig | null => {
  if (typeof raw === 'string') {
    if (raw.length === 0) {
      return null;
    }

    return {
      name,
      type: DEFAULT_RELATION_TYPE,
      storeId: raw,
      localFields: [name],
      targetFields: [],
      foreignFields: [],
      required: false,
      onDelete: DEFAULT_RELATION_ON_DELETE
    };
  }

  if (!isObject(raw)) {
    return null;
  }

  if (typeof raw.store !== 'string' || raw.store.length === 0) {
    return null;
  }

  let type: StoreRelationType = DEFAULT_RELATION_TYPE;
  if (raw.type !== undefined) {
    if (typeof raw.type !== 'string' || !STORE_RELATION_TYPE_SET.has(raw.type)) {
      return null;
    }
    type = raw.type as StoreRelationType;
  }

  const embedAs = normalizeRelationEmbed(raw.embed);
  if (embedAs === null) {
    return null;
  }

  if (type === 'many') {
    if (raw.required !== undefined || raw.onDelete !== undefined || raw.conflict !== undefined) {
      return null;
    }

    if (raw.join === undefined || !isObject(raw.join)) {
      return null;
    }

    const join = raw.join as RawStoreRelationJoin;
    if (join.to !== undefined) {
      return null;
    }

    const from = normalizeJoinColumns(join.from);
    if (!from) {
      return null;
    }

    return {
      name,
      type: 'many',
      storeId: raw.store,
      localFields: [],
      targetFields: [],
      foreignFields: from,
      required: false,
      onDelete: DEFAULT_RELATION_ON_DELETE,
      embedAs
    };
  }

  if (raw.required !== undefined && typeof raw.required !== 'boolean') {
    return null;
  }

  const onDelete = normalizeRelationOnDelete(raw.onDelete);
  if (!onDelete) {
    return null;
  }

  if (raw.required === true && onDelete.action === 'setNull') {
    return null;
  }

  let localFields: string[] = [name];
  let targetFields: string[] = [];

  if (raw.join !== undefined) {
    if (!isObject(raw.join)) {
      return null;
    }

    const join = raw.join as RawStoreRelationJoin;
    const from = normalizeJoinColumns(join.from);
    const to = join.to !== undefined ? normalizeJoinColumns(join.to) : [];

    if (join.from !== undefined && !from) {
      return null;
    }
    if (join.to !== undefined && !to) {
      return null;
    }

    if (from) {
      localFields = from;
    }

    if (to && to.length > 0) {
      if (to.length !== localFields.length) {
        return null;
      }
      targetFields = to;
    }
  }

  if (embedAs !== undefined && localFields.includes(embedAs)) {
    return null;
  }

  return {
    name,
    type: 'one',
    storeId: raw.store,
    localFields,
    targetFields,
    foreignFields: [],
    required: raw.required === true,
    onDelete: onDelete.action,
    embedAs,
    conflict: normalizeConflict(raw.conflict),
    onDeleteConflict: onDelete.conflict
  };
};

const normalizeUniqueField = (entry: StoreUniqueField): NormalizedUniqueField | null => {
  if (typeof entry === 'string') {
    return entry.length > 0 ? { fields: [entry] } : null;
  }

  if (!isObject(entry)) {
    return null;
  }

  const hasField = typeof entry.field === 'string';
  const hasFields = isArray(entry.fields);

  if (hasField && hasFields) {
    return null;
  }

  if (hasFields) {
    const fields = (entry.fields as unknown[])
      .filter((item): item is string => typeof item === 'string' && item.length > 0);

    if (fields.length === 0 || fields.length !== (entry.fields as unknown[]).length) {
      return null;
    }

    return {
      fields,
      conflict: normalizeConflict(entry.conflict)
    };
  }

  if (hasField && entry.field!.length > 0) {
    return {
      fields: [entry.field as string],
      conflict: normalizeConflict(entry.conflict)
    };
  }

  return null;
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

export const normalizeSoftDelete = (
  softDelete: RawStoreSoftDelete | undefined
): StoreSoftDeleteConfig | undefined | null => {
  if (softDelete === undefined) {
    return undefined;
  }

  if (softDelete === false) {
    return undefined;
  }

  if (softDelete === true) {
    return { field: DEFAULT_SOFT_DELETE_FIELD };
  }

  if (!isObject(softDelete)) {
    return null;
  }

  if (softDelete.field === undefined) {
    return { field: DEFAULT_SOFT_DELETE_FIELD };
  }

  if (typeof softDelete.field !== 'string' || softDelete.field.length === 0) {
    return null;
  }

  return { field: softDelete.field };
};

export const normalizeNotFound = (
  notFound: unknown
): StoreNotFoundConfig | null | undefined => {
  if (notFound === undefined) {
    return undefined;
  }

  if (!isObject(notFound)) {
    return null;
  }

  const config = notFound as Record<string, unknown>;
  if (typeof config.response !== 'string' || config.response.length === 0) {
    return null;
  }

  return { response: config.response };
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

  const softDelete = normalizeSoftDelete(store.softDelete);
  if (softDelete === null) {
    return null;
  }

  const relations = normalizeRelations(store.relations);
  if (relations === null) {
    return null;
  }

  const notFound = normalizeNotFound(store.notFound);
  if (notFound === null) {
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
    list,
    softDelete,
    relations,
    notFound
  };
};
