import { normalizeEndpoint } from './normalize-endpoint';

/**
 * POST login with request validation + match success / forbidden + 401 fallback.
 */
export const structureAuthLoginMock = (endpoint: string): Record<string, unknown> => {
  const route = normalizeEndpoint(endpoint);

  return {
    [route]: {
      POST: {
        nameResponse: 'unauthorized',
        request: {
          payload: {
            email: { type: 'string', format: 'email' },
            password: { type: 'string', minLength: 6 }
          },
          error: { response: 'invalid' }
        },
        responses: [
          {
            name: 'success',
            statusCode: 200,
            match: {
              body: {
                email: 'user@example.com',
                password: 'password123'
              }
            },
            body: {
              token: 'tok_demo',
              user: {
                id: 1,
                email: 'user@example.com',
                name: 'Test User'
              }
            }
          },
          {
            name: 'forbidden',
            statusCode: 403,
            match: {
              body: {
                email: 'blocked@example.com',
                password: 'password123'
              }
            },
            body: {
              message: 'Account blocked',
              code: 'FORBIDDEN'
            }
          },
          {
            name: 'unauthorized',
            statusCode: 401,
            body: {
              message: 'Invalid email or password',
              code: 'INVALID_CREDENTIALS'
            }
          },
          {
            name: 'invalid',
            statusCode: 400,
            body: {
              message: 'Validation failed'
            }
          }
        ]
      }
    }
  };
};
