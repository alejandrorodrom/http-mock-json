import { StoreAction } from '../../../types/store.type';
import { normalizeEndpoint } from './normalize-endpoint';

type CrudActionResponse = {
  name: string;
  statusCode: number;
  action: StoreAction;
};

type CrudMethod = {
  nameResponse: string;
  responses: CrudActionResponse[];
};

const actionMethod = (
  nameResponse: string,
  statusCode: number,
  action: StoreAction
): CrudMethod => ({
  nameResponse,
  responses: [{ name: nameResponse, statusCode, action }]
});

const resolveCrudRoutes = (endpoint: string): {
  collection: string;
  item: string;
  storeId: string;
} => {
  const normalized = normalizeEndpoint(endpoint);
  const segments = normalized.split('/').filter((segment) => segment.length > 0);
  const last = segments[segments.length - 1];
  const hasParamTail = Boolean(last?.startsWith(':'));
  const collectionSegments = hasParamTail
    ? segments.slice(0, -1)
    : segments;
  const safeCollection = collectionSegments.length > 0
    ? collectionSegments
    : ['items'];
  const collection = safeCollection.join('/');
  const rawStoreId = safeCollection[safeCollection.length - 1] ?? 'items';
  const storeId = rawStoreId.replace(/[^A-Za-z0-9_-]/g, '') || 'items';
  const itemParam = hasParamTail && last ? last : ':id';

  return {
    collection,
    item: `${ collection }/${ itemParam }`,
    storeId
  };
};

/**
 * Scaffold collection + /:id with store actions (list/create/get/update/patch/delete).
 */
export const structureCrudMock = (endpoint: string): Record<string, unknown> => {
  const { collection, item, storeId } = resolveCrudRoutes(endpoint);

  return {
    [collection]: {
      store: {
        id: storeId,
        key: 'id',
        seed: [],
        template: { id: 0 }
      },
      GET: actionMethod('list', 200, 'list'),
      POST: actionMethod('create', 201, 'create')
    },
    [item]: {
      store: { id: storeId },
      GET: actionMethod('get', 200, 'get'),
      PUT: actionMethod('update', 200, 'update'),
      PATCH: actionMethod('patch', 200, 'patch'),
      DELETE: actionMethod('remove', 204, 'delete')
    }
  };
};
