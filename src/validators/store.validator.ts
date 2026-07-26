import { STORE_PROPERTY } from '../constants/store.constant';
import { LocalIssue } from '../types/validation.type';
import {
  RawStoreConfig,
  RawStoreKey,
  RawStorePersist,
  RawStoreUnique,
  StoreConflictConfig,
  StoreDefinition,
  StoreUniqueField
} from '../types/store.type';
import { hasProperty, isArray, isEmpty, isExisting, isObject } from '../scripts/guards.script';
import { getKeys } from '../scripts/objects.script';
import {
  isStoreReference,
  normalizeStoreDefinition
} from '../scripts/store-normalize.script';
import { isPersistFileInsideMocks } from '../scripts/store-persist.script';
import { validateStoreItems } from '../scripts/store-items.script';

export interface StoreValidationResult {
  errors: LocalIssue[];
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

const validateUniqueFieldEntry = (
  errors: LocalIssue[],
  endpoint: string,
  entry: StoreUniqueField,
  index: number
): void => {
  if (typeof entry === 'string') {
    if (entry.length === 0) {
      push(errors, endpoint, `The "store.unique.fields[${ index }]" must be a non-empty string`);
    }
    return;
  }

  if (!isObject(entry)) {
    push(
      errors,
      endpoint,
      `The "store.unique.fields[${ index }]" must be a string or an object with "field"`
    );
    return;
  }

  if (typeof entry.field !== 'string' || entry.field.length === 0) {
    push(
      errors,
      endpoint,
      `The "store.unique.fields[${ index }].field" must be a non-empty string`
    );
  }

  validateConflict(errors, endpoint, `store.unique.fields[${ index }].conflict`, entry.conflict);
};

const validateUnique = (
  errors: LocalIssue[],
  endpoint: string,
  unique: RawStoreUnique
): void => {
  if (isArray(unique)) {
    if (isEmpty(unique)) {
      push(errors, endpoint, 'The "store.unique" array must not be empty');
      return;
    }

    unique.forEach((entry, index) => {
      validateUniqueFieldEntry(errors, endpoint, entry as StoreUniqueField, index);
    });
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
    validateUniqueFieldEntry(errors, endpoint, entry as StoreUniqueField, index);
  });

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

export const validateStore = (
  endpoint: string,
  store: unknown,
  mocksDir: string
): StoreValidationResult => {
  const errors: LocalIssue[] = [];

  if (!isObject(store)) {
    push(errors, endpoint, `The "${ STORE_PROPERTY }" property must be an object`);
    return { errors, definition: null, isReference: false };
  }

  const config = store as RawStoreConfig;

  if (!hasProperty(config, 'id') || typeof config.id !== 'string' || config.id.length === 0) {
    push(errors, endpoint, 'The "store.id" must be a non-empty string');
    return { errors, definition: null, isReference: false };
  }

  if (isStoreReference(config)) {
    return { errors, definition: null, isReference: true };
  }

  const keys = getKeys(config as unknown as Record<string, unknown>);
  for (const key of keys) {
    if (!['id', 'key', 'seed', 'template', 'unique', 'persist'].includes(key)) {
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

  if (hasProperty(config, 'unique')) {
    validateUnique(errors, endpoint, config.unique as RawStoreUnique);
  }

  if (hasProperty(config, 'persist')) {
    validatePersist(errors, endpoint, config.persist as RawStorePersist, mocksDir);
  }

  if (!isEmpty(errors)) {
    return { errors, definition: null, isReference: false };
  }

  const definition = normalizeStoreDefinition(config);
  if (!definition) {
    push(errors, endpoint, 'The "store" configuration is invalid');
    return { errors, definition: null, isReference: false };
  }

  validateSeedUniqueness(errors, endpoint, definition);
  if (!isEmpty(errors)) {
    return { errors, definition: null, isReference: false };
  }

  return { errors, definition, isReference: false };
};
