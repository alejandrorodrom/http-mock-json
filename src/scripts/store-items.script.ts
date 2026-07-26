import { StoreDefinition, StoreItem } from '../types/store.type';
import { hasProperty } from './guards.script';

export type StoreItemIssue =
  | { type: 'missing_key'; index: number; field: string }
  | { type: 'duplicate_key' }
  | { type: 'duplicate_unique'; field: string };

export const encodeStoreKey = (
  fields: string[],
  item: StoreItem
): string => {
  return fields.map(field => String(item[field])).join('\0');
};

export const validateStoreItems = (
  definition: Pick<StoreDefinition, 'keyFields' | 'uniqueFields'>,
  items: StoreItem[],
  onIssue: (issue: StoreItemIssue) => void
): void => {
  const seenKeys = new Set<string>();
  const seenUnique = new Map<string, Set<string>>();

  for (const field of definition.uniqueFields) {
    seenUnique.set(field.field, new Set());
  }

  items.forEach((item, index) => {
    for (const keyField of definition.keyFields) {
      if (!hasProperty(item, keyField)) {
        onIssue({ type: 'missing_key', index, field: keyField });
      }
    }

    const keyValue = encodeStoreKey(definition.keyFields, item);
    if (seenKeys.has(keyValue)) {
      onIssue({ type: 'duplicate_key' });
    }
    seenKeys.add(keyValue);

    for (const uniqueField of definition.uniqueFields) {
      if (!hasProperty(item, uniqueField.field)) {
        continue;
      }

      const value = String(item[uniqueField.field]);
      const bucket = seenUnique.get(uniqueField.field)!;
      if (bucket.has(value)) {
        onIssue({ type: 'duplicate_unique', field: uniqueField.field });
      }
      bucket.add(value);
    }
  });
};
