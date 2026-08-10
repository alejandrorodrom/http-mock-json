import { resolveCrudRoutes } from './structure-crud-mock';

/**
 * Multipart upload + base64 download (no external asset file required).
 */
export const structureUploadMock = (endpoint: string): Record<string, unknown> => {
  const { collection, item } = resolveCrudRoutes(endpoint);
  const downloadPath = item.replace(/:[^/]+$/, 'file_1');

  return {
    [collection]: {
      POST: {
        nameResponse: 'created',
        request: {
          as: 'multipart',
          payload: {
            title: { type: 'string', minLength: 1 },
            file: {
              type: 'file',
              maxSize: 1048576,
              requireFilename: true
            }
          },
          error: { response: 'invalid' }
        },
        responses: [
          {
            name: 'created',
            statusCode: 201,
            body: {
              id: 'file_1',
              title: 'uploaded',
              downloadUrl: `/${ downloadPath }`
            }
          },
          {
            name: 'invalid',
            statusCode: 400,
            body: { message: 'Invalid upload' }
          }
        ]
      }
    },
    [item]: {
      GET: {
        nameResponse: 'download',
        responses: [
          {
            name: 'download',
            statusCode: 200,
            headers: {
              'Content-Type': 'text/plain; charset=utf-8',
              'Content-Disposition': 'attachment; filename="demo.txt"'
            },
            encoding: 'base64',
            body: 'aGVsbG8gdXBsb2Fk'
          },
          {
            name: 'missing',
            statusCode: 404,
            body: { message: 'File not found' }
          }
        ]
      }
    }
  };
};
