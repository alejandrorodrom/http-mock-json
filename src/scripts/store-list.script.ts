import { Request } from 'express';
import { JsonValue } from '../types/json.type';
import {
  StoreItem,
  StoreListConfig,
  StoreListLinks,
  StoreListQuery,
  StoreListResult,
  StoreListSortSpec
} from '../types/store.type';
import { isArray, isObject } from './guards.script';
import {
  compareValues,
  getItemValue
} from './store-list-filter.script';

export { filterStoreItems, sortStoreItems } from './store-list-filter.script';
export { parseSortSpecs, resolveListQuery } from './store-list-query.script';
export { applyListHeaderTemplate, applyListTemplate } from './store-list-template.script';

interface CursorPayload {
  s: JsonValue[];
  k: JsonValue[];
}

const encodeCursor = (
  item: StoreItem,
  specs: StoreListSortSpec[],
  keyFields: string[]
): string => {
  const payload: CursorPayload = {
    s: specs.map(spec => getItemValue(item, spec.field) ?? null),
    k: keyFields.map(field => getItemValue(item, field) ?? null)
  };
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
};

const decodeCursor = (
  token: string
): { ok: true; payload: CursorPayload } | { ok: false; message: string } => {
  try {
    const json = Buffer.from(token, 'base64url').toString('utf8');
    const parsed = JSON.parse(json) as unknown;
    if (
      !isObject(parsed)
      || !isArray((parsed as CursorPayload).s)
      || !isArray((parsed as CursorPayload).k)
    ) {
      return { ok: false, message: 'Query "cursor" is invalid' };
    }
    return { ok: true, payload: parsed as CursorPayload };
  } catch {
    return { ok: false, message: 'Query "cursor" is invalid' };
  }
};

const compareItemToCursor = (
  item: StoreItem,
  payload: CursorPayload,
  specs: StoreListSortSpec[],
  keyFields: string[]
): number => {
  for (const [index, spec] of specs.entries()) {
    const direction = spec.order === 'asc' ? 1 : -1;
    const compared = direction * compareValues(
      getItemValue(item, spec.field),
      payload.s[index]
    );
    if (compared !== 0) {
      return compared;
    }
  }

  for (const [index, field] of keyFields.entries()) {
    const compared = compareValues(getItemValue(item, field), payload.k[index]);
    if (compared !== 0) {
      return compared;
    }
  }

  return 0;
};

const collectQueryParams = (req: Request): URLSearchParams => {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(req.query)) {
    if (typeof value === 'string') {
      params.set(key, value);
      continue;
    }
    if (Array.isArray(value) && typeof value[0] === 'string') {
      params.set(key, value[0]);
    }
  }
  return params;
};

const buildRequestUrl = (req: Request, params: URLSearchParams): string => {
  const host = req.get('host') || 'localhost';
  const protocol = req.protocol || 'http';
  const path = req.baseUrl + req.path;
  const query = params.toString();
  return query.length > 0
    ? `${ protocol }://${ host }${ path }?${ query }`
    : `${ protocol }://${ host }${ path }`;
};

const buildListLinks = (
  req: Request,
  config: StoreListConfig,
  result: Pick<
    StoreListResult,
    'page' | 'pageSize' | 'offset' | 'limit' | 'total' | 'totalPages' | 'mode' | 'nextCursor' | 'hasMore'
  >
): StoreListLinks => {
  const params = collectQueryParams(req);
  const self = buildRequestUrl(req, params);

  let hasNext = false;
  let hasPrevious = false;
  let next: string | null = null;
  let previous: string | null = null;

  if (result.mode === 'page' && config.page) {
    const pageQuery = config.page.query;
    const pageSizeQuery = config.pageSize?.query;
    if (pageSizeQuery && !params.has(pageSizeQuery)) {
      const aliasHit = config.pageSize?.aliases.find(alias => params.has(alias));
      if (!aliasHit) {
        params.set(pageSizeQuery, String(result.pageSize));
      }
    }

    hasPrevious = result.page > 1;
    hasNext = result.page < result.totalPages && result.total > 0;

    if (hasPrevious) {
      const prevParams = new URLSearchParams(params);
      prevParams.set(pageQuery, String(result.page - 1));
      previous = buildRequestUrl(req, prevParams);
    }

    if (hasNext) {
      const nextParams = new URLSearchParams(params);
      nextParams.set(pageQuery, String(result.page + 1));
      next = buildRequestUrl(req, nextParams);
    }
  } else if (result.mode === 'offset' && config.offset && config.limit) {
    const offsetQuery = config.offset.query;
    const limitQuery = config.limit.query;
    if (!params.has(limitQuery)) {
      params.set(limitQuery, String(result.limit));
    }

    hasPrevious = result.offset > 0;
    hasNext = result.offset + result.limit < result.total;

    if (hasPrevious) {
      const prevParams = new URLSearchParams(params);
      prevParams.set(offsetQuery, String(Math.max(0, result.offset - result.limit)));
      previous = buildRequestUrl(req, prevParams);
    }

    if (hasNext) {
      const nextParams = new URLSearchParams(params);
      nextParams.set(offsetQuery, String(result.offset + result.limit));
      next = buildRequestUrl(req, nextParams);
    }
  } else if (result.mode === 'cursor' && config.cursor && result.hasMore && result.nextCursor) {
    hasNext = true;
    const nextParams = new URLSearchParams(params);
    nextParams.set(config.cursor.query, result.nextCursor);
    if (!nextParams.has(config.cursor.limit.query)) {
      nextParams.set(config.cursor.limit.query, String(result.limit));
    }
    next = buildRequestUrl(req, nextParams);
  }

  const linkParts: string[] = [];
  if (next) {
    linkParts.push(`<${ next }>; rel="next"`);
  }
  if (previous) {
    linkParts.push(`<${ previous }>; rel="prev"`);
  }

  return {
    self,
    next,
    previous,
    hasNext,
    hasPrevious,
    linkHeader: linkParts.join(', ')
  };
};

const emptyLinks = (): StoreListLinks => ({
  self: '',
  next: null,
  previous: null,
  hasNext: false,
  hasPrevious: false,
  linkHeader: ''
});

export const buildListResult = (
  items: StoreItem[],
  listQuery: StoreListQuery,
  req: Request,
  config: StoreListConfig,
  keyFields: string[]
): { ok: true; result: StoreListResult } | { ok: false; message: string } => {
  const total = items.length;

  if (listQuery.mode === 'cursor') {
    let window = items;

    if (listQuery.cursorToken) {
      const decoded = decodeCursor(listQuery.cursorToken);
      if (!decoded.ok) {
        return {
          ok: false,
          message: decoded.message.replace('cursor', config.cursor?.query ?? 'cursor')
        };
      }

      if (
        decoded.payload.s.length !== listQuery.sortSpecs.length
        || decoded.payload.k.length !== keyFields.length
      ) {
        return {
          ok: false,
          message: `Query "${ config.cursor?.query ?? 'cursor' }" is invalid`
        };
      }

      window = items.filter(
        item => compareItemToCursor(item, decoded.payload, listQuery.sortSpecs, keyFields) > 0
      );
    }

    const limit = listQuery.limit;
    const hasMore = window.length > limit;
    const sliced = window.slice(0, limit);
    const nextCursor = hasMore && sliced.length > 0
      ? encodeCursor(sliced[sliced.length - 1], listQuery.sortSpecs, keyFields)
      : null;

    const base: StoreListResult = {
      items: sliced,
      total,
      page: 1,
      pageSize: limit,
      offset: 0,
      limit,
      totalPages: 1,
      sort: listQuery.sort,
      order: listQuery.order,
      sortSpecs: listQuery.sortSpecs,
      mode: 'cursor',
      ...emptyLinks(),
      hasNext: hasMore,
      nextCursor,
      hasMore
    };

    const links = buildListLinks(req, config, base);
    return { ok: true, result: { ...base, ...links } };
  }

  if (listQuery.mode === 'all') {
    const base: StoreListResult = {
      items,
      total,
      page: 1,
      pageSize: total,
      offset: 0,
      limit: total,
      totalPages: 1,
      sort: listQuery.sort,
      order: listQuery.order,
      sortSpecs: listQuery.sortSpecs,
      mode: 'all',
      ...emptyLinks(),
      nextCursor: null,
      hasMore: false
    };

    const links = buildListLinks(req, config, base);
    return {
      ok: true,
      result: {
        ...base,
        ...links,
        hasMore: links.hasNext
      }
    };
  }

  const pageSize = listQuery.pageSize;
  const totalPages = pageSize > 0
    ? Math.max(1, Math.ceil(total / pageSize) || 1)
    : 1;
  const sliced = items.slice(listQuery.offset, listQuery.offset + listQuery.limit);

  const base: StoreListResult = {
    items: sliced,
    total,
    page: listQuery.page,
    pageSize,
    offset: listQuery.offset,
    limit: listQuery.limit,
    totalPages,
    sort: listQuery.sort,
    order: listQuery.order,
    sortSpecs: listQuery.sortSpecs,
    mode: listQuery.mode,
    ...emptyLinks(),
    nextCursor: null,
    hasMore: false
  };

  const links = buildListLinks(req, config, base);
  return {
    ok: true,
    result: {
      ...base,
      ...links,
      hasMore: links.hasNext
    }
  };
};
