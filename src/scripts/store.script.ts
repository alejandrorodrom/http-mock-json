import { Request } from 'express';
import {
  DEFAULT_CONFLICT_MESSAGE,
  DEFAULT_NOT_FOUND_MESSAGE
} from '../constants/store.constant';
import { JsonValue } from '../types/json.type';
import {
  StoreAction,
  StoreConflictConfig,
  StoreConflictItem,
  StoreDefinition,
  StoreItem,
  StoreOperationResult,
  StoreResetOption
} from '../types/store.type';
import { hasProperty, isObject } from './guards.script';
import { logError } from './log.script';
import { encodeStoreKey } from './store-items.script';
import {
  assertPersistedItemsValid,
  readPersistedItems,
  resetPersistedStores,
  resolvePersistFilePath,
  shouldResetStore,
  writePersistedItems
} from './store-persist.script';

interface Collection {
  definition: StoreDefinition;
  items: Map<string, StoreItem>;
}

const cloneItem = (item: StoreItem): StoreItem => structuredClone(item);

const paramValue = (params: Request['params'], field: string): string | undefined => {
  const value = params[field];
  if (value === undefined) {
    return undefined;
  }
  return Array.isArray(value) ? value[0] : value;
};

const asItem = (value: unknown): StoreItem | null => {
  if (!isObject(value)) {
    return null;
  }
  return value as StoreItem;
};

const nextNumericId = (
  collection: Collection,
  field: string,
  partial: StoreItem
): number => {
  const { keyFields } = collection.definition;
  const siblings = [...collection.items.values()].filter(item => {
    return keyFields.every(keyField => {
      if (keyField === field) {
        return true;
      }
      return String(item[keyField]) === String(partial[keyField]);
    });
  });

  const numbers = siblings
    .map(item => Number(item[field]))
    .filter(value => !Number.isNaN(value));

  return numbers.length > 0 ? Math.max(...numbers) + 1 : 1;
};

const coerceParam = (value: string): JsonValue => {
  const asNumber = Number(value);
  if (value !== '' && !Number.isNaN(asNumber) && String(asNumber) === value) {
    return asNumber;
  }
  return value;
};

const ensureKeys = (
  collection: Collection,
  body: StoreItem,
  params: Request['params']
): StoreItem => {
  const template = collection.definition.template ?? {};
  const result: StoreItem = { ...template, ...body };
  const bodyKeys = new Set(Object.keys(body));

  for (const field of collection.definition.keyFields) {
    const fromParams = paramValue(params, field);
    if (fromParams !== undefined) {
      result[field] = coerceParam(fromParams);
      continue;
    }

    if (!bodyKeys.has(field)) {
      result[field] = nextNumericId(collection, field, result);
    }
  }

  return result;
};

const findConflicts = (
  collection: Collection,
  item: StoreItem,
  ignoreKey?: string
): {
  conflicts: StoreConflictItem[];
  responseName?: string;
  detail?: StoreConflictConfig['detail'];
} => {
  const conflicts: StoreConflictItem[] = [];
  const uniqueConflicts: StoreConflictItem[] = [];

  const keyValue = encodeStoreKey(collection.definition.keyFields, item);
  if (collection.items.has(keyValue) && keyValue !== ignoreKey) {
    conflicts.push({
      field: collection.definition.keyFields.join('+'),
      value: collection.definition.keyFields.length === 1
        ? item[collection.definition.keyFields[0]]
        : collection.definition.keyFields.map(field => item[field]),
      message: DEFAULT_CONFLICT_MESSAGE
    });
  }

  for (const uniqueField of collection.definition.uniqueFields) {
    if (!hasProperty(item, uniqueField.field)) {
      continue;
    }

    const value = item[uniqueField.field];
    const duplicate = [...collection.items.entries()].some(([mapKey, existing]) => {
      if (ignoreKey !== undefined && mapKey === ignoreKey) {
        return false;
      }
      return String(existing[uniqueField.field]) === String(value);
    });

    if (!duplicate) {
      continue;
    }

    uniqueConflicts.push({
      field: uniqueField.field,
      value,
      message: `Duplicate value for unique field "${ uniqueField.field }"`
    });
  }

  conflicts.push(...uniqueConflicts);

  if (conflicts.length === 0) {
    return { conflicts };
  }

  if (uniqueConflicts.length === 0) {
    return {
      conflicts,
      responseName: collection.definition.keyConflict?.response,
      detail: collection.definition.keyConflict?.detail
    };
  }

  if (uniqueConflicts.length === 1 && conflicts.length === 1) {
    const fieldConfig = collection.definition.uniqueFields.find(
      entry => entry.field === uniqueConflicts[0].field
    );

    return {
      conflicts,
      responseName: fieldConfig?.conflict?.response
        ?? collection.definition.uniqueConflict?.response,
      detail: fieldConfig?.conflict?.detail
        ?? collection.definition.uniqueConflict?.detail
    };
  }

  return {
    conflicts,
    responseName: collection.definition.uniqueConflict?.response
      ?? collection.definition.keyConflict?.response,
    detail: collection.definition.uniqueConflict?.detail
      ?? collection.definition.keyConflict?.detail
  };
};

export interface StoreRegistryOptions {
  mocksDir: string;
  resetStore?: StoreResetOption;
}

export class StoreRegistry {
  private collections = new Map<string, Collection>();
  private mocksDir: string;

  constructor(definitions: StoreDefinition[], options: StoreRegistryOptions) {
    this.mocksDir = options.mocksDir;

    if (options.resetStore !== undefined) {
      resetPersistedStores(this.mocksDir, definitions, options.resetStore);
    }

    for (const definition of definitions) {
      this.register(definition, options.resetStore);
    }
  }

  private register(
    definition: StoreDefinition,
    resetStore?: StoreResetOption
  ): void {
    const items = new Map<string, StoreItem>();
    let sourceItems = definition.seed;

    if (
      definition.persist?.enabled
      && !shouldResetStore(resetStore, definition.id)
    ) {
      const filePath = resolvePersistFilePath(
        this.mocksDir,
        definition.id,
        definition.persist
      );
      const persisted = readPersistedItems(filePath);
      if (persisted) {
        assertPersistedItemsValid(filePath, definition, persisted);
        sourceItems = persisted;
      }
    }

    for (const seedItem of sourceItems) {
      items.set(encodeStoreKey(definition.keyFields, seedItem), cloneItem(seedItem));
    }

    this.collections.set(definition.id, { definition, items });
  }

  private persistCollection(collection: Collection): void {
    if (!collection.definition.persist?.enabled) {
      return;
    }

    try {
      writePersistedItems(
        resolvePersistFilePath(
          this.mocksDir,
          collection.definition.id,
          collection.definition.persist
        ),
        [...collection.items.values()]
      );
    } catch (error) {
      logError(
        `Failed to persist store "${ collection.definition.id }": ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  has(storeId: string): boolean {
    return this.collections.has(storeId);
  }

  execute(
    storeId: string,
    action: StoreAction,
    req: Request
  ): StoreOperationResult {
    const collection = this.collections.get(storeId);
    if (!collection) {
      return {
        ok: false,
        kind: 'bad_request',
        message: `Store "${ storeId }" was not found`
      };
    }

    switch (action) {
      case 'list':
        return this.list(collection, req);
      case 'get':
        return this.get(collection, req);
      case 'create':
        return this.create(collection, req);
      case 'update':
        return this.update(collection, req, false);
      case 'patch':
        return this.update(collection, req, true);
      case 'delete':
        return this.remove(collection, req);
      default:
        return {
          ok: false,
          kind: 'bad_request',
          message: `Unsupported store action "${ action }"`
        };
    }
  }

  private list(collection: Collection, req: Request): StoreOperationResult {
    let items = [...collection.items.values()].map(cloneItem);

    for (const field of collection.definition.keyFields) {
      const value = paramValue(req.params, field);
      if (value === undefined) {
        continue;
      }
      items = items.filter(item => String(item[field]) === String(value));
    }

    return { ok: true, body: items };
  }

  private resolveKeyItem(collection: Collection, req: Request): StoreItem | null {
    const item: StoreItem = {};
    for (const field of collection.definition.keyFields) {
      const value = paramValue(req.params, field);
      if (value === undefined) {
        return null;
      }
      item[field] = coerceParam(value);
    }
    return item;
  }

  private get(collection: Collection, req: Request): StoreOperationResult {
    const keyItem = this.resolveKeyItem(collection, req);
    if (!keyItem) {
      return { ok: false, kind: 'not_found' };
    }

    const key = encodeStoreKey(collection.definition.keyFields, keyItem);
    const item = collection.items.get(key);
    if (!item) {
      return { ok: false, kind: 'not_found' };
    }

    return { ok: true, body: cloneItem(item) };
  }

  private create(collection: Collection, req: Request): StoreOperationResult {
    const body = asItem(req.body);
    if (!body) {
      return {
        ok: false,
        kind: 'bad_request',
        message: 'Request body must be a JSON object'
      };
    }

    const merged = ensureKeys(collection, body, req.params);

    const { conflicts, responseName, detail } = findConflicts(collection, merged);
    if (conflicts.length > 0) {
      return {
        ok: false,
        kind: 'conflict',
        conflicts,
        responseName,
        detail
      };
    }

    const key = encodeStoreKey(collection.definition.keyFields, merged);
    collection.items.set(key, cloneItem(merged));
    this.persistCollection(collection);
    return { ok: true, body: cloneItem(merged) };
  }

  private update(
    collection: Collection,
    req: Request,
    patch: boolean
  ): StoreOperationResult {
    const keyItem = this.resolveKeyItem(collection, req);
    if (!keyItem) {
      return { ok: false, kind: 'not_found' };
    }

    const key = encodeStoreKey(collection.definition.keyFields, keyItem);
    const existing = collection.items.get(key);
    if (!existing) {
      return { ok: false, kind: 'not_found' };
    }

    const body = asItem(req.body);
    if (!body) {
      return {
        ok: false,
        kind: 'bad_request',
        message: 'Request body must be a JSON object'
      };
    }

    const template = collection.definition.template ?? {};
    const merged: StoreItem = patch
      ? { ...existing, ...body }
      : { ...template, ...body };

    for (const field of collection.definition.keyFields) {
      merged[field] = existing[field];
    }

    const { conflicts, responseName, detail } = findConflicts(collection, merged, key);
    if (conflicts.length > 0) {
      return {
        ok: false,
        kind: 'conflict',
        conflicts,
        responseName,
        detail
      };
    }

    collection.items.set(key, cloneItem(merged));
    this.persistCollection(collection);
    return { ok: true, body: cloneItem(merged) };
  }

  private remove(collection: Collection, req: Request): StoreOperationResult {
    const keyItem = this.resolveKeyItem(collection, req);
    if (!keyItem) {
      return { ok: false, kind: 'not_found' };
    }

    const key = encodeStoreKey(collection.definition.keyFields, keyItem);
    const existing = collection.items.get(key);
    if (!existing) {
      return { ok: false, kind: 'not_found' };
    }

    collection.items.delete(key);
    this.persistCollection(collection);
    return { ok: true, body: null, status: 204 };
  }
}

export const defaultNotFoundBody = (): JsonValue => ({
  message: DEFAULT_NOT_FOUND_MESSAGE
});
