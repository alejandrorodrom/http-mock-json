import { StoreDefinition, StoreItem } from '../types/store.type';
import { hasProperty } from './guards.script';

export type StoreItemIssue =
  | { type: 'missing_key'; index: number; field: string }
  | { type: 'duplicate_key' }
  | { type: 'duplicate_unique'; field: string };

export const encodeFieldTuple = (
  fields: string[],
  item: StoreItem
): string => {
  return fields.map(field => String(item[field])).join('\0');
};

export const uniqueConstraintLabel = (fields: string[]): string => {
  return fields.join('+');
};

export const itemHasAllFields = (
  item: StoreItem,
  fields: string[]
): boolean => {
  return fields.every(field => hasProperty(item, field));
};

export const validateStoreItems = (
  definition: Pick<StoreDefinition, 'keyFields' | 'uniqueFields'>,
  items: StoreItem[],
  onIssue: (issue: StoreItemIssue) => void
): void => {
  const seenKeys = new Set<string>();
  const seenUnique = new Map<string, Set<string>>();

  for (const uniqueField of definition.uniqueFields) {
    seenUnique.set(uniqueConstraintLabel(uniqueField.fields), new Set());
  }

  items.forEach((item, index) => {
    for (const keyField of definition.keyFields) {
      if (!hasProperty(item, keyField)) {
        onIssue({ type: 'missing_key', index, field: keyField });
      }
    }

    const keyValue = encodeFieldTuple(definition.keyFields, item);
    if (seenKeys.has(keyValue)) {
      onIssue({ type: 'duplicate_key' });
    }
    seenKeys.add(keyValue);

    for (const uniqueField of definition.uniqueFields) {
      if (!itemHasAllFields(item, uniqueField.fields)) {
        continue;
      }

      const label = uniqueConstraintLabel(uniqueField.fields);
      const value = encodeFieldTuple(uniqueField.fields, item);
      const bucket = seenUnique.get(label)!;
      if (bucket.has(value)) {
        onIssue({ type: 'duplicate_unique', field: label });
      }
      bucket.add(value);
    }
  });
};
