import { JsonValue } from './json.type';

export type StoreAction = 'list' | 'get' | 'create' | 'update' | 'patch' | 'delete' | 'restore';

export type StoreItem = Record<string, JsonValue>;

export interface StoreConflictConfig {
  response?: string;
  detail?: Record<string, string> | string;
}

export interface StoreUniqueFieldObject {
  field?: string;
  fields?: string[];
  conflict?: StoreConflictConfig;
}

export type StoreUniqueField = string | StoreUniqueFieldObject;

export interface StoreUniqueConfig {
  fields: StoreUniqueField[];
  conflict?: StoreConflictConfig;
}

export type RawStoreUnique = StoreUniqueField[] | StoreUniqueConfig;

export type RawStoreKey =
  | string
  | string[]
  | {
    field?: string;
    fields?: string[];
    conflict?: StoreConflictConfig;
  };

export type RawStorePersist =
  | boolean
  | {
    enabled: boolean;
    file?: string;
  };

export interface StorePersistConfig {
  enabled: boolean;
  file?: string;
}

export type RawStoreSoftDelete =
  | boolean
  | {
    field?: string;
  };

export interface StoreSoftDeleteConfig {
  field: string;
}

export type StoreRelationOnDelete = 'restrict' | 'cascade' | 'setNull';

export type StoreRelationType = 'one' | 'many';

export type RawRelationJoinColumns = string | string[];

export interface RawStoreRelationJoin {
  /** Columns on this store (type one) or on the child store (type many). */
  from?: RawRelationJoinColumns;
  /** Columns on the referenced store (type one). Optional when the target key is a single field. */
  to?: RawRelationJoinColumns;
}

export type RawStoreRelationOnDelete =
  | StoreRelationOnDelete
  | {
    action: StoreRelationOnDelete;
    conflict?: StoreConflictConfig;
  };

export type RawStoreRelationEmbed =
  | string
  | {
    as: string;
  };

export interface RawStoreRelationObject {
  store: string;
  type?: StoreRelationType;
  join?: RawStoreRelationJoin;
  required?: boolean;
  onDelete?: RawStoreRelationOnDelete;
  embed?: RawStoreRelationEmbed;
  conflict?: StoreConflictConfig;
}

export type RawStoreRelation = string | RawStoreRelationObject;

export type RawStoreRelations = Record<string, RawStoreRelation>;

export interface StoreRelationConfig {
  /** Map key / relation name (expand matching + default embed base). */
  name: string;
  type: StoreRelationType;
  storeId: string;
  /** Local FK columns (type one). Empty for type many. */
  localFields: string[];
  /** Target key columns (type one). Filled/resolved at integrity for simple. */
  targetFields: string[];
  /** Child FK columns pointing at this store (type many). */
  foreignFields: string[];
  required: boolean;
  onDelete: StoreRelationOnDelete;
  embedAs?: string;
  conflict?: StoreConflictConfig;
  onDeleteConflict?: StoreConflictConfig;
}

export type StoreListOrder = 'asc' | 'desc';

export interface RawQueryDefault<T = number> {
  query?: string;
  default?: T;
}

export interface RawBoundedLimit {
  query?: string;
  default?: number;
  max?: number;
}

export type RawStoreListPage = RawQueryDefault<number>;

export interface RawStoreListPageSize extends RawBoundedLimit {
  aliases?: string[];
}

export type RawStoreListOffset = RawQueryDefault<number>;

export type RawStoreListLimit = RawBoundedLimit;

export interface RawStoreListSort extends RawQueryDefault<string> {
  fields?: string[];
}

export type RawStoreListOrder = RawQueryDefault<string>;

export interface RawStoreListSearch {
  query?: string;
  fields: string[];
}

export type StoreListFilterOp = 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in';

export interface RawStoreListFilterFieldObject {
  field: string;
  op?: StoreListFilterOp;
  query?: string;
}

export type RawStoreListFilterField = string | RawStoreListFilterFieldObject;

export interface RawStoreListFilterObject {
  fields?: RawStoreListFilterField[];
  or?: RawStoreListFilterField[];
  search?: RawStoreListSearch;
}

export type RawStoreListFilter = string[] | RawStoreListFilterObject;

export type RawStoreListCursor =
  | boolean
  | {
    query?: string;
    limit?: RawStoreListLimit;
  };

export interface RawStoreListObject {
  page?: RawStoreListPage;
  pageSize?: RawStoreListPageSize;
  offset?: RawStoreListOffset;
  limit?: RawStoreListLimit;
  sort?: RawStoreListSort;
  order?: RawStoreListOrder;
  filter?: RawStoreListFilter;
  cursor?: RawStoreListCursor;
}

export type RawStoreList = boolean | RawStoreListObject;

export interface QueryDefaultConfig<T = number> {
  query: string;
  default: T;
}

export interface BoundedLimitConfig {
  query: string;
  default: number;
  max: number;
}

export type StoreListPageConfig = QueryDefaultConfig<number>;

export interface StoreListPageSizeConfig extends BoundedLimitConfig {
  aliases: string[];
}

export type StoreListOffsetConfig = QueryDefaultConfig<number>;

export type StoreListLimitConfig = BoundedLimitConfig;

export interface StoreListSortConfig extends QueryDefaultConfig<string> {
  fields?: string[];
}

export type StoreListOrderConfig = QueryDefaultConfig<StoreListOrder>;

export interface StoreListSearchConfig {
  query: string;
  fields: string[];
}

export interface StoreListFilterFieldConfig {
  field: string;
  op: StoreListFilterOp;
  query: string;
}

export interface StoreListFilterConfig {
  fields: StoreListFilterFieldConfig[];
  or?: StoreListFilterFieldConfig[];
  search?: StoreListSearchConfig;
}

export type StoreListPaginationMode = 'page' | 'offset' | 'cursor' | 'all';

export interface StoreListSortSpec {
  field: string;
  order: StoreListOrder;
}

export interface StoreListCursorConfig {
  query: string;
  limit: StoreListLimitConfig;
}

export interface StoreListConfig {
  page?: StoreListPageConfig;
  pageSize?: StoreListPageSizeConfig;
  offset?: StoreListOffsetConfig;
  limit?: StoreListLimitConfig;
  sort: StoreListSortConfig;
  order: StoreListOrderConfig;
  filter?: StoreListFilterConfig;
  cursor?: StoreListCursorConfig;
}

export interface StoreListQuery {
  page: number;
  pageSize: number;
  offset: number;
  limit: number;
  sort: string;
  order: StoreListOrder;
  sortSpecs: StoreListSortSpec[];
  mode: StoreListPaginationMode;
  cursorToken?: string;
}

export interface StoreListLinks {
  self: string;
  next: string | null;
  previous: string | null;
  hasNext: boolean;
  hasPrevious: boolean;
  linkHeader: string;
}

export interface StoreListResult extends StoreListLinks {
  items: StoreItem[];
  total: number;
  page: number;
  pageSize: number;
  offset: number;
  limit: number;
  totalPages: number;
  sort: string;
  order: StoreListOrder;
  sortSpecs: StoreListSortSpec[];
  mode: StoreListPaginationMode;
  nextCursor: string | null;
  hasMore: boolean;
}

export interface RawStoreConfig {
  id: string;
  key?: RawStoreKey;
  seed?: unknown[];
  template?: Record<string, unknown>;
  unique?: RawStoreUnique;
  persist?: RawStorePersist;
  list?: RawStoreList;
  softDelete?: RawStoreSoftDelete;
  relations?: RawStoreRelations;
}

export interface NormalizedUniqueField {
  /** One or more fields that form a unique constraint together. */
  fields: string[];
  conflict?: StoreConflictConfig;
}

export interface StoreDefinition {
  id: string;
  keyFields: string[];
  keyConflict?: StoreConflictConfig;
  seed: StoreItem[];
  template?: StoreItem;
  uniqueFields: NormalizedUniqueField[];
  uniqueConflict?: StoreConflictConfig;
  persist?: StorePersistConfig;
  list?: StoreListConfig;
  softDelete?: StoreSoftDeleteConfig;
  relations: StoreRelationConfig[];
}

export type StoreResetOption = true | string[];

export interface StoreConflictItem {
  field: string;
  value: JsonValue;
  message: string;
  fields?: string[];
}

export type StoreOperationResult =
  | {
    ok: true;
    status?: number;
    body: JsonValue;
    listResult?: StoreListResult;
  }
  | {
    ok: false;
    kind: 'conflict';
    conflicts: StoreConflictItem[];
    responseName?: string;
    detail?: StoreConflictConfig['detail'];
  }
  | {
    ok: false;
    kind: 'not_found';
  }
  | {
    ok: false;
    kind: 'bad_request';
    message: string;
  };
