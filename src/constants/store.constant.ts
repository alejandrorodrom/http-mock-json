import { StoreAction } from '../types/store.type';

export const STORE_PROPERTY = 'store';

export const STORE_ACTIONS: StoreAction[] = [
  'list',
  'get',
  'create',
  'update',
  'patch',
  'delete'
];

export const STORE_ACTION_SET = new Set<string>(STORE_ACTIONS);

export const DEFAULT_STORE_KEY = 'id';

export const DEFAULT_CONFLICT_STATUS = 409;

export const DEFAULT_NOT_FOUND_STATUS = 404;

export const DEFAULT_CONFLICT_MESSAGE = 'Duplicate value(s)';

export const DEFAULT_NOT_FOUND_MESSAGE = 'Not found';

export const STORE_PERSIST_DIR = '.store';
