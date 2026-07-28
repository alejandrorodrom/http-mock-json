import {
  DEFAULT_STORE_KEY,
  STORE_LIST_FILTER_OPS_LABEL,
  STORE_LIST_FILTER_OP_SET,
  STORE_PROPERTY,
  STORE_RELATION_ON_DELETE_LABEL,
  STORE_RELATION_ON_DELETE_SET,
  STORE_RELATION_TYPE_LABEL,
  STORE_RELATION_TYPE_SET
} from '../constants/store.constant';
import { LocalIssue } from '../types/validation.type';
import {
  RawStoreConfig,
  RawStoreKey,
  RawStoreList,
  RawStoreListObject,
  RawStorePersist,
  RawStoreRelation,
  RawStoreRelations,
  RawStoreSoftDelete,
  RawStoreUnique,
  StoreConflictConfig,
  StoreDefinition,
  StoreUniqueField
} from '../types/store.type';
import {
  hasProperty,
  isArray,
  isEmpty,
  isExisting,
  isNonNegativeInt,
  isObject,
  isPositiveInt
} from '../scripts/guards.script';
import { getKeys } from '../scripts/objects.script';
import {
  isStoreReference,
  normalizeKey,
  normalizeRelations,
  normalizeSoftDelete,
  normalizeStoreDefinition
} from '../scripts/store-normalize.script';
import { isPersistFileInsideMocks } from '../scripts/store-persist.script';
import { validateStoreItems, uniqueConstraintLabel, encodeFieldTuple } from '../scripts/store-items.script';
import { isSoftDeleted } from '../scripts/store-soft-delete.script';

export interface StoreValidationResult {
  errors: LocalIssue[];
  warnings: LocalIssue[];
  definition: StoreDefinition | null;
  isReference: boolean;
}

const push = (
  errors: LocalIssue[],
  endpoint: string,
  message: string
): void => {
  errors.push({ endpoint, message });
};

const validateConflict = (
  errors: LocalIssue[],
  endpoint: string,
  label: string,
  conflict: unknown
): void => {
  if (!isExisting(conflict)) {
    return;
  }

  if (!isObject(conflict)) {
    push(errors, endpoint, `The "${ label }" property must be an object`);
    return;
  }

  const config = conflict as StoreConflictConfig;
  const keys = getKeys(config as Record<string, unknown>);

  for (const key of keys) {
    if (key !== 'response' && key !== 'detail') {
      push(errors, endpoint, `The "${ label }" property contains unknown key "${ key }"`);
    }
  }

  if (hasProperty(config, 'response')) {
    if (typeof config.response !== 'string' || config.response.length === 0) {
      push(errors, endpoint, `The "${ label }.response" must be a non-empty string`);
    }
  }

  if (hasProperty(config, 'detail')) {
    if (typeof config.detail === 'string') {
      if (config.detail.length === 0) {
        push(errors, endpoint, `The "${ label }.detail" must be a non-empty string or object`);
      }
    } else if (isObject(config.detail)) {
      if (isEmpty(config.detail)) {
        push(errors, endpoint, `The "${ label }.detail" must be a non-empty string or object`);
      } else {
        for (const [key, value] of Object.entries(config.detail)) {
          if (typeof value !== 'string') {
            push(errors, endpoint, `The "${ label }.detail.${ key }" must be a string`);
          }
        }
      }
    } else {
      push(errors, endpoint, `The "${ label }.detail" must be a non-empty string or object`);
    }
  }
};

const warnIfUniqueMatchesKey = (
  warnings: LocalIssue[],
  endpoint: string,
  path: string,
  fields: string[],
  keyFields: string[]
): void => {
  if (
    fields.length === keyFields.length
    && fields.every((field, i) => field === keyFields[i])
  ) {
    warnings.push({
      endpoint,
      message: `The "${ path }" matches the store key and is redundant`
    });
  }
};

const uniqueEntryFields = (entry: StoreUniqueField): string[] | null => {
  if (typeof entry === 'string') {
    return entry.length > 0 ? [entry] : null;
  }

  if (!isObject(entry)) {
    return null;
  }

  const hasField = hasProperty(entry, 'field');
  const hasFields = hasProperty(entry, 'fields');

  if (hasField && hasFields) {
    return null;
  }

  if (hasFields) {
    if (
      !isArray(entry.fields)
      || isEmpty(entry.fields)
      || entry.fields.some(item => typeof item !== 'string' || item.length === 0)
    ) {
      return null;
    }
    return entry.fields;
  }

  if (hasField && typeof entry.field === 'string' && entry.field.length > 0) {
    return [entry.field];
  }

  return null;
};

const assertNoDuplicateUniqueConstraints = (
  errors: LocalIssue[],
  endpoint: string,
  entries: StoreUniqueField[]
): void => {
  const seen = new Set<string>();

  entries.forEach((entry, index) => {
    const fields = uniqueEntryFields(entry);
    if (!fields) {
      return;
    }

    const label = uniqueConstraintLabel(fields);
    if (seen.has(label)) {
      push(
        errors,
        endpoint,
        `The "store.unique.fields[${ index }]" duplicates the unique constraint "${ label }"`
      );
      return;
    }

    seen.add(label);
  });
};

const validateUniqueFieldEntry = (
  errors: LocalIssue[],
  warnings: LocalIssue[],
  endpoint: string,
  entry: StoreUniqueField,
  index: number,
  keyFields: string[]
): void => {
  if (typeof entry === 'string') {
    if (entry.length === 0) {
      push(errors, endpoint, `The "store.unique.fields[${ index }]" must be a non-empty string`);
    } else {
      warnIfUniqueMatchesKey(
        warnings,
        endpoint,
        `store.unique.fields[${ index }]`,
        [entry],
        keyFields
      );
    }
    return;
  }

  if (!isObject(entry)) {
    push(
      errors,
      endpoint,
      `The "store.unique.fields[${ index }]" must be a string or an object with "field" or "fields"`
    );
    return;
  }

  const entryKeys = getKeys(entry as unknown as Record<string, unknown>);
  for (const key of entryKeys) {
    if (key !== 'field' && key !== 'fields' && key !== 'conflict') {
      push(
        errors,
        endpoint,
        `The "store.unique.fields[${ index }]" property contains unknown key "${ key }"`
      );
    }
  }

  const hasField = hasProperty(entry, 'field');
  const hasFields = hasProperty(entry, 'fields');

  if (hasField && hasFields) {
    push(
      errors,
      endpoint,
      `The "store.unique.fields[${ index }]" object cannot include both "field" and "fields"`
    );
    return;
  }

  if (hasFields) {
    if (!isArray(entry.fields) || isEmpty(entry.fields)
      || entry.fields.some(item => typeof item !== 'string' || item.length === 0)) {
      push(
        errors,
        endpoint,
        `The "store.unique.fields[${ index }].fields" must be a non-empty array of strings`
      );
    } else {
      warnIfUniqueMatchesKey(
        warnings,
        endpoint,
        `store.unique.fields[${ index }].fields`,
        entry.fields,
        keyFields
      );
    }
  } else if (hasField) {
    if (typeof entry.field !== 'string' || entry.field.length === 0) {
      push(
        errors,
        endpoint,
        `The "store.unique.fields[${ index }].field" must be a non-empty string`
      );
    } else {
      warnIfUniqueMatchesKey(
        warnings,
        endpoint,
        `store.unique.fields[${ index }].field`,
        [entry.field],
        keyFields
      );
    }
  } else {
    push(
      errors,
      endpoint,
      `The "store.unique.fields[${ index }]" object must include "field" or "fields"`
    );
  }

  validateConflict(errors, endpoint, `store.unique.fields[${ index }].conflict`, entry.conflict);
};

const validateUnique = (
  errors: LocalIssue[],
  warnings: LocalIssue[],
  endpoint: string,
  unique: RawStoreUnique,
  keyFields: string[]
): void => {
  if (isArray(unique)) {
    if (isEmpty(unique)) {
      push(errors, endpoint, 'The "store.unique" array must not be empty');
      return;
    }

    unique.forEach((entry, index) => {
      validateUniqueFieldEntry(
        errors,
        warnings,
        endpoint,
        entry as StoreUniqueField,
        index,
        keyFields
      );
    });
    assertNoDuplicateUniqueConstraints(errors, endpoint, unique as StoreUniqueField[]);
    return;
  }

  if (!isObject(unique)) {
    push(errors, endpoint, 'The "store.unique" property must be an array or an object');
    return;
  }

  const keys = getKeys(unique as unknown as Record<string, unknown>);
  for (const key of keys) {
    if (key !== 'fields' && key !== 'conflict') {
      push(errors, endpoint, `The "store.unique" property contains unknown key "${ key }"`);
    }
  }

  if (!hasProperty(unique, 'fields')) {
    push(errors, endpoint, 'The "store.unique" object must include "fields"');
    return;
  }

  if (!isArray(unique.fields)) {
    push(errors, endpoint, 'The "store.unique.fields" property must be an array');
    return;
  }

  if (isEmpty(unique.fields)) {
    push(errors, endpoint, 'The "store.unique.fields" array must not be empty');
    return;
  }

  unique.fields.forEach((entry, index) => {
    validateUniqueFieldEntry(
      errors,
      warnings,
      endpoint,
      entry as StoreUniqueField,
      index,
      keyFields
    );
  });

  assertNoDuplicateUniqueConstraints(errors, endpoint, unique.fields as StoreUniqueField[]);
  validateConflict(errors, endpoint, 'store.unique.conflict', unique.conflict);
};

const validateKey = (
  errors: LocalIssue[],
  endpoint: string,
  key: RawStoreKey
): void => {
  if (typeof key === 'string') {
    if (key.length === 0) {
      push(errors, endpoint, 'The "store.key" must be a non-empty string');
    }
    return;
  }

  if (isArray(key)) {
    if (isEmpty(key) || key.some(item => typeof item !== 'string' || item.length === 0)) {
      push(errors, endpoint, 'The "store.key" array must contain non-empty strings');
    }
    return;
  }

  if (!isObject(key)) {
    push(
      errors,
      endpoint,
      'The "store.key" must be a string, an array of strings, or an object'
    );
    return;
  }

  const keys = getKeys(key as Record<string, unknown>);
  for (const name of keys) {
    if (name !== 'field' && name !== 'fields' && name !== 'conflict') {
      push(errors, endpoint, `The "store.key" property contains unknown key "${ name }"`);
    }
  }

  if (hasProperty(key, 'fields') && hasProperty(key, 'field')) {
    push(errors, endpoint, 'The "store.key" object cannot include both "field" and "fields"');
  }

  if (hasProperty(key, 'fields')) {
    if (!isArray(key.fields) || isEmpty(key.fields)
      || key.fields.some(item => typeof item !== 'string' || item.length === 0)) {
      push(errors, endpoint, 'The "store.key.fields" must be a non-empty array of strings');
    }
  } else if (hasProperty(key, 'field')) {
    if (typeof key.field !== 'string' || key.field.length === 0) {
      push(errors, endpoint, 'The "store.key.field" must be a non-empty string');
    }
  } else {
    push(errors, endpoint, 'The "store.key" object must include "field" or "fields"');
  }

  validateConflict(errors, endpoint, 'store.key.conflict', key.conflict);
};

const validateSeedUniqueness = (
  errors: LocalIssue[],
  endpoint: string,
  definition: StoreDefinition
): void => {
  validateStoreItems(definition, definition.seed, issue => {
    if (issue.type === 'missing_key') {
      push(
        errors,
        endpoint,
        `The "store.seed[${ issue.index }]" item is missing key field "${ issue.field }"`
      );
      return;
    }

    if (issue.type === 'duplicate_key') {
      push(
        errors,
        endpoint,
        `The "store.seed" contains duplicate key (${ definition.keyFields.join(', ') })`
      );
      return;
    }

    push(
      errors,
      endpoint,
      `The "store.seed" contains duplicate unique field "${ issue.field }"`
    );
  });
};

const validateFilterFieldEntries = (
  errors: LocalIssue[],
  endpoint: string,
  path: string,
  entries: unknown
): void => {
  if (!isArray(entries) || isEmpty(entries)) {
    push(
      errors,
      endpoint,
      `The "${ path }" must be a non-empty array of strings or field objects`
    );
    return;
  }

  for (const [index, entry] of entries.entries()) {
    if (typeof entry === 'string') {
      if (entry.length === 0) {
        push(
          errors,
          endpoint,
          `The "${ path }" must be a non-empty array of strings or field objects`
        );
      }
      continue;
    }
    if (!isObject(entry)) {
      push(
        errors,
        endpoint,
        `The "${ path }" must be a non-empty array of strings or field objects`
      );
      continue;
    }
    const fieldEntry = entry as Record<string, unknown>;
    const entryKeys = getKeys(fieldEntry);
    for (const key of entryKeys) {
      if (key !== 'field' && key !== 'op' && key !== 'query') {
        push(
          errors,
          endpoint,
          `The "${ path }[${ index }]" property contains unknown key "${ key }"`
        );
      }
    }
    if (
      !hasProperty(fieldEntry, 'field')
      || typeof fieldEntry.field !== 'string'
      || fieldEntry.field.length === 0
    ) {
      push(
        errors,
        endpoint,
        `The "${ path }[${ index }].field" must be a non-empty string`
      );
    }
    if (hasProperty(fieldEntry, 'op')) {
      if (typeof fieldEntry.op !== 'string' || !STORE_LIST_FILTER_OP_SET.has(fieldEntry.op)) {
        push(
          errors,
          endpoint,
          `The "${ path }[${ index }].op" must be one of: ${ STORE_LIST_FILTER_OPS_LABEL }`
        );
      }
    }
    if (
      hasProperty(fieldEntry, 'query')
      && (typeof fieldEntry.query !== 'string' || fieldEntry.query.length === 0)
    ) {
      push(
        errors,
        endpoint,
        `The "${ path }[${ index }].query" must be a non-empty string`
      );
    }
  }
};

const validateList = (
  errors: LocalIssue[],
  endpoint: string,
  list: RawStoreList
): void => {
  if (typeof list === 'boolean') {
    return;
  }

  if (!isObject(list)) {
    push(errors, endpoint, 'The "store.list" property must be a boolean or an object');
    return;
  }

  const config = list as RawStoreListObject;
  const keys = getKeys(config as unknown as Record<string, unknown>);
  for (const key of keys) {
    if (!['page', 'pageSize', 'offset', 'limit', 'sort', 'order', 'filter', 'cursor'].includes(key)) {
      push(errors, endpoint, `The "store.list" property contains unknown key "${ key }"`);
    }
  }

  if (hasProperty(config, 'page')) {
    if (!isObject(config.page)) {
      push(errors, endpoint, 'The "store.list.page" property must be an object');
    } else {
      const pageKeys = getKeys(config.page as Record<string, unknown>);
      for (const key of pageKeys) {
        if (key !== 'query' && key !== 'default') {
          push(errors, endpoint, `The "store.list.page" property contains unknown key "${ key }"`);
        }
      }
      if (hasProperty(config.page, 'query')
        && (typeof config.page.query !== 'string' || config.page.query.length === 0)) {
        push(errors, endpoint, 'The "store.list.page.query" must be a non-empty string');
      }
      if (hasProperty(config.page, 'default') && !isPositiveInt(config.page.default)) {
        push(errors, endpoint, 'The "store.list.page.default" must be an integer >= 1');
      }
    }
  }

  if (hasProperty(config, 'pageSize')) {
    if (!isObject(config.pageSize)) {
      push(errors, endpoint, 'The "store.list.pageSize" property must be an object');
    } else {
      const pageSizeKeys = getKeys(config.pageSize as Record<string, unknown>);
      for (const key of pageSizeKeys) {
        if (!['query', 'default', 'max', 'aliases'].includes(key)) {
          push(
            errors,
            endpoint,
            `The "store.list.pageSize" property contains unknown key "${ key }"`
          );
        }
      }
      if (hasProperty(config.pageSize, 'query')
        && (typeof config.pageSize.query !== 'string' || config.pageSize.query.length === 0)) {
        push(errors, endpoint, 'The "store.list.pageSize.query" must be a non-empty string');
      }
      if (hasProperty(config.pageSize, 'default') && !isPositiveInt(config.pageSize.default)) {
        push(errors, endpoint, 'The "store.list.pageSize.default" must be an integer >= 1');
      }
      if (hasProperty(config.pageSize, 'max') && !isPositiveInt(config.pageSize.max)) {
        push(errors, endpoint, 'The "store.list.pageSize.max" must be an integer >= 1');
      }
      if (
        hasProperty(config.pageSize, 'default')
        && hasProperty(config.pageSize, 'max')
        && isPositiveInt(config.pageSize.default)
        && isPositiveInt(config.pageSize.max)
        && config.pageSize.default > config.pageSize.max
      ) {
        push(
          errors,
          endpoint,
          'The "store.list.pageSize.default" must be less than or equal to "max"'
        );
      }
      if (hasProperty(config.pageSize, 'aliases')) {
        if (
          !isArray(config.pageSize.aliases)
          || config.pageSize.aliases.some(item => typeof item !== 'string' || item.length === 0)
        ) {
          push(
            errors,
            endpoint,
            'The "store.list.pageSize.aliases" must be an array of non-empty strings'
          );
        }
      }
    }
  }

  if (hasProperty(config, 'offset')) {
    if (!isObject(config.offset)) {
      push(errors, endpoint, 'The "store.list.offset" property must be an object');
    } else {
      const offsetKeys = getKeys(config.offset as Record<string, unknown>);
      for (const key of offsetKeys) {
        if (key !== 'query' && key !== 'default') {
          push(errors, endpoint, `The "store.list.offset" property contains unknown key "${ key }"`);
        }
      }
      if (hasProperty(config.offset, 'query')
        && (typeof config.offset.query !== 'string' || config.offset.query.length === 0)) {
        push(errors, endpoint, 'The "store.list.offset.query" must be a non-empty string');
      }
      if (hasProperty(config.offset, 'default') && !isNonNegativeInt(config.offset.default)) {
        push(errors, endpoint, 'The "store.list.offset.default" must be an integer >= 0');
      }
    }
  }

  if (hasProperty(config, 'limit')) {
    if (!isObject(config.limit)) {
      push(errors, endpoint, 'The "store.list.limit" property must be an object');
    } else {
      const limitKeys = getKeys(config.limit as Record<string, unknown>);
      for (const key of limitKeys) {
        if (!['query', 'default', 'max'].includes(key)) {
          push(errors, endpoint, `The "store.list.limit" property contains unknown key "${ key }"`);
        }
      }
      if (hasProperty(config.limit, 'query')
        && (typeof config.limit.query !== 'string' || config.limit.query.length === 0)) {
        push(errors, endpoint, 'The "store.list.limit.query" must be a non-empty string');
      }
      if (hasProperty(config.limit, 'default') && !isPositiveInt(config.limit.default)) {
        push(errors, endpoint, 'The "store.list.limit.default" must be an integer >= 1');
      }
      if (hasProperty(config.limit, 'max') && !isPositiveInt(config.limit.max)) {
        push(errors, endpoint, 'The "store.list.limit.max" must be an integer >= 1');
      }
      if (
        hasProperty(config.limit, 'default')
        && hasProperty(config.limit, 'max')
        && isPositiveInt(config.limit.default)
        && isPositiveInt(config.limit.max)
        && config.limit.default > config.limit.max
      ) {
        push(
          errors,
          endpoint,
          'The "store.list.limit.default" must be less than or equal to "max"'
        );
      }
    }
  }

  if (hasProperty(config, 'sort')) {
    if (!isObject(config.sort)) {
      push(errors, endpoint, 'The "store.list.sort" property must be an object');
    } else {
      const sortKeys = getKeys(config.sort as Record<string, unknown>);
      for (const key of sortKeys) {
        if (!['query', 'default', 'fields'].includes(key)) {
          push(errors, endpoint, `The "store.list.sort" property contains unknown key "${ key }"`);
        }
      }
      if (hasProperty(config.sort, 'query')
        && (typeof config.sort.query !== 'string' || config.sort.query.length === 0)) {
        push(errors, endpoint, 'The "store.list.sort.query" must be a non-empty string');
      }
      if (hasProperty(config.sort, 'default')
        && (typeof config.sort.default !== 'string' || config.sort.default.length === 0)) {
        push(errors, endpoint, 'The "store.list.sort.default" must be a non-empty string');
      }
      if (hasProperty(config.sort, 'fields')) {
        if (
          !isArray(config.sort.fields)
          || isEmpty(config.sort.fields)
          || config.sort.fields.some(item => typeof item !== 'string' || item.length === 0)
        ) {
          push(
            errors,
            endpoint,
            'The "store.list.sort.fields" must be a non-empty array of strings'
          );
        }
      }
    }
  }

  if (hasProperty(config, 'order')) {
    if (!isObject(config.order)) {
      push(errors, endpoint, 'The "store.list.order" property must be an object');
    } else {
      const orderKeys = getKeys(config.order as Record<string, unknown>);
      for (const key of orderKeys) {
        if (key !== 'query' && key !== 'default') {
          push(errors, endpoint, `The "store.list.order" property contains unknown key "${ key }"`);
        }
      }
      if (hasProperty(config.order, 'query')
        && (typeof config.order.query !== 'string' || config.order.query.length === 0)) {
        push(errors, endpoint, 'The "store.list.order.query" must be a non-empty string');
      }
      if (hasProperty(config.order, 'default')) {
        if (typeof config.order.default !== 'string') {
          push(errors, endpoint, 'The "store.list.order.default" must be "asc" or "desc"');
        } else {
          const normalized = config.order.default.toLowerCase();
          if (normalized !== 'asc' && normalized !== 'desc') {
            push(errors, endpoint, 'The "store.list.order.default" must be "asc" or "desc"');
          }
        }
      }
    }
  }

  if (hasProperty(config, 'cursor')) {
    if (typeof config.cursor !== 'boolean' && !isObject(config.cursor)) {
      push(errors, endpoint, 'The "store.list.cursor" property must be a boolean or an object');
    } else if (isObject(config.cursor)) {
      const cursorKeys = getKeys(config.cursor as unknown as Record<string, unknown>);
      for (const key of cursorKeys) {
        if (key !== 'query' && key !== 'limit') {
          push(
            errors,
            endpoint,
            `The "store.list.cursor" property contains unknown key "${ key }"`
          );
        }
      }
      if (hasProperty(config.cursor, 'query')
        && (typeof config.cursor.query !== 'string' || config.cursor.query.length === 0)) {
        push(errors, endpoint, 'The "store.list.cursor.query" must be a non-empty string');
      }
      if (hasProperty(config.cursor, 'limit')) {
        if (!isObject(config.cursor.limit)) {
          push(errors, endpoint, 'The "store.list.cursor.limit" property must be an object');
        } else {
          const limitKeys = getKeys(config.cursor.limit as unknown as Record<string, unknown>);
          for (const key of limitKeys) {
            if (!['query', 'default', 'max'].includes(key)) {
              push(
                errors,
                endpoint,
                `The "store.list.cursor.limit" property contains unknown key "${ key }"`
              );
            }
          }
          if (hasProperty(config.cursor.limit, 'query')
            && (typeof config.cursor.limit.query !== 'string'
              || config.cursor.limit.query.length === 0)) {
            push(
              errors,
              endpoint,
              'The "store.list.cursor.limit.query" must be a non-empty string'
            );
          }
          if (hasProperty(config.cursor.limit, 'default')
            && !isPositiveInt(config.cursor.limit.default)) {
            push(
              errors,
              endpoint,
              'The "store.list.cursor.limit.default" must be an integer >= 1'
            );
          }
          if (hasProperty(config.cursor.limit, 'max')
            && !isPositiveInt(config.cursor.limit.max)) {
            push(errors, endpoint, 'The "store.list.cursor.limit.max" must be an integer >= 1');
          }
        }
      }
    }
  }

  if (hasProperty(config, 'filter')) {
    if (isArray(config.filter)) {
      if (
        isEmpty(config.filter)
        || config.filter.some(item => typeof item !== 'string' || item.length === 0)
      ) {
        push(
          errors,
          endpoint,
          'The "store.list.filter" array must be a non-empty array of strings'
        );
      }
    } else if (!isObject(config.filter)) {
      push(
        errors,
        endpoint,
        'The "store.list.filter" property must be an array or an object'
      );
    } else {
      const filterKeys = getKeys(config.filter as Record<string, unknown>);
      for (const key of filterKeys) {
        if (key !== 'fields' && key !== 'or' && key !== 'search') {
          push(
            errors,
            endpoint,
            `The "store.list.filter" property contains unknown key "${ key }"`
          );
        }
      }
      if (hasProperty(config.filter, 'fields')) {
        validateFilterFieldEntries(
          errors,
          endpoint,
          'store.list.filter.fields',
          config.filter.fields
        );
      }
      if (hasProperty(config.filter, 'or')) {
        validateFilterFieldEntries(
          errors,
          endpoint,
          'store.list.filter.or',
          config.filter.or
        );
      }
      if (hasProperty(config.filter, 'search')) {
        if (!isObject(config.filter.search)) {
          push(errors, endpoint, 'The "store.list.filter.search" property must be an object');
        } else {
          const searchKeys = getKeys(config.filter.search as unknown as Record<string, unknown>);
          for (const key of searchKeys) {
            if (key !== 'query' && key !== 'fields') {
              push(
                errors,
                endpoint,
                `The "store.list.filter.search" property contains unknown key "${ key }"`
              );
            }
          }
          if (hasProperty(config.filter.search, 'query')
            && (typeof config.filter.search.query !== 'string'
              || config.filter.search.query.length === 0)) {
            push(
              errors,
              endpoint,
              'The "store.list.filter.search.query" must be a non-empty string'
            );
          }
          if (
            !hasProperty(config.filter.search, 'fields')
            || !isArray(config.filter.search.fields)
            || isEmpty(config.filter.search.fields)
            || config.filter.search.fields.some(
              item => typeof item !== 'string' || item.length === 0
            )
          ) {
            push(
              errors,
              endpoint,
              'The "store.list.filter.search.fields" must be a non-empty array of strings'
            );
          }
        }
      }
      const hasFields = hasProperty(config.filter, 'fields')
        && isArray(config.filter.fields)
        && !isEmpty(config.filter.fields);
      const hasOr = hasProperty(config.filter, 'or')
        && isArray(config.filter.or)
        && !isEmpty(config.filter.or);
      const hasSearch = hasProperty(config.filter, 'search');
      if (!hasFields && !hasOr && !hasSearch) {
        push(
          errors,
          endpoint,
          'The "store.list.filter" object must include "fields", "or", and/or "search"'
        );
      }
    }
  }
};

const validatePersist = (
  errors: LocalIssue[],
  endpoint: string,
  persist: RawStorePersist,
  mocksDir: string
): void => {
  if (typeof persist === 'boolean') {
    return;
  }

  if (!isObject(persist)) {
    push(errors, endpoint, 'The "store.persist" property must be a boolean or an object');
    return;
  }

  const keys = getKeys(persist as unknown as Record<string, unknown>);
  for (const key of keys) {
    if (key !== 'enabled' && key !== 'file') {
      push(errors, endpoint, `The "store.persist" property contains unknown key "${ key }"`);
    }
  }

  if (!hasProperty(persist, 'enabled') || typeof persist.enabled !== 'boolean') {
    push(errors, endpoint, 'The "store.persist.enabled" must be a boolean');
  }

  if (hasProperty(persist, 'file')) {
    if (typeof persist.file !== 'string' || persist.file.length === 0) {
      push(errors, endpoint, 'The "store.persist.file" must be a non-empty string');
    } else if (!isPersistFileInsideMocks(mocksDir, persist.file)) {
      push(
        errors,
        endpoint,
        'The "store.persist.file" must be a relative path under the mocks directory'
      );
    }
  }
};

const collectUniqueFieldNames = (unique: RawStoreUnique): string[] => {
  const entries = isArray(unique)
    ? unique
    : isObject(unique) && isArray(unique.fields)
      ? unique.fields
      : null;

  if (!entries) {
    return [];
  }

  return entries.flatMap((entry) => uniqueEntryFields(entry) ?? []);
};

const validateRelations = (
  errors: LocalIssue[],
  endpoint: string,
  relations: RawStoreRelations,
  keyFields: string[],
  softDelete: ReturnType<typeof normalizeSoftDelete>
): void => {
  if (!isObject(relations)) {
    push(errors, endpoint, 'The "store.relations" property must be an object');
    return;
  }

  const softDeleteField = softDelete && softDelete !== null ? softDelete.field : undefined;
  const names = new Set<string>();

  for (const [name, raw] of Object.entries(relations)) {
    if (name.length === 0) {
      push(errors, endpoint, 'The "store.relations" property contains an empty field name');
      continue;
    }

    if (names.has(name)) {
      push(errors, endpoint, `The "store.relations" property contains duplicate field "${ name }"`);
    }
    names.add(name);

    validateRelationEntry(errors, endpoint, name, raw as RawStoreRelation, keyFields, softDeleteField);
  }

  if (isEmpty(errors) && normalizeRelations(relations) === null) {
    push(errors, endpoint, 'The "store.relations" configuration is invalid');
  }
};

const validateRelationEntry = (
  errors: LocalIssue[],
  endpoint: string,
  name: string,
  raw: RawStoreRelation,
  keyFields: string[],
  softDeleteField: string | undefined
): void => {
  const label = `store.relations.${ name }`;

  if (typeof raw === 'string') {
    if (raw.length === 0) {
      push(errors, endpoint, `The "${ label }" must be a non-empty string or an object`);
      return;
    }

    if (keyFields.includes(name)) {
      push(errors, endpoint, `The "${ label }" local field cannot overlap store key fields`);
    }
    if (softDeleteField && name === softDeleteField) {
      push(
        errors,
        endpoint,
        `The "${ label }" local field cannot overlap store.softDelete.field`
      );
    }
    return;
  }

  if (!isObject(raw)) {
    push(errors, endpoint, `The "${ label }" must be a non-empty string or an object`);
    return;
  }

  const allowed = [
    'store',
    'type',
    'join',
    'required',
    'onDelete',
    'embed',
    'conflict'
  ];
  const keys = getKeys(raw as unknown as Record<string, unknown>);
  for (const key of keys) {
    if (!allowed.includes(key)) {
      push(errors, endpoint, `The "${ label }" property contains unknown key "${ key }"`);
    }
  }

  if (!hasProperty(raw, 'store') || typeof raw.store !== 'string' || raw.store.length === 0) {
    push(errors, endpoint, `The "${ label }.store" must be a non-empty string`);
  }

  if (hasProperty(raw, 'type')) {
    if (typeof raw.type !== 'string' || !STORE_RELATION_TYPE_SET.has(raw.type)) {
      push(
        errors,
        endpoint,
        `The "${ label }.type" must be one of: ${ STORE_RELATION_TYPE_LABEL }`
      );
    }
  }

  const type = raw.type === 'many' ? 'many' : 'one';
  validateRelationEmbed(errors, endpoint, label, raw.embed);

  if (type === 'many') {
    if (hasProperty(raw, 'required') || hasProperty(raw, 'onDelete') || hasProperty(raw, 'conflict')) {
      push(
        errors,
        endpoint,
        `The "${ label }" with type "many" cannot include required, onDelete, or conflict`
      );
    }

    if (!hasProperty(raw, 'join') || !isObject(raw.join)) {
      push(errors, endpoint, `The "${ label }" with type "many" must include "join" with "from"`);
      return;
    }

    const joinKeys = getKeys(raw.join as unknown as Record<string, unknown>);
    for (const key of joinKeys) {
      if (key !== 'from' && key !== 'to') {
        push(errors, endpoint, `The "${ label }.join" property contains unknown key "${ key }"`);
      }
    }

    if (hasProperty(raw.join, 'to')) {
      push(errors, endpoint, `The "${ label }.join" with type "many" cannot include "to"`);
    }

    if (!hasProperty(raw.join, 'from')) {
      push(errors, endpoint, `The "${ label }.join.from" must be a non-empty string or string array`);
    } else {
      validateJoinColumns(errors, endpoint, `${ label }.join.from`, raw.join.from);
    }

    return;
  }

  let localFields = [name];

  if (hasProperty(raw, 'join')) {
    if (!isObject(raw.join)) {
      push(errors, endpoint, `The "${ label }.join" must be an object`);
    } else {
      const joinKeys = getKeys(raw.join as unknown as Record<string, unknown>);
      for (const key of joinKeys) {
        if (key !== 'from' && key !== 'to') {
          push(errors, endpoint, `The "${ label }.join" property contains unknown key "${ key }"`);
        }
      }

      if (hasProperty(raw.join, 'from')) {
        validateJoinColumns(errors, endpoint, `${ label }.join.from`, raw.join.from);
        if (typeof raw.join.from === 'string' && raw.join.from.length > 0) {
          localFields = [raw.join.from];
        } else if (isArray(raw.join.from)) {
          localFields = (raw.join.from as string[]).filter(
            item => typeof item === 'string' && item.length > 0
          );
        }
      }

      if (hasProperty(raw.join, 'to')) {
        validateJoinColumns(errors, endpoint, `${ label }.join.to`, raw.join.to);
        const fromLen = hasProperty(raw.join, 'from')
          ? (typeof raw.join.from === 'string' ? 1 : isArray(raw.join.from) ? raw.join.from.length : 0)
          : 1;
        const toLen = typeof raw.join.to === 'string'
          ? 1
          : isArray(raw.join.to) ? raw.join.to.length : 0;
        if (fromLen > 0 && toLen > 0 && fromLen !== toLen) {
          push(
            errors,
            endpoint,
            `The "${ label }.join.from" and "${ label }.join.to" must have the same length`
          );
        }
      }
    }
  }

  if (!hasProperty(raw, 'join') && keyFields.includes(name)) {
    push(errors, endpoint, `The "${ label }" local field cannot overlap store key fields`);
  }

  for (const field of localFields) {
    if (softDeleteField && field === softDeleteField) {
      push(
        errors,
        endpoint,
        `The "${ label }" local field "${ field }" cannot overlap store.softDelete.field`
      );
    }
  }

  if (hasProperty(raw, 'required') && typeof raw.required !== 'boolean') {
    push(errors, endpoint, `The "${ label }.required" must be a boolean`);
  }

  validateRelationOnDelete(errors, endpoint, label, raw.onDelete);

  const embedAs = typeof raw.embed === 'string'
    ? raw.embed
    : isObject(raw.embed) && typeof (raw.embed as { as?: unknown }).as === 'string'
      ? (raw.embed as { as: string }).as
      : undefined;

  if (embedAs && localFields.includes(embedAs)) {
    push(
      errors,
      endpoint,
      `The "${ label }.embed.as" cannot be the same as a local relation field`
    );
  }

  const onDeleteAction = typeof raw.onDelete === 'string'
    ? raw.onDelete
    : isObject(raw.onDelete) && typeof (raw.onDelete as { action?: unknown }).action === 'string'
      ? (raw.onDelete as { action: string }).action
      : undefined;

  if (raw.required === true && onDeleteAction === 'setNull') {
    push(
      errors,
      endpoint,
      `The "${ label }" cannot use onDelete "setNull" when required is true`
    );
  }

  validateConflict(errors, endpoint, `${ label }.conflict`, raw.conflict);
  if (isObject(raw.onDelete)) {
    validateConflict(
      errors,
      endpoint,
      `${ label }.onDelete.conflict`,
      (raw.onDelete as { conflict?: unknown }).conflict
    );
  }
};

const validateJoinColumns = (
  errors: LocalIssue[],
  endpoint: string,
  label: string,
  value: unknown
): void => {
  if (typeof value === 'string') {
    if (value.length === 0) {
      push(errors, endpoint, `The "${ label }" must be a non-empty string or string array`);
    }
    return;
  }

  if (!isArray(value) || value.length === 0) {
    push(errors, endpoint, `The "${ label }" must be a non-empty string or string array`);
    return;
  }

  if (value.some(item => typeof item !== 'string' || item.length === 0)) {
    push(errors, endpoint, `The "${ label }" must be a non-empty string or string array`);
  }
};

const validateRelationEmbed = (
  errors: LocalIssue[],
  endpoint: string,
  label: string,
  embed: unknown
): void => {
  if (!isExisting(embed)) {
    return;
  }

  if (typeof embed === 'string') {
    if (embed.length === 0) {
      push(errors, endpoint, `The "${ label }.embed" must be a non-empty string or { "as": "..." }`);
    }
    return;
  }

  if (!isObject(embed)) {
    push(errors, endpoint, `The "${ label }.embed" must be a non-empty string or { "as": "..." }`);
    return;
  }

  const embedObject = embed as Record<string, unknown>;
  for (const key of getKeys(embedObject)) {
    if (key !== 'as') {
      push(errors, endpoint, `The "${ label }.embed" property contains unknown key "${ key }"`);
    }
  }

  if (!hasProperty(embedObject, 'as') || typeof embedObject.as !== 'string' || embedObject.as.length === 0) {
    push(errors, endpoint, `The "${ label }.embed.as" must be a non-empty string`);
  }
};

const validateRelationOnDelete = (
  errors: LocalIssue[],
  endpoint: string,
  label: string,
  onDelete: unknown
): void => {
  if (!isExisting(onDelete)) {
    return;
  }

  if (typeof onDelete === 'string') {
    if (!STORE_RELATION_ON_DELETE_SET.has(onDelete)) {
      push(
        errors,
        endpoint,
        `The "${ label }.onDelete" must be one of: ${ STORE_RELATION_ON_DELETE_LABEL }`
      );
    }
    return;
  }

  if (!isObject(onDelete)) {
    push(
      errors,
      endpoint,
      `The "${ label }.onDelete" must be one of: ${ STORE_RELATION_ON_DELETE_LABEL }, or an object with "action"`
    );
    return;
  }

  const onDeleteObject = onDelete as Record<string, unknown>;
  for (const key of getKeys(onDeleteObject)) {
    if (key !== 'action' && key !== 'conflict') {
      push(errors, endpoint, `The "${ label }.onDelete" property contains unknown key "${ key }"`);
    }
  }

  if (
    !hasProperty(onDeleteObject, 'action')
    || typeof onDeleteObject.action !== 'string'
    || !STORE_RELATION_ON_DELETE_SET.has(onDeleteObject.action)
  ) {
    push(
      errors,
      endpoint,
      `The "${ label }.onDelete.action" must be one of: ${ STORE_RELATION_ON_DELETE_LABEL }`
    );
  }
};

const sameStringArray = (left: string[], right: string[]): boolean => {
  return left.length === right.length && left.every((value, index) => value === right[index]);
};

/**
 * Cross-store checks after all store definitions are collected.
 * Resolves target key fields and validates seed foreign keys.
 */
export const validateStoreRelationsIntegrity = (
  stores: Map<string, StoreDefinition>
): LocalIssue[] => {
  const errors: LocalIssue[] = [];

  for (const definition of stores.values()) {
    for (const relation of definition.relations) {
      const target = stores.get(relation.storeId);
      if (!target) {
        errors.push({
          message: `The store relation "${ definition.id }.${ relation.name }" targets unknown store "${ relation.storeId }"`
        });
        continue;
      }

      if (relation.embedAs) {
        if (
          definition.keyFields.includes(relation.embedAs)
          || definition.relations.some(item => (
            item !== relation
            && (item.name === relation.embedAs || item.localFields.includes(relation.embedAs as string))
          ))
          || definition.softDelete?.field === relation.embedAs
        ) {
          errors.push({
            message: `The store relation "${ definition.id }.${ relation.name }.embed" "${ relation.embedAs }" conflicts with an existing field`
          });
        }
      }

      if (relation.type === 'many') {
        if (relation.foreignFields.length !== definition.keyFields.length) {
          errors.push({
            message: `The store relation "${ definition.id }.${ relation.name }.join.from" length must match this store key (${ definition.keyFields.join(', ') })`
          });
          continue;
        }

        const reverse = target.relations.find(item => (
          item.type === 'one'
          && item.storeId === definition.id
          && sameStringArray(item.localFields, relation.foreignFields)
        ));

        if (!reverse) {
          errors.push({
            message: `The store relation "${ definition.id }.${ relation.name }" requires store "${ relation.storeId }" to declare a type "one" relation to "${ definition.id }" with join.from [${ relation.foreignFields.join(', ') }]`
          });
        }
        continue;
      }

      if (relation.targetFields.length === 0) {
        if (target.keyFields.length !== 1) {
          errors.push({
            message: `The store relation "${ definition.id }.${ relation.name }" targets composite key store "${ relation.storeId }" and must set "join.from" and "join.to"`
          });
          continue;
        }
        relation.targetFields = [...target.keyFields];
      } else if (!sameStringArray(relation.targetFields, target.keyFields)) {
        errors.push({
          message: `The store relation "${ definition.id }.${ relation.name }.join.to" must match target key [${ target.keyFields.join(', ') }]`
        });
        continue;
      }

      if (relation.localFields.length !== relation.targetFields.length) {
        errors.push({
          message: `The store relation "${ definition.id }.${ relation.name }" join.from/join.to length mismatch`
        });
        continue;
      }

      definition.seed.forEach((item, index) => {
        const values = relation.localFields.map(field => item[field]);
        const missingCount = values.filter(
          value => value === undefined || value === null || value === ''
        ).length;

        if (missingCount === relation.localFields.length) {
          if (relation.required) {
            errors.push({
              message: `The store "${ definition.id }" seed[${ index }] is missing required relation "${ relation.name }"`
            });
          }
          return;
        }

        if (missingCount > 0) {
          errors.push({
            message: `The store "${ definition.id }" seed[${ index }] relation "${ relation.name }" has incomplete foreign key values`
          });
          return;
        }

        const keyItem: Record<string, unknown> = {};
        relation.localFields.forEach((local, fieldIndex) => {
          keyItem[relation.targetFields[fieldIndex]] = item[local];
        });

        const targetKeyValue = encodeFieldTuple(
          relation.targetFields,
          keyItem as Parameters<typeof encodeFieldTuple>[1]
        );
        const targetItem = target.seed.find(
          seedItem => encodeFieldTuple(relation.targetFields, seedItem) === targetKeyValue
        );

        if (!targetItem || isSoftDeleted(targetItem, target.softDelete)) {
          errors.push({
            message: `The store "${ definition.id }" seed[${ index }] relation "${ relation.name }" references missing or soft-deleted "${ relation.storeId }" record`
          });
        }
      });
    }
  }

  return errors;
};

const validateSoftDelete = (
  errors: LocalIssue[],
  endpoint: string,
  softDelete: RawStoreSoftDelete,
  keyFields: string[],
  uniqueFieldNames: string[]
): void => {
  if (softDelete === false) {
    return;
  }

  if (typeof softDelete !== 'boolean' && !isObject(softDelete)) {
    push(errors, endpoint, 'The "store.softDelete" property must be a boolean or an object');
    return;
  }

  if (isObject(softDelete)) {
    const keys = getKeys(softDelete as unknown as Record<string, unknown>);
    for (const key of keys) {
      if (key !== 'field') {
        push(errors, endpoint, `The "store.softDelete" property contains unknown key "${ key }"`);
      }
    }

    if (hasProperty(softDelete, 'field')) {
      if (typeof softDelete.field !== 'string' || softDelete.field.length === 0) {
        push(errors, endpoint, 'The "store.softDelete.field" must be a non-empty string');
        return;
      }
    }
  }

  const normalized = normalizeSoftDelete(softDelete);
  if (!normalized) {
    return;
  }

  if (keyFields.includes(normalized.field)) {
    push(
      errors,
      endpoint,
      `The "store.softDelete.field" "${ normalized.field }" cannot overlap store key fields`
    );
  }

  if (uniqueFieldNames.includes(normalized.field)) {
    push(
      errors,
      endpoint,
      `The "store.softDelete.field" "${ normalized.field }" cannot overlap store unique fields`
    );
  }
};

export const validateStore = (
  endpoint: string,
  store: unknown,
  mocksDir: string
): StoreValidationResult => {
  const errors: LocalIssue[] = [];
  const warnings: LocalIssue[] = [];

  if (!isObject(store)) {
    push(errors, endpoint, `The "${ STORE_PROPERTY }" property must be an object`);
    return { errors, warnings, definition: null, isReference: false };
  }

  const config = store as RawStoreConfig;

  if (!hasProperty(config, 'id') || typeof config.id !== 'string' || config.id.length === 0) {
    push(errors, endpoint, 'The "store.id" must be a non-empty string');
    return { errors, warnings, definition: null, isReference: false };
  }

  if (isStoreReference(config)) {
    return { errors, warnings, definition: null, isReference: true };
  }

  const keys = getKeys(config as unknown as Record<string, unknown>);
  for (const key of keys) {
    if (!['id', 'key', 'seed', 'template', 'unique', 'persist', 'list', 'softDelete', 'relations'].includes(key)) {
      push(errors, endpoint, `The "store" property contains unknown key "${ key }"`);
    }
  }

  if (hasProperty(config, 'key')) {
    validateKey(errors, endpoint, config.key as RawStoreKey);
  }

  if (hasProperty(config, 'seed')) {
    if (!isArray(config.seed)) {
      push(errors, endpoint, 'The "store.seed" property must be an array');
    } else {
      config.seed.forEach((item, index) => {
        if (!isObject(item)) {
          push(errors, endpoint, `The "store.seed[${ index }]" item must be an object`);
        }
      });
    }
  }

  if (hasProperty(config, 'template') && !isObject(config.template)) {
    push(errors, endpoint, 'The "store.template" property must be an object');
  }

  const normalizedKey = normalizeKey(config.key);
  const keyFields = normalizedKey?.fields ?? [DEFAULT_STORE_KEY];

  if (hasProperty(config, 'unique')) {
    validateUnique(
      errors,
      warnings,
      endpoint,
      config.unique as RawStoreUnique,
      keyFields
    );
  }

  if (hasProperty(config, 'persist')) {
    validatePersist(errors, endpoint, config.persist as RawStorePersist, mocksDir);
  }

  if (hasProperty(config, 'list')) {
    validateList(errors, endpoint, config.list as RawStoreList);
  }

  if (hasProperty(config, 'softDelete')) {
    const uniqueFieldNames = hasProperty(config, 'unique')
      ? collectUniqueFieldNames(config.unique as RawStoreUnique)
      : [];

    validateSoftDelete(
      errors,
      endpoint,
      config.softDelete as RawStoreSoftDelete,
      keyFields,
      uniqueFieldNames
    );
  }

  if (hasProperty(config, 'relations')) {
    validateRelations(
      errors,
      endpoint,
      config.relations as RawStoreRelations,
      keyFields,
      hasProperty(config, 'softDelete')
        ? normalizeSoftDelete(config.softDelete as RawStoreSoftDelete)
        : undefined
    );
  }

  if (!isEmpty(errors)) {
    return { errors, warnings, definition: null, isReference: false };
  }

  const definition = normalizeStoreDefinition(config);
  if (!definition) {
    push(errors, endpoint, 'The "store" configuration is invalid');
    return { errors, warnings, definition: null, isReference: false };
  }

  validateSeedUniqueness(errors, endpoint, definition);
  if (!isEmpty(errors)) {
    return { errors, warnings, definition: null, isReference: false };
  }

  return { errors, warnings, definition, isReference: false };
};
