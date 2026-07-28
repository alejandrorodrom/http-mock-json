import { Request } from 'express';
import {
  DEFAULT_DELETE_RESTRICT_MESSAGE,
  DEFAULT_FK_CONFLICT_MESSAGE,
  EXPAND_QUERY,
  MAX_EXPAND_DEPTH
} from '../constants/store.constant';
import { JsonValue } from '../types/json.type';
import {
  StoreConflictConfig,
  StoreConflictItem,
  StoreDefinition,
  StoreItem,
  StoreRelationConfig
} from '../types/store.type';
import { encodeFieldTuple } from './store-items.script';
import {
  isIncludeDeletedRequested,
  isSoftDeleted,
  markSoftDeleted
} from './store-soft-delete.script';

export interface RelationCollectionView {
  definition: StoreDefinition;
  items: Map<string, StoreItem>;
}

export interface RelationLookup {
  getCollection: (storeId: string) => RelationCollectionView | undefined;
  persistCollection: (collection: RelationCollectionView) => void;
  listCollections?: () => RelationCollectionView[];
}

const isMissingValue = (value: JsonValue | undefined): boolean => {
  return value === undefined || value === null || value === '';
};

export const relationEmbedKey = (relation: StoreRelationConfig): string => {
  return relation.embedAs ?? `${ relation.name }$`;
};

export const relationConflictField = (relation: StoreRelationConfig): string => {
  if (relation.localFields.length === 0) {
    return relation.name;
  }
  return relation.localFields.length === 1
    ? relation.localFields[0]
    : relation.localFields.join('+');
};

const buildLocalKeyItem = (
  relation: StoreRelationConfig,
  item: StoreItem
): StoreItem | null => {
  const keyItem: StoreItem = {};
  for (let index = 0; index < relation.localFields.length; index += 1) {
    const local = relation.localFields[index];
    const target = relation.targetFields[index];
    const value = item[local];
    if (isMissingValue(value)) {
      return null;
    }
    keyItem[target] = value as JsonValue;
  }
  return keyItem;
};

const isRelationFullyMissing = (
  relation: StoreRelationConfig,
  item: StoreItem
): boolean => {
  return relation.localFields.every(field => isMissingValue(item[field]));
};

const isRelationPartiallyMissing = (
  relation: StoreRelationConfig,
  item: StoreItem
): boolean => {
  const values = relation.localFields.map(field => item[field]);
  const missingCount = values.filter(value => isMissingValue(value)).length;
  return missingCount > 0 && missingCount < values.length;
};

const relationConflictValue = (
  relation: StoreRelationConfig,
  item: StoreItem
): JsonValue => {
  if (relation.localFields.length === 1) {
    return (item[relation.localFields[0]] as JsonValue) ?? null;
  }

  return relation.localFields.map(field => (item[field] as JsonValue) ?? null);
};

const matchesParentKey = (
  relation: StoreRelationConfig,
  child: StoreItem,
  parent: StoreItem,
  parentKeyFields: string[]
): boolean => {
  if (relation.localFields.length !== parentKeyFields.length) {
    return false;
  }

  return relation.localFields.every((local, index) => {
    return String(child[local]) === String(parent[parentKeyFields[index]]);
  });
};

const matchesManyForeignKey = (
  relation: StoreRelationConfig,
  child: StoreItem,
  parent: StoreItem,
  parentKeyFields: string[]
): boolean => {
  if (relation.foreignFields.length !== parentKeyFields.length) {
    return false;
  }

  return relation.foreignFields.every((foreign, index) => {
    return String(child[foreign]) === String(parent[parentKeyFields[index]]);
  });
};

/** Expand paths split by `.` (e.g. posts.user → ["posts","user"]). */
export const parseExpandPaths = (req: Request): string[][] => {
  const raw = req.query?.[EXPAND_QUERY];
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (typeof value !== 'string' || value.trim().length === 0) {
    return [];
  }

  return value
    .split(',')
    .map(part => part.trim())
    .filter(part => part.length > 0)
    .map(part => part.split('.').map(segment => segment.trim()).filter(Boolean))
    .filter(path => path.length > 0);
};

const relationExpandAliases = (relation: StoreRelationConfig): string[] => {
  const aliases = [relation.name, relationEmbedKey(relation)];
  if (relation.embedAs) {
    aliases.push(relation.embedAs);
  }
  if (relation.type === 'one' && relation.localFields.length === 1) {
    aliases.push(relation.localFields[0]);
  }
  return aliases;
};

const pathsForRelation = (
  relation: StoreRelationConfig,
  paths: string[][]
): string[][] => {
  const aliases = new Set(relationExpandAliases(relation));
  return paths
    .filter(path => path.length > 0 && aliases.has(path[0]))
    .map(path => path.slice(1));
};

export const findRelationConflicts = (
  lookup: RelationLookup,
  definition: StoreDefinition,
  item: StoreItem
): {
  conflicts: StoreConflictItem[];
  responseName?: string;
  detail?: StoreConflictConfig['detail'];
} => {
  const conflicts: StoreConflictItem[] = [];
  let responseName: string | undefined;
  let detail: StoreConflictConfig['detail'] | undefined;

  for (const relation of definition.relations) {
    if (relation.type !== 'one') {
      continue;
    }

    if (isRelationFullyMissing(relation, item)) {
      if (!relation.required) {
        continue;
      }

      conflicts.push({
        field: relationConflictField(relation),
        value: relationConflictValue(relation, item),
        message: `Missing required relation "${ relation.name }"`,
        fields: relation.localFields.length > 1 ? [...relation.localFields] : undefined
      });
    } else if (isRelationPartiallyMissing(relation, item)) {
      conflicts.push({
        field: relationConflictField(relation),
        value: relationConflictValue(relation, item),
        message: DEFAULT_FK_CONFLICT_MESSAGE,
        fields: relation.localFields.length > 1 ? [...relation.localFields] : undefined
      });
    } else {
      const target = lookup.getCollection(relation.storeId);
      const keyItem = buildLocalKeyItem(relation, item);
      if (!target || !keyItem) {
        conflicts.push({
          field: relationConflictField(relation),
          value: relationConflictValue(relation, item),
          message: DEFAULT_FK_CONFLICT_MESSAGE,
          fields: relation.localFields.length > 1 ? [...relation.localFields] : undefined
        });
      } else {
        const key = encodeFieldTuple(relation.targetFields, keyItem);
        const related = target.items.get(key);
        if (!related || isSoftDeleted(related, target.definition.softDelete)) {
          conflicts.push({
            field: relationConflictField(relation),
            value: relationConflictValue(relation, item),
            message: DEFAULT_FK_CONFLICT_MESSAGE,
            fields: relation.localFields.length > 1 ? [...relation.localFields] : undefined
          });
        } else {
          continue;
        }
      }
    }

    if (conflicts.length === 1) {
      responseName = relation.conflict?.response;
      detail = relation.conflict?.detail;
    } else {
      responseName = undefined;
      detail = undefined;
    }
  }

  return { conflicts, responseName, detail };
};

const resolveOneRelated = (
  lookup: RelationLookup,
  relation: StoreRelationConfig,
  item: StoreItem,
  includeDeleted: boolean
): StoreItem | null => {
  const keyItem = buildLocalKeyItem(relation, item);
  if (!keyItem) {
    return null;
  }

  const target = lookup.getCollection(relation.storeId);
  if (!target) {
    return null;
  }

  const key = encodeFieldTuple(relation.targetFields, keyItem);
  const related = target.items.get(key);
  if (
    !related
    || (isSoftDeleted(related, target.definition.softDelete) && !includeDeleted)
  ) {
    return null;
  }

  return structuredClone(related);
};

const resolveManyRelated = (
  lookup: RelationLookup,
  relation: StoreRelationConfig,
  parent: StoreItem,
  parentKeyFields: string[],
  includeDeleted: boolean
): StoreItem[] => {
  const target = lookup.getCollection(relation.storeId);
  if (!target) {
    return [];
  }

  return [...target.items.values()]
    .filter(child => {
      if (isSoftDeleted(child, target.definition.softDelete) && !includeDeleted) {
        return false;
      }
      return matchesManyForeignKey(relation, child, parent, parentKeyFields);
    })
    .map(child => structuredClone(child));
};

const applyEmbedsWithPaths = (
  lookup: RelationLookup,
  definition: StoreDefinition,
  item: StoreItem,
  paths: string[][],
  includeDeleted: boolean,
  depth: number,
  visited: Set<string>
): StoreItem => {
  if (paths.length === 0 || definition.relations.length === 0 || depth > MAX_EXPAND_DEPTH) {
    return item;
  }

  if (visited.has(definition.id)) {
    return item;
  }

  const nextVisited = new Set(visited);
  nextVisited.add(definition.id);

  const result: StoreItem = { ...item };

  for (const relation of definition.relations) {
    const remainingPaths = pathsForRelation(relation, paths);
    if (remainingPaths.length === 0) {
      continue;
    }

    const embedKey = relationEmbedKey(relation);
    const nestedPaths = remainingPaths.filter(path => path.length > 0);
    const target = lookup.getCollection(relation.storeId);

    if (relation.type === 'many') {
      const children = resolveManyRelated(
        lookup,
        relation,
        item,
        definition.keyFields,
        includeDeleted
      );

      if (nestedPaths.length > 0 && target && depth < MAX_EXPAND_DEPTH) {
        result[embedKey] = children.map(child => applyEmbedsWithPaths(
          lookup,
          target.definition,
          child,
          nestedPaths,
          includeDeleted,
          depth + 1,
          nextVisited
        ));
      } else {
        result[embedKey] = children;
      }
      continue;
    }

    const related = resolveOneRelated(lookup, relation, item, includeDeleted);
    if (!related) {
      result[embedKey] = null;
      continue;
    }

    if (nestedPaths.length > 0 && target && depth < MAX_EXPAND_DEPTH) {
      result[embedKey] = applyEmbedsWithPaths(
        lookup,
        target.definition,
        related,
        nestedPaths,
        includeDeleted,
        depth + 1,
        nextVisited
      );
    } else {
      result[embedKey] = related;
    }
  }

  return result;
};

export const applyRelationEmbeds = (
  lookup: RelationLookup,
  definition: StoreDefinition,
  item: StoreItem,
  req: Request
): StoreItem => {
  const paths = parseExpandPaths(req);
  if (paths.length === 0 || definition.relations.length === 0) {
    return item;
  }

  return applyEmbedsWithPaths(
    lookup,
    definition,
    item,
    paths,
    isIncludeDeletedRequested(req),
    1,
    new Set()
  );
};

type OnDeleteConflictState = {
  conflicts: StoreConflictItem[];
  responseName?: string;
  detail?: StoreConflictConfig['detail'];
};

const visitItemKey = (
  collection: RelationCollectionView,
  item: StoreItem
): string => {
  return `${ collection.definition.id }\0${ encodeFieldTuple(collection.definition.keyFields, item) }`;
};

const listAllCollections = (lookup: RelationLookup): RelationCollectionView[] => {
  if (!lookup.listCollections) {
    return [];
  }

  return lookup.listCollections();
};

const findRelationDependents = (
  child: RelationCollectionView,
  relation: StoreRelationConfig,
  parentItem: StoreItem,
  parentKeyFields: string[]
): [string, StoreItem][] => {
  return [...child.items.entries()].filter(([, item]) => {
    if (isSoftDeleted(item, child.definition.softDelete)) {
      return false;
    }
    return matchesParentKey(relation, item, parentItem, parentKeyFields);
  });
};

const pushRestrictConflict = (
  state: OnDeleteConflictState,
  relation: StoreRelationConfig,
  parentItem: StoreItem,
  parentKeyFields: string[]
): void => {
  state.conflicts.push({
    field: relationConflictField(relation),
    value: parentKeyFields.length === 1
      ? parentItem[parentKeyFields[0]]
      : parentKeyFields.map(field => parentItem[field]),
    message: DEFAULT_DELETE_RESTRICT_MESSAGE,
    fields: relation.localFields.length > 1 ? [...relation.localFields] : undefined
  });

  const restrictConflict = relation.onDeleteConflict ?? relation.conflict;
  if (state.conflicts.length === 1) {
    state.responseName = restrictConflict?.response;
    state.detail = restrictConflict?.detail;
  } else {
    state.responseName = undefined;
    state.detail = undefined;
  }
};

const mergeRestrictState = (
  target: OnDeleteConflictState,
  source: OnDeleteConflictState
): void => {
  if (source.conflicts.length === 0) {
    return;
  }

  if (target.conflicts.length === 0) {
    target.conflicts = source.conflicts;
    target.responseName = source.responseName;
    target.detail = source.detail;
    return;
  }

  target.conflicts.push(...source.conflicts);
  target.responseName = undefined;
  target.detail = undefined;
};

/**
 * Phase 1: collect restrict conflicts (including through cascade chains) without mutating.
 */
const collectRestrictOnDelete = (
  lookup: RelationLookup,
  parent: RelationCollectionView,
  parentItem: StoreItem,
  visited: Set<string>
): OnDeleteConflictState => {
  const state: OnDeleteConflictState = { conflicts: [] };
  const parentKeyFields = parent.definition.keyFields;
  if (parentKeyFields.length === 0) {
    return state;
  }

  const visitKey = visitItemKey(parent, parentItem);
  if (visited.has(visitKey)) {
    return state;
  }
  visited.add(visitKey);

  for (const child of listAllCollections(lookup)) {
    for (const relation of child.definition.relations) {
      if (relation.type !== 'one' || relation.storeId !== parent.definition.id) {
        continue;
      }

      if (relation.localFields.length !== parentKeyFields.length) {
        continue;
      }

      const dependents = findRelationDependents(
        child,
        relation,
        parentItem,
        parentKeyFields
      );
      if (dependents.length === 0) {
        continue;
      }

      if (relation.onDelete === 'restrict') {
        pushRestrictConflict(state, relation, parentItem, parentKeyFields);
        continue;
      }

      if (relation.onDelete === 'cascade') {
        for (const [, item] of dependents) {
          mergeRestrictState(
            state,
            collectRestrictOnDelete(lookup, child, item, visited)
          );
        }
      }
    }
  }

  return state;
};

/**
 * Phase 2: apply setNull / cascade after restrict checks passed.
 */
const applyMutatingOnDelete = (
  lookup: RelationLookup,
  parent: RelationCollectionView,
  parentItem: StoreItem,
  visited: Set<string>
): void => {
  const parentKeyFields = parent.definition.keyFields;
  if (parentKeyFields.length === 0) {
    return;
  }

  const visitKey = visitItemKey(parent, parentItem);
  if (visited.has(visitKey)) {
    return;
  }
  visited.add(visitKey);

  for (const child of listAllCollections(lookup)) {
    for (const relation of child.definition.relations) {
      if (relation.type !== 'one' || relation.storeId !== parent.definition.id) {
        continue;
      }

      if (relation.localFields.length !== parentKeyFields.length) {
        continue;
      }

      const dependents = findRelationDependents(
        child,
        relation,
        parentItem,
        parentKeyFields
      );
      if (dependents.length === 0) {
        continue;
      }

      if (relation.onDelete === 'setNull') {
        for (const [mapKey, item] of dependents) {
          const next: StoreItem = { ...item };
          for (const field of relation.localFields) {
            next[field] = null;
          }
          child.items.set(mapKey, next);
        }
        lookup.persistCollection(child);
        continue;
      }

      if (relation.onDelete === 'cascade') {
        for (const [mapKey, item] of dependents) {
          applyMutatingOnDelete(lookup, child, item, visited);
          if (child.definition.softDelete) {
            child.items.set(mapKey, markSoftDeleted(item, child.definition.softDelete));
          } else {
            child.items.delete(mapKey);
          }
        }
        lookup.persistCollection(child);
      }
    }
  }
};

export const applyOnDelete = (
  lookup: RelationLookup,
  parent: RelationCollectionView,
  parentItem: StoreItem
): OnDeleteConflictState | null => {
  const parentKeyFields = parent.definition.keyFields;
  if (parentKeyFields.length === 0) {
    return null;
  }

  const collected = collectRestrictOnDelete(
    lookup,
    parent,
    parentItem,
    new Set()
  );
  if (collected.conflicts.length > 0) {
    return collected;
  }

  applyMutatingOnDelete(lookup, parent, parentItem, new Set());
  return null;
};
