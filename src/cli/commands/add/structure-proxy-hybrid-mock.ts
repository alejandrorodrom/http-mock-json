import { resolveCrudRoutes } from './structure-crud-mock';

const DEFAULT_PROXY_TARGET = 'https://jsonplaceholder.typicode.com';

/**
 * Local static route + sibling route that proxies upstream (teaches hybrid mock/proxy).
 */
export const structureProxyHybridMock = (endpoint: string): Record<string, unknown> => {
  const { collection: local } = resolveCrudRoutes(endpoint);
  const live = `${ local }/live`;

  return {
    [local]: {
      GET: {
        nameResponse: 'local',
        responses: [
          {
            name: 'local',
            statusCode: 200,
            body: {
              source: 'mock',
              note: 'This route is served locally'
            }
          },
          {
            name: 'error',
            statusCode: 404,
            body: { message: 'Not found' }
          }
        ]
      }
    },
    [live]: {
      GET: {
        nameResponse: 'live',
        responses: [
          {
            name: 'live',
            proxy: {
              target: DEFAULT_PROXY_TARGET,
              path: '/todos/1'
            }
          },
          {
            name: 'offline',
            statusCode: 503,
            body: {
              message: 'Upstream offline — set nameResponse to "offline" to use this response'
            }
          }
        ]
      }
    }
  };
};
