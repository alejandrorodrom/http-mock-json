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
import { isObject } from './guards.script';
import { logError } from './log.script';
import {
  encodeFieldTuple,
  itemHasAllFields,
  uniqueConstraintLabel
} from './store-items.script';
import {
  buildListResult,
  filterStoreItems,
  resolveListQuery,
  sortStoreItems
} from './store-list.script';
import {
  assertPersistedItemsValid,
  readPersistedItems,
  resetPersistedStores,
  resolvePersistFilePath,
  shouldResetStore,
  writePersistedItems
} from './store-persist.script';
import {
  clearSoftDeleted,
  filterOutSoftDeleted,
  isIncludeDeletedRequested,
  isSoftDeleted,
  markSoftDeleted
} from './store-soft-delete.script';
import {
  applyOnDelete,
  applyRelationEmbeds,
  findRelationConflicts,
  RelationCollectionView,
  RelationLookup
} from './store-relations.script';

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

  const keyFields = collection.definition.keyFields;
  const keyValue = encodeFieldTuple(keyFields, item);
  const softDelete = collection.definition.softDelete;

  if (collection.items.has(keyValue) && keyValue !== ignoreKey) {
    const existingKeyItem = collection.items.get(keyValue);
    if (!existingKeyItem || !isSoftDeleted(existingKeyItem, softDelete)) {
      conflicts.push({
        field: uniqueConstraintLabel(keyFields),
        fields: keyFields,
        value: keyFields.length === 1
          ? item[keyFields[0]]
          : keyFields.map(field => item[field]),
        message: DEFAULT_CONFLICT_MESSAGE
      });
    }
  }

  for (const uniqueField of collection.definition.uniqueFields) {
    if (!itemHasAllFields(item, uniqueField.fields)) {
      continue;
    }

    const label = uniqueConstraintLabel(uniqueField.fields);
    const tuple = encodeFieldTuple(uniqueField.fields, item);
    const duplicate = [...collection.items.entries()].some(([mapKey, existing]) => {
      if (ignoreKey !== undefined && mapKey === ignoreKey) {
        return false;
      }
      if (isSoftDeleted(existing, softDelete)) {
        return false;
      }
      if (!itemHasAllFields(existing, uniqueField.fields)) {
        return false;
      }
      return encodeFieldTuple(uniqueField.fields, existing) === tuple;
    });

    if (!duplicate) {
      continue;
    }

    uniqueConflicts.push({
      field: label,
      fields: uniqueField.fields,
      value: uniqueField.fields.length === 1
        ? item[uniqueField.fields[0]]
        : uniqueField.fields.map(field => item[field]),
      message: uniqueField.fields.length === 1
        ? `Duplicate value for unique field "${ label }"`
        : `Duplicate value for unique fields "${ label }"`
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
      entry => uniqueConstraintLabel(entry.fields) === uniqueConflicts[0].field
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
      items.set(encodeFieldTuple(definition.keyFields, seedItem), cloneItem(seedItem));
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

  private relationLookup(): RelationLookup & { listCollections: () => RelationCollectionView[] } {
    return {
      getCollection: (storeId: string) => this.collections.get(storeId),
      persistCollection: (collection: RelationCollectionView) => {
        this.persistCollection(collection as Collection);
      },
      listCollections: () => [...this.collections.values()]
    };
  }

  private mergeConflicts(
    primary: {
      conflicts: StoreConflictItem[];
      responseName?: string;
      detail?: StoreConflictConfig['detail'];
    },
    secondary: {
      conflicts: StoreConflictItem[];
      responseName?: string;
      detail?: StoreConflictConfig['detail'];
    }
  ): {
    conflicts: StoreConflictItem[];
    responseName?: string;
    detail?: StoreConflictConfig['detail'];
  } {
    if (primary.conflicts.length === 0) {
      return secondary;
    }
    if (secondary.conflicts.length === 0) {
      return primary;
    }

    return {
      conflicts: [...primary.conflicts, ...secondary.conflicts],
      responseName: undefined,
      detail: undefined
    };
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
      case 'restore':
        return this.restore(collection, req);
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

    if (
      collection.definition.softDelete
      && !isIncludeDeletedRequested(req)
    ) {
      items = filterOutSoftDeleted(items, collection.definition.softDelete);
    }

    const lookup = this.relationLookup();
    const embedItem = (item: StoreItem): StoreItem => applyRelationEmbeds(
      lookup,
      collection.definition,
      item,
      req
    );

    const listConfig = collection.definition.list;
    if (!listConfig) {
      return {
        ok: true,
        body: items.map(embedItem)
      };
    }

    const resolved = resolveListQuery(listConfig, req);
    if (!resolved.ok) {
      return { ok: false, kind: 'bad_request', message: resolved.message };
    }

    const filtered = filterStoreItems(items, listConfig, req);
    if (!filtered.ok) {
      return { ok: false, kind: 'bad_request', message: filtered.message };
    }
    const sorted = sortStoreItems(
      filtered.items,
      resolved.query.sortSpecs,
      collection.definition.keyFields
    );
    const built = buildListResult(
      sorted,
      resolved.query,
      req,
      listConfig,
      collection.definition.keyFields
    );
    if (!built.ok) {
      return { ok: false, kind: 'bad_request', message: built.message };
    }

    const embedded = built.result.items.map(embedItem);
    return {
      ok: true,
      body: embedded,
      listResult: {
        ...built.result,
        items: embedded
      }
    };
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

  private notFound(
    collection: Collection,
    keyItem: StoreItem | null
  ): StoreOperationResult {
    const fields = collection.definition.keyFields;
    return {
      ok: false,
      kind: 'not_found',
      responseName: collection.definition.notFound?.response,
      keyContext: {
        fields,
        values: keyItem ?? {},
        key: keyItem
          ? fields.map(field => String(keyItem[field])).join('+')
          : null
      }
    };
  }

  private get(collection: Collection, req: Request): StoreOperationResult {
    const keyItem = this.resolveKeyItem(collection, req);
    if (!keyItem) {
      return this.notFound(collection, null);
    }

    const key = encodeFieldTuple(collection.definition.keyFields, keyItem);
    const item = collection.items.get(key);
    if (!item) {
      return this.notFound(collection, keyItem);
    }

    if (
      isSoftDeleted(item, collection.definition.softDelete)
      && !isIncludeDeletedRequested(req)
    ) {
      return this.notFound(collection, keyItem);
    }

    return {
      ok: true,
      body: applyRelationEmbeds(
        this.relationLookup(),
        collection.definition,
        cloneItem(item),
        req
      )
    };
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

    const uniqueResult = findConflicts(collection, merged);
    const relationResult = findRelationConflicts(
      this.relationLookup(),
      collection.definition,
      merged
    );
    const { conflicts, responseName, detail } = this.mergeConflicts(uniqueResult, relationResult);
    if (conflicts.length > 0) {
      return {
        ok: false,
        kind: 'conflict',
        conflicts,
        responseName,
        detail
      };
    }

    const key = encodeFieldTuple(collection.definition.keyFields, merged);
    collection.items.set(key, cloneItem(merged));
    this.persistCollection(collection);
    return {
      ok: true,
      body: applyRelationEmbeds(
        this.relationLookup(),
        collection.definition,
        cloneItem(merged),
        req
      )
    };
  }

  private update(
    collection: Collection,
    req: Request,
    patch: boolean
  ): StoreOperationResult {
    const keyItem = this.resolveKeyItem(collection, req);
    if (!keyItem) {
      return this.notFound(collection, null);
    }

    const key = encodeFieldTuple(collection.definition.keyFields, keyItem);
    const existing = collection.items.get(key);
    if (!existing) {
      return this.notFound(collection, keyItem);
    }

    if (isSoftDeleted(existing, collection.definition.softDelete)) {
      return this.notFound(collection, keyItem);
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

    const uniqueResult = findConflicts(collection, merged, key);
    const relationResult = findRelationConflicts(
      this.relationLookup(),
      collection.definition,
      merged
    );
    const { conflicts, responseName, detail } = this.mergeConflicts(uniqueResult, relationResult);
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
    return {
      ok: true,
      body: applyRelationEmbeds(
        this.relationLookup(),
        collection.definition,
        cloneItem(merged),
        req
      )
    };
  }

  private remove(collection: Collection, req: Request): StoreOperationResult {
    const keyItem = this.resolveKeyItem(collection, req);
    if (!keyItem) {
      return this.notFound(collection, null);
    }

    const key = encodeFieldTuple(collection.definition.keyFields, keyItem);
    const existing = collection.items.get(key);
    if (!existing) {
      return this.notFound(collection, keyItem);
    }

    const softDelete = collection.definition.softDelete;
    if (softDelete && isSoftDeleted(existing, softDelete)) {
      return this.notFound(collection, keyItem);
    }

    const onDeleteResult = applyOnDelete(this.relationLookup(), collection, existing);
    if (onDeleteResult && onDeleteResult.conflicts.length > 0) {
      return {
        ok: false,
        kind: 'conflict',
        conflicts: onDeleteResult.conflicts,
        responseName: onDeleteResult.responseName,
        detail: onDeleteResult.detail
      };
    }

    if (softDelete) {
      collection.items.set(key, markSoftDeleted(existing, softDelete));
      this.persistCollection(collection);
      return { ok: true, body: null, status: 204 };
    }

    collection.items.delete(key);
    this.persistCollection(collection);
    return { ok: true, body: null, status: 204 };
  }

  private restore(collection: Collection, req: Request): StoreOperationResult {
    const softDelete = collection.definition.softDelete;
    if (!softDelete) {
      return {
        ok: false,
        kind: 'bad_request',
        message: 'Store softDelete is not enabled'
      };
    }

    const keyItem = this.resolveKeyItem(collection, req);
    if (!keyItem) {
      return this.notFound(collection, null);
    }

    const key = encodeFieldTuple(collection.definition.keyFields, keyItem);
    const existing = collection.items.get(key);
    if (!existing || !isSoftDeleted(existing, softDelete)) {
      return this.notFound(collection, keyItem);
    }

    const restored = clearSoftDeleted(existing, softDelete);
    const uniqueResult = findConflicts(collection, restored, key);
    const relationResult = findRelationConflicts(
      this.relationLookup(),
      collection.definition,
      restored
    );
    const { conflicts, responseName, detail } = this.mergeConflicts(uniqueResult, relationResult);
    if (conflicts.length > 0) {
      return {
        ok: false,
        kind: 'conflict',
        conflicts,
        responseName,
        detail
      };
    }

    const stored = cloneItem(restored);
    collection.items.set(key, stored);
    this.persistCollection(collection);
    return {
      ok: true,
      body: applyRelationEmbeds(
        this.relationLookup(),
        collection.definition,
        cloneItem(stored),
        req
      )
    };
  }
}

export const defaultNotFoundBody = (): JsonValue => ({
  message: DEFAULT_NOT_FOUND_MESSAGE
});
