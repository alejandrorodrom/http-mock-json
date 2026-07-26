import { JsonValue } from './json.type';

export type StoreAction = 'list' | 'get' | 'create' | 'update' | 'patch' | 'delete';

export type StoreItem = Record<string, JsonValue>;

export interface StoreConflictConfig {
  response?: string;
  detail?: Record<string, string> | string;
}

export interface StoreUniqueFieldObject {
  field: string;
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

export interface RawStoreConfig {
  id: string;
  key?: RawStoreKey;
  seed?: unknown[];
  template?: Record<string, unknown>;
  unique?: RawStoreUnique;
  persist?: RawStorePersist;
}

export interface NormalizedUniqueField {
  field: string;
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
}

export type StoreResetOption = true | string[];

export interface StoreConflictItem {
  field: string;
  value: JsonValue;
  message: string;
}

export type StoreOperationResult =
  | {
    ok: true;
    status?: number;
    body: JsonValue;
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
