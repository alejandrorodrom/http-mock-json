import { StoreAction } from '../types/store.type';

export const STORE_PROPERTY = 'store';

export const STORE_ACTIONS: StoreAction[] = [
  'list',
  'get',
  'create',
  'update',
  'patch',
  'delete',
  'restore'
];

export const STORE_ACTION_SET = new Set<string>(STORE_ACTIONS);

export const DEFAULT_STORE_KEY = 'id';

export const DEFAULT_SOFT_DELETE_FIELD = 'deletedAt';

export const INCLUDE_DELETED_QUERY = 'includeDeleted';

export const EXPAND_QUERY = 'expand';

export const STORE_RELATION_ON_DELETE = ['restrict', 'cascade', 'setNull'] as const;

export const STORE_RELATION_ON_DELETE_SET = new Set<string>(STORE_RELATION_ON_DELETE);

export const STORE_RELATION_ON_DELETE_LABEL = STORE_RELATION_ON_DELETE.join(', ');

export const DEFAULT_RELATION_ON_DELETE = 'restrict' as const;

export const DEFAULT_RELATION_TYPE = 'one' as const;

export const STORE_RELATION_TYPES = ['one', 'many'] as const;

export const STORE_RELATION_TYPE_SET = new Set<string>(STORE_RELATION_TYPES);

export const STORE_RELATION_TYPE_LABEL = STORE_RELATION_TYPES.join(', ');

export const MAX_EXPAND_DEPTH = 3;

export const DEFAULT_FK_CONFLICT_MESSAGE = 'Related record not found';

export const DEFAULT_DELETE_RESTRICT_MESSAGE = 'Cannot delete: related records exist';

export const DEFAULT_CONFLICT_STATUS = 409;

export const DEFAULT_NOT_FOUND_STATUS = 404;

export const DEFAULT_CONFLICT_MESSAGE = 'Duplicate value(s)';

export const DEFAULT_NOT_FOUND_MESSAGE = 'Not found';

export const STORE_PERSIST_DIR = '.store';

export const DEFAULT_LIST_PAGE = 1;

export const DEFAULT_LIST_PAGE_SIZE = 10;

export const DEFAULT_LIST_PAGE_SIZE_MAX = 100;

export const DEFAULT_LIST_OFFSET = 0;

export const DEFAULT_LIST_SORT_QUERY = 'sort';

export const DEFAULT_LIST_ORDER_QUERY = 'order';

export const DEFAULT_LIST_ORDER = 'asc' as const;

export const DEFAULT_LIST_PAGE_QUERY = 'page';

export const DEFAULT_LIST_PAGE_SIZE_QUERY = 'pageSize';

export const DEFAULT_LIST_OFFSET_QUERY = 'offset';

export const DEFAULT_LIST_LIMIT_QUERY = 'limit';

export const DEFAULT_LIST_PAGE_SIZE_ALIASES: readonly string[] = [DEFAULT_LIST_LIMIT_QUERY];

export const DEFAULT_LIST_SORT_FIELD = 'id';

export const DEFAULT_LIST_SEARCH_QUERY = 'q';

export const DEFAULT_LIST_CURSOR_QUERY = 'cursor';

export const STORE_LIST_FILTER_OPS = ['eq', 'ne', 'gt', 'gte', 'lt', 'lte', 'in'] as const;

export const STORE_LIST_FILTER_OP_SET = new Set<string>(STORE_LIST_FILTER_OPS);

export const STORE_LIST_FILTER_OPS_LABEL = STORE_LIST_FILTER_OPS.join(', ');
