'use strict';

const { runHttpUseCase } = require('../../lib/execute-mock-file');
const { request, expectStatus, expectEqual } = require('../../lib/http-assert');

module.exports = {
  name: 'runtime/name-response-fallback',
  description: 'HTTP: nameResponse AnimalsError is returned when no match is defined',
  run: () => runHttpUseCase({
    name: 'runtime/name-response-fallback',
    description: 'HTTP: nameResponse AnimalsError is returned when no match is defined',
    mockRelativePath: 'mocks/01-basic-multiple-responses.json',
    async assert({ baseUrl }) {
      const failures = [];

      const animals = await request(`${ baseUrl }/data/animals`);
      failures.push(...expectStatus(animals.status, 404, 'GET /data/animals uses nameResponse'));
      failures.push(...expectEqual(
        animals.body,
        { message: 'No animals found' },
        'AnimalsError body'
      ));

      const created = await request(`${ baseUrl }/data/animals`, { method: 'POST', json: {} });
      failures.push(...expectStatus(created.status, 404, 'POST /data/animals uses nameResponse'));
      failures.push(...expectEqual(
        created.body,
        { message: 'Could not save animal' },
        'POST AnimalsError body'
      ));

      return failures;
    }
  })
};
