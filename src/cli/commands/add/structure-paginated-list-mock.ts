import { actionMethod, resolveCrudRoutes } from './structure-crud-mock';

/**
 * Collection-only store with list page/filter/search seed data.
 */
export const structurePaginatedListMock = (endpoint: string): Record<string, unknown> => {
  const { collection, storeId } = resolveCrudRoutes(endpoint);

  return {
    [collection]: {
      store: {
        id: storeId,
        key: 'id',
        seed: [
          { id: 1, title: 'Alpha', status: 'active' },
          { id: 2, title: 'Bravo', status: 'draft' },
          { id: 3, title: 'Charlie', status: 'active' },
          { id: 4, title: 'Delta', status: 'archived' },
          { id: 5, title: 'Echo', status: 'draft' }
        ],
        template: {
          id: 0,
          title: '',
          status: 'draft'
        },
        list: {
          page: { query: 'page', default: 1 },
          pageSize: {
            query: 'pageSize',
            default: 2,
            max: 50,
            aliases: ['limit']
          },
          sort: {
            query: 'sort',
            default: 'id',
            fields: ['id', 'title', 'status']
          },
          order: { query: 'order', default: 'asc' },
          filter: {
            fields: [
              'status',
              { field: 'status', op: 'ne', query: 'excludeStatus' }
            ],
            search: {
              query: 'q',
              fields: ['title']
            }
          }
        }
      },
      GET: {
        nameResponse: 'list',
        responses: [
          {
            name: 'list',
            statusCode: 200,
            action: 'list',
            headers: {
              'X-Total-Count': '{{total}}',
              Link: '{{linkHeader}}'
            },
            body: {
              data: '{{items}}',
              page: '{{page}}',
              pageSize: '{{pageSize}}',
              total: '{{total}}',
              totalPages: '{{totalPages}}',
              hasNext: '{{hasNext}}',
              hasPrevious: '{{hasPrevious}}'
            }
          }
        ]
      },
      POST: actionMethod('create', 201, 'create')
    }
  };
};
