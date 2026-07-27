import { Request } from 'express';
import {
  DEFAULT_LIST_LIMIT_QUERY,
  DEFAULT_LIST_OFFSET,
  DEFAULT_LIST_OFFSET_QUERY,
  DEFAULT_LIST_PAGE,
  DEFAULT_LIST_PAGE_QUERY,
  DEFAULT_LIST_PAGE_SIZE,
  DEFAULT_LIST_PAGE_SIZE_ALIASES,
  DEFAULT_LIST_PAGE_SIZE_MAX,
  DEFAULT_LIST_PAGE_SIZE_QUERY
} from '../constants/store.constant';
import {
  StoreListConfig,
  StoreListLimitConfig,
  StoreListOffsetConfig,
  StoreListOrder,
  StoreListPageConfig,
  StoreListPageSizeConfig,
  StoreListQuery,
  StoreListSortSpec
} from '../types/store.type';

export const queryValue = (
  query: Request['query'],
  name: string
): string | undefined => {
  const value = query[name];
  if (value === undefined) {
    return undefined;
  }
  if (Array.isArray(value)) {
    const first = value[0];
    return typeof first === 'string' ? first : undefined;
  }
  return typeof value === 'string' ? value : undefined;
};

export const queryValues = (
  query: Request['query'],
  name: string
): string[] | undefined => {
  const value = query[name];
  if (value === undefined) {
    return undefined;
  }

  const chunks: string[] = [];
  if (Array.isArray(value)) {
    for (const entry of value) {
      if (typeof entry === 'string') {
        chunks.push(entry);
      }
    }
  } else if (typeof value === 'string') {
    chunks.push(value);
  } else {
    return undefined;
  }

  return chunks
    .flatMap(chunk => chunk.split(','))
    .map(part => part.trim())
    .filter(part => part.length > 0);
};

export const parsePositiveInt = (
  raw: string | undefined,
  fallback: number,
  label: string,
  max?: number
): { ok: true; value: number } | { ok: false; message: string } => {
  if (raw === undefined) {
    if (max !== undefined && fallback > max) {
      return { ok: false, message: `Query "${ label }" must be <= ${ max }` };
    }
    return { ok: true, value: fallback };
  }

  if (!/^\d+$/.test(raw)) {
    return { ok: false, message: `Query "${ label }" must be an integer` };
  }

  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1) {
    return { ok: false, message: `Query "${ label }" must be an integer >= 1` };
  }

  if (max !== undefined && value > max) {
    return { ok: false, message: `Query "${ label }" must be <= ${ max }` };
  }

  return { ok: true, value };
};

export const parseNonNegativeInt = (
  raw: string | undefined,
  fallback: number,
  label: string
): { ok: true; value: number } | { ok: false; message: string } => {
  if (raw === undefined) {
    return { ok: true, value: fallback };
  }

  if (!/^\d+$/.test(raw)) {
    return { ok: false, message: `Query "${ label }" must be an integer` };
  }

  const value = Number(raw);
  if (!Number.isInteger(value) || value < 0) {
    return { ok: false, message: `Query "${ label }" must be an integer >= 0` };
  }

  return { ok: true, value };
};

export const parseSortSpecs = (
  raw: string,
  defaultOrder: StoreListOrder,
  allowedFields: string[] | undefined,
  sortQueryName: string
): { ok: true; specs: StoreListSortSpec[] } | { ok: false; message: string } => {
  const parts = raw.split(',').map(part => part.trim()).filter(part => part.length > 0);
  if (parts.length === 0) {
    return { ok: false, message: `Query "${ sortQueryName }" must not be empty` };
  }

  const specs: StoreListSortSpec[] = [];

  for (const part of parts) {
    let field: string;
    let order: StoreListOrder;

    const colonIndex = part.lastIndexOf(':');
    if (colonIndex > 0) {
      field = part.slice(0, colonIndex);
      const dir = part.slice(colonIndex + 1).toLowerCase();
      if (dir !== 'asc' && dir !== 'desc') {
        return {
          ok: false,
          message: `Query "${ sortQueryName }" direction must be "asc" or "desc"`
        };
      }
      order = dir;
    } else if (part.startsWith('-') && part.length > 1) {
      field = part.slice(1);
      order = 'desc';
    } else if (part.startsWith('+') && part.length > 1) {
      field = part.slice(1);
      order = 'asc';
    } else {
      field = part;
      order = defaultOrder;
    }

    if (field.length === 0) {
      return { ok: false, message: `Query "${ sortQueryName }" contains an invalid field` };
    }

    if (allowedFields && !allowedFields.includes(field)) {
      return {
        ok: false,
        message: `Query "${ sortQueryName }" field must be one of: ${ allowedFields.join(', ') }`
      };
    }

    specs.push({ field, order });
  }

  return { ok: true, specs };
};

const defaultPageConfig = (): StoreListPageConfig => ({
  query: DEFAULT_LIST_PAGE_QUERY,
  default: DEFAULT_LIST_PAGE
});

const defaultPageSizeConfig = (): StoreListPageSizeConfig => ({
  query: DEFAULT_LIST_PAGE_SIZE_QUERY,
  default: DEFAULT_LIST_PAGE_SIZE,
  max: DEFAULT_LIST_PAGE_SIZE_MAX,
  aliases: [...DEFAULT_LIST_PAGE_SIZE_ALIASES]
});

const defaultOffsetConfig = (): StoreListOffsetConfig => ({
  query: DEFAULT_LIST_OFFSET_QUERY,
  default: DEFAULT_LIST_OFFSET
});

const defaultLimitConfig = (): StoreListLimitConfig => ({
  query: DEFAULT_LIST_LIMIT_QUERY,
  default: DEFAULT_LIST_PAGE_SIZE,
  max: DEFAULT_LIST_PAGE_SIZE_MAX
});

export const resolveListQuery = (
  config: StoreListConfig,
  req: Request
): { ok: true; query: StoreListQuery } | { ok: false; message: string } => {
  const orderRaw = queryValue(req.query, config.order.query);
  const orderNormalized = (orderRaw ?? config.order.default).toLowerCase();
  if (orderNormalized !== 'asc' && orderNormalized !== 'desc') {
    return {
      ok: false,
      message: `Query "${ config.order.query }" must be "asc" or "desc"`
    };
  }
  const defaultOrder = orderNormalized as StoreListOrder;

  const sortRaw = queryValue(req.query, config.sort.query) ?? config.sort.default;
  const parsedSort = parseSortSpecs(
    sortRaw,
    defaultOrder,
    config.sort.fields,
    config.sort.query
  );
  if (!parsedSort.ok) {
    return parsedSort;
  }

  const sortSpecs = parsedSort.specs;
  const sort = sortRaw;
  const order = sortSpecs[0]?.order ?? defaultOrder;

  const hasPageConfig = config.page !== undefined || config.pageSize !== undefined;
  const hasOffsetConfig = config.offset !== undefined || config.limit !== undefined;
  const hasCursorConfig = config.cursor !== undefined;

  const pageQuery = config.page?.query;
  const pageSizeQuery = config.pageSize?.query;
  const pageSizeAliases = config.pageSize?.aliases ?? [];
  const offsetQuery = config.offset?.query;
  const limitQuery = config.limit?.query;
  const cursorQuery = config.cursor?.query;

  const pagePresent = pageQuery ? queryValue(req.query, pageQuery) !== undefined : false;
  const pageSizePresent = pageSizeQuery
    ? queryValue(req.query, pageSizeQuery) !== undefined
      || pageSizeAliases.some(alias => queryValue(req.query, alias) !== undefined)
    : false;
  const offsetPresent = offsetQuery ? queryValue(req.query, offsetQuery) !== undefined : false;
  const limitPresent = limitQuery ? queryValue(req.query, limitQuery) !== undefined : false;
  const cursorPresent = cursorQuery ? queryValue(req.query, cursorQuery) !== undefined : false;

  const preferPage = hasPageConfig && (
    pagePresent
    || pageSizePresent
    || (!hasOffsetConfig && !hasCursorConfig)
    || (!offsetPresent && !limitPresent && !cursorPresent)
  );

  const preferOffset = !preferPage && hasOffsetConfig && (
    offsetPresent
    || limitPresent
    || !hasCursorConfig
  );

  if (preferPage && hasPageConfig) {
    const pageConfig = config.page ?? defaultPageConfig();
    const pageSizeConfig = config.pageSize ?? defaultPageSizeConfig();

    const pageResult = parsePositiveInt(
      queryValue(req.query, pageConfig.query),
      pageConfig.default,
      pageConfig.query
    );
    if (!pageResult.ok) {
      return pageResult;
    }

    let pageSizeRaw = queryValue(req.query, pageSizeConfig.query);
    let pageSizeLabel = pageSizeConfig.query;
    if (pageSizeRaw === undefined) {
      for (const alias of pageSizeConfig.aliases) {
        const aliasValue = queryValue(req.query, alias);
        if (aliasValue !== undefined) {
          pageSizeRaw = aliasValue;
          pageSizeLabel = alias;
          break;
        }
      }
    }

    const pageSizeResult = parsePositiveInt(
      pageSizeRaw,
      pageSizeConfig.default,
      pageSizeLabel,
      pageSizeConfig.max
    );
    if (!pageSizeResult.ok) {
      return pageSizeResult;
    }

    const page = pageResult.value;
    const pageSize = pageSizeResult.value;

    return {
      ok: true,
      query: {
        page,
        pageSize,
        offset: (page - 1) * pageSize,
        limit: pageSize,
        sort,
        order,
        sortSpecs,
        mode: 'page'
      }
    };
  }

  if (preferOffset && hasOffsetConfig) {
    const offsetConfig = config.offset ?? defaultOffsetConfig();
    const limitConfig = config.limit ?? defaultLimitConfig();

    const offsetResult = parseNonNegativeInt(
      queryValue(req.query, offsetConfig.query),
      offsetConfig.default,
      offsetConfig.query
    );
    if (!offsetResult.ok) {
      return offsetResult;
    }

    const limitResult = parsePositiveInt(
      queryValue(req.query, limitConfig.query),
      limitConfig.default,
      limitConfig.query,
      limitConfig.max
    );
    if (!limitResult.ok) {
      return limitResult;
    }

    const offset = offsetResult.value;
    const limit = limitResult.value;

    return {
      ok: true,
      query: {
        page: Math.floor(offset / limit) + 1,
        pageSize: limit,
        offset,
        limit,
        sort,
        order,
        sortSpecs,
        mode: 'offset'
      }
    };
  }

  if (hasCursorConfig && config.cursor) {
    const limitResult = parsePositiveInt(
      queryValue(req.query, config.cursor.limit.query),
      config.cursor.limit.default,
      config.cursor.limit.query,
      config.cursor.limit.max
    );
    if (!limitResult.ok) {
      return limitResult;
    }

    const cursorToken = queryValue(req.query, config.cursor.query);
    if (cursorToken !== undefined && cursorToken.length === 0) {
      return { ok: false, message: `Query "${ config.cursor.query }" must not be empty` };
    }

    return {
      ok: true,
      query: {
        page: 1,
        pageSize: limitResult.value,
        offset: 0,
        limit: limitResult.value,
        sort,
        order,
        sortSpecs,
        mode: 'cursor',
        cursorToken
      }
    };
  }

  return {
    ok: true,
    query: {
      page: 1,
      pageSize: 0,
      offset: 0,
      limit: 0,
      sort,
      order,
      sortSpecs,
      mode: 'all'
    }
  };
};
