import { actionMethod, resolveCrudRoutes } from './structure-crud-mock';

export const DEFAULT_RELATIONS_CHILD_SEGMENT = 'posts';

const siblingCollection = (collection: string, name: string): string => {
  const idx = collection.lastIndexOf('/');
  if (idx === -1) {
    return name;
  }
  return `${ collection.slice(0, idx) }/${ name }`;
};

/** Soft singularize store ids for FK/embed names (`users` → `user`). */
const parentRelationNames = (parentStoreId: string): {
  fkField: string;
  embedAs: string;
  invalidResponse: string;
} => {
  const embedAs = parentStoreId.length > 1 && parentStoreId.endsWith('s')
    ? parentStoreId.slice(0, -1)
    : parentStoreId;
  return {
    fkField: `${ embedAs }Id`,
    embedAs,
    invalidResponse: `invalid-${ embedAs }`
  };
};

/** Last path segment only; strips slashes and invalid chars. */
export const normalizeRelationsChildSegment = (raw: string): string => {
  const trimmed = raw.trim().replace(/^\/+|\/+$/g, '');
  const last = trimmed.split('/').filter((segment) => segment.length > 0).pop() ?? '';
  const sanitized = last.replace(/[^A-Za-z0-9_-]/g, '');
  if (sanitized.length === 0) {
    throw new Error(
      'relations preset: child collection must be a non-empty segment (letters, numbers, "_", "-")'
    );
  }
  return sanitized;
};

export const relationsChildCollides = (
  parentEndpoint: string,
  childSegment: string
): boolean => {
  const child = normalizeRelationsChildSegment(childSegment);
  const { collection, storeId } = resolveCrudRoutes(parentEndpoint);
  const childCollection = siblingCollection(collection, child);
  return childCollection === collection || child === storeId;
};

/**
 * Two related stores (parent + child) with FK, embed, and expand-ready seeds.
 * @param childSegment sibling collection segment (default `posts`)
 */
export const structureRelationsMock = (
  endpoint: string,
  childSegment: string = DEFAULT_RELATIONS_CHILD_SEGMENT
): Record<string, unknown> => {
  const child = normalizeRelationsChildSegment(childSegment);
  const { collection: parentCollection, item: parentItem, storeId: parentStoreId } =
    resolveCrudRoutes(endpoint);
  const childCollection = siblingCollection(parentCollection, child);
  const childItem = `${ childCollection }/:id`;
  const childStoreId = child;
  const hasRelatedResponse = `has-${ childStoreId }`;
  const hasRelatedCode = `HAS_${ childStoreId.replace(/-/g, '_').toUpperCase() }`;
  const { fkField, embedAs, invalidResponse } = parentRelationNames(parentStoreId);
  const invalidCode = `INVALID_${ embedAs.replace(/-/g, '_').toUpperCase() }`;

  if (childCollection === parentCollection || childStoreId === parentStoreId) {
    throw new Error(
      `relations preset: parent "${ endpoint }" collides with child "${ child }". Choose a different child collection`
    );
  }

  return {
    [parentCollection]: {
      store: {
        id: parentStoreId,
        key: 'id',
        seed: [
          { id: 1, name: 'Ada' },
          { id: 2, name: 'Grace' }
        ],
        template: { id: 0, name: '' },
        relations: {
          [childStoreId]: {
            type: 'many',
            store: childStoreId,
            join: { from: fkField },
            embed: { as: childStoreId }
          }
        }
      },
      GET: actionMethod('list', 200, 'list'),
      POST: actionMethod('create', 201, 'create')
    },
    [parentItem]: {
      store: { id: parentStoreId },
      GET: actionMethod('get', 200, 'get'),
      DELETE: {
        nameResponse: 'remove',
        responses: [
          {
            name: hasRelatedResponse,
            statusCode: 409,
            body: {
              code: hasRelatedCode,
              errores: '{{conflicts}}'
            }
          },
          { name: 'remove', statusCode: 204, action: 'delete' }
        ]
      }
    },
    [childCollection]: {
      store: {
        id: childStoreId,
        key: 'id',
        seed: [
          { id: 1, title: 'Hello', [fkField]: 1 },
          { id: 2, title: 'World', [fkField]: 2 }
        ],
        template: { id: 0, title: '', [fkField]: 0 },
        relations: {
          [fkField]: {
            store: parentStoreId,
            required: true,
            onDelete: {
              action: 'restrict',
              conflict: {
                response: hasRelatedResponse,
                detail: {
                  code: hasRelatedCode,
                  field: '{{field}}',
                  value: '{{value}}'
                }
              }
            },
            embed: { as: embedAs },
            conflict: {
              response: invalidResponse,
              detail: {
                code: invalidCode,
                field: '{{field}}',
                value: '{{value}}'
              }
            }
          }
        }
      },
      GET: actionMethod('list', 200, 'list'),
      POST: {
        nameResponse: 'create',
        responses: [
          {
            name: invalidResponse,
            statusCode: 422,
            body: {
              code: invalidCode,
              errores: '{{conflicts}}'
            }
          },
          { name: 'create', statusCode: 201, action: 'create' }
        ]
      }
    },
    [childItem]: {
      store: { id: childStoreId },
      GET: actionMethod('get', 200, 'get'),
      DELETE: actionMethod('remove', 204, 'delete')
    }
  };
};
