import { normalizeEndpoint } from './normalize-endpoint';

/**
 * Single GET with query `scenario` branches + delay (teaches match / multi-response).
 */
export const structureScenariosMock = (endpoint: string): Record<string, unknown> => {
  const route = normalizeEndpoint(endpoint);

  return {
    [route]: {
      GET: {
        nameResponse: 'fallback',
        delay: 100,
        responses: [
          {
            name: 'ok',
            statusCode: 200,
            match: { query: { scenario: 'ok' } },
            body: { ok: true, scenario: 'ok' }
          },
          {
            name: 'missing',
            statusCode: 404,
            delay: 50,
            match: { query: { scenario: 'missing' } },
            body: { message: 'Not found', code: 'NOT_FOUND' }
          },
          {
            name: 'error',
            statusCode: 500,
            delay: 300,
            match: { query: { scenario: 'error' } },
            body: { message: 'Upstream failed', code: 'UPSTREAM_ERROR' }
          },
          {
            name: 'fallback',
            statusCode: 200,
            body: {
              ok: true,
              note: 'Default when ?scenario is omitted or unmatched'
            }
          }
        ]
      }
    }
  };
};
