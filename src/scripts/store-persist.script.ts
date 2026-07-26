import { dirname, isAbsolute, join, normalize, sep } from 'path';
import * as fs from 'fs';
import { STORE_PERSIST_DIR } from '../constants/store.constant';
import {
  StoreDefinition,
  StoreItem,
  StorePersistConfig,
  StoreResetOption
} from '../types/store.type';
import { isArray, isObject } from './guards.script';
import { validateStoreItems } from './store-items.script';

export const isPersistFileInsideMocks = (
  mocksDir: string,
  file: string
): boolean => {
  if (typeof file !== 'string' || file.length === 0 || isAbsolute(file)) {
    return false;
  }

  const root = normalize(mocksDir);
  const resolved = normalize(join(root, file));
  return resolved.startsWith(`${ root }${ sep }`);
};

export const resolvePersistFilePath = (
  mocksDir: string,
  storeId: string,
  persist?: StorePersistConfig
): string => {
  if (persist?.file) {
    if (!isPersistFileInsideMocks(mocksDir, persist.file)) {
      throw new Error(
        `The "store.persist.file" must be a relative path under the mocks directory`
      );
    }

    return normalize(join(mocksDir, persist.file));
  }

  return join(mocksDir, STORE_PERSIST_DIR, `${ storeId }.json`);
};

export const buildPersistWatchIgnored = (
  mocksDir: string,
  definitions: StoreDefinition[]
): ((watchPath: string) => boolean) => {
  const normalizedMocksDir = normalize(mocksDir);
  const files = new Set<string>();
  const dirs = new Set<string>();
  const storeDirPattern = /(^|[\\/])\.store([\\/]|$)/;

  for (const definition of definitions) {
    if (!definition.persist?.enabled) {
      continue;
    }

    const filePath = normalize(
      resolvePersistFilePath(mocksDir, definition.id, definition.persist)
    );
    files.add(filePath);
    files.add(`${ filePath }.tmp`);

    const parentDir = normalize(dirname(filePath));
    if (parentDir !== normalizedMocksDir) {
      dirs.add(parentDir);
    }
  }

  return (watchPath: string): boolean => {
    const normalized = normalize(watchPath);

    if (storeDirPattern.test(normalized)) {
      return true;
    }

    if (files.has(normalized)) {
      return true;
    }

    for (const dir of dirs) {
      if (normalized === dir || normalized.startsWith(`${ dir }${ sep }`)) {
        return true;
      }
    }

    return false;
  };
};

export const readPersistedItems = (filePath: string): StoreItem[] | null => {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  let content: string;
  try {
    content = fs.readFileSync(filePath, 'utf-8');
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Invalid persisted store file "${ filePath }": ${ detail }`
    );
  }

  let data: unknown;
  try {
    data = JSON.parse(content) as unknown;
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Invalid persisted store file "${ filePath }": ${ detail }`
    );
  }

  if (!isObject(data) || !isArray((data as { items?: unknown }).items)) {
    throw new Error(
      `Invalid persisted store file "${ filePath }": expected an object with an "items" array`
    );
  }

  const items = (data as { items: unknown[] }).items;
  for (const [index, item] of items.entries()) {
    if (!isObject(item)) {
      throw new Error(
        `Invalid persisted store file "${ filePath }": items[${ index }] must be an object`
      );
    }
  }

  return items as StoreItem[];
};

export const assertPersistedItemsValid = (
  filePath: string,
  definition: StoreDefinition,
  items: StoreItem[]
): void => {
  validateStoreItems(definition, items, issue => {
    if (issue.type === 'missing_key') {
      throw new Error(
        `Invalid persisted store file "${ filePath }": items[${ issue.index }] is missing key field "${ issue.field }"`
      );
    }

    if (issue.type === 'duplicate_key') {
      throw new Error(
        `Invalid persisted store file "${ filePath }": duplicate key (${ definition.keyFields.join(', ') })`
      );
    }

    throw new Error(
      `Invalid persisted store file "${ filePath }": duplicate unique field "${ issue.field }"`
    );
  });
};

export const writePersistedItems = (
  filePath: string,
  items: StoreItem[]
): void => {
  const directory = dirname(filePath);
  fs.mkdirSync(directory, { recursive: true });

  const payload = `${ JSON.stringify({ items }, null, 2) }\n`;
  const tempPath = `${ filePath }.tmp`;

  fs.writeFileSync(tempPath, payload, 'utf-8');
  fs.renameSync(tempPath, filePath);
};

export const deletePersistedFile = (filePath: string): void => {
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
};

export const resetPersistedStores = (
  mocksDir: string,
  definitions: StoreDefinition[],
  resetStore: StoreResetOption
): void => {
  const selectedIds = resetStore === true
    ? null
    : new Set(resetStore);

  for (const definition of definitions) {
    if (!definition.persist?.enabled) {
      continue;
    }

    if (selectedIds && !selectedIds.has(definition.id)) {
      continue;
    }

    deletePersistedFile(
      resolvePersistFilePath(mocksDir, definition.id, definition.persist)
    );
  }

  if (resetStore === true) {
    const storeDir = join(mocksDir, STORE_PERSIST_DIR);
    if (fs.existsSync(storeDir)) {
      for (const entry of fs.readdirSync(storeDir)) {
        if (entry.endsWith('.json') || entry.endsWith('.json.tmp')) {
          deletePersistedFile(join(storeDir, entry));
        }
      }
    }
  }
};

export const shouldResetStore = (
  resetStore: StoreResetOption | undefined,
  storeId: string
): boolean => {
  if (resetStore === undefined) {
    return false;
  }

  if (resetStore === true) {
    return true;
  }

  return resetStore.includes(storeId);
};
