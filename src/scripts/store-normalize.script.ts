import { DEFAULT_STORE_KEY } from '../constants/store.constant';
import {
  NormalizedUniqueField,
  RawStoreConfig,
  RawStoreKey,
  RawStorePersist,
  RawStoreUnique,
  StoreConflictConfig,
  StoreDefinition,
  StoreItem,
  StorePersistConfig,
  StoreUniqueField
} from '../types/store.type';
import { isArray, isObject } from './guards.script';

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

  return {
    id: store.id,
    keyFields: key.fields,
    keyConflict: key.conflict,
    seed,
    template,
    uniqueFields,
    uniqueConflict,
    persist: persist?.enabled ? persist : undefined
  };
};
