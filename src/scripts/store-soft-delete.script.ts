import { Request } from 'express';
import { INCLUDE_DELETED_QUERY } from '../constants/store.constant';
import { StoreItem, StoreSoftDeleteConfig } from '../types/store.type';

export const isSoftDeleted = (
  item: StoreItem,
  softDelete?: StoreSoftDeleteConfig
): boolean => {
  if (!softDelete) {
    return false;
  }

  const value = item[softDelete.field];
  if (value === undefined || value === null) {
    return false;
  }

  if (typeof value === 'string') {
    return value.length > 0;
  }

  return Boolean(value);
};

export const isIncludeDeletedRequested = (req: Request): boolean => {
  const raw = req.query?.[INCLUDE_DELETED_QUERY];
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (typeof value !== 'string') {
    return false;
  }
  return value === 'true' || value === '1';
};

export const filterOutSoftDeleted = (
  items: StoreItem[],
  softDelete?: StoreSoftDeleteConfig
): StoreItem[] => {
  if (!softDelete) {
    return items;
  }

  return items.filter(item => !isSoftDeleted(item, softDelete));
};

export const markSoftDeleted = (
  item: StoreItem,
  softDelete: StoreSoftDeleteConfig
): StoreItem => {
  return {
    ...item,
    [softDelete.field]: new Date().toISOString()
  };
};

export const clearSoftDeleted = (
  item: StoreItem,
  softDelete: StoreSoftDeleteConfig
): StoreItem => {
  const next = { ...item };
  delete next[softDelete.field];
  return next;
};
