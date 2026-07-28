'use strict';

const { runHttpUseCase } = require('../../lib/execute-mock-file');
const { request, expectStatus, expectEqual } = require('../../lib/http-assert');

module.exports = {
  name: 'runtime/store-mutable',
  description: 'HTTP: in-memory store CRUD, unique conflicts and shared store id',
  run: () => runHttpUseCase({
    name: 'runtime/store-mutable',
    description: 'HTTP: in-memory store CRUD, unique conflicts and shared store id',
    mockRelativePath: 'mocks/25-store.json',
    timeoutMs: 20000,
    async assert({ baseUrl }) {
      const failures = [];

      const listed = await request(`${ baseUrl }/api/acme/users`);
      failures.push(...expectStatus(listed.status, 200, 'list seed'));
      failures.push(...expectEqual(listed.body.length, 1, 'seed size'));

      const invalid = await request(`${ baseUrl }/api/acme/users`, {
        method: 'POST',
        json: { name: 'A', email: 'bad', username: 'ab' }
      });
      failures.push(...expectStatus(invalid.status, 400, 'request validation'));

      const duplicate = await request(`${ baseUrl }/api/acme/users`, {
        method: 'POST',
        json: {
          name: 'Otro',
          email: 'juan@acme.com',
          username: 'juan'
        }
      });
      failures.push(...expectStatus(duplicate.status, 409, 'unique conflict'));
      failures.push(...expectEqual(duplicate.body.ok, false, 'conflict ok'));
      failures.push(...expectEqual(duplicate.body.code, 'DUPLICATE', 'conflict code'));
      failures.push(...expectEqual(
        duplicate.body.errores,
        [
          { campo: 'email', valor: 'juan@acme.com' },
          { campo: 'username', valor: 'juan' }
        ],
        'conflict details'
      ));

      const created = await request(`${ baseUrl }/api/acme/users`, {
        method: 'POST',
        json: {
          name: 'Ana',
          email: 'ana@acme.com',
          username: 'ana'
        }
      });
      failures.push(...expectStatus(created.status, 201, 'create'));
      failures.push(...expectEqual(created.body.email, 'ana@acme.com', 'created email'));
      failures.push(...expectEqual(created.body.tenantId, 'acme', 'created tenant'));
      failures.push(...expectEqual(created.body.active, true, 'template active'));
      failures.push(...expectEqual(typeof created.body.id, 'number', 'generated id'));

      const listedAfter = await request(`${ baseUrl }/api/acme/users`);
      failures.push(...expectStatus(listedAfter.status, 200, 'list after create'));
      failures.push(...expectEqual(listedAfter.body.length, 2, 'list size after create'));

      const got = await request(`${ baseUrl }/api/acme/users/${ created.body.id }`);
      failures.push(...expectStatus(got.status, 200, 'get created'));
      failures.push(...expectEqual(got.body.username, 'ana', 'get username'));

      const patched = await request(`${ baseUrl }/api/acme/users/${ created.body.id }`, {
        method: 'PATCH',
        json: { active: false }
      });
      failures.push(...expectStatus(patched.status, 200, 'patch'));
      failures.push(...expectEqual(patched.body.active, false, 'patched active'));
      failures.push(...expectEqual(patched.body.email, 'ana@acme.com', 'patch keeps email'));

      const removed = await request(`${ baseUrl }/api/acme/users/${ created.body.id }`, {
        method: 'DELETE'
      });
      failures.push(...expectStatus(removed.status, 204, 'delete'));

      const missing = await request(`${ baseUrl }/api/acme/users/${ created.body.id }`);
      failures.push(...expectStatus(missing.status, 404, 'get after delete'));
      failures.push(...expectEqual(missing.body, {
        code: 'USER_NOT_FOUND',
        message: `User ${ created.body.id } was not found in tenant acme`,
        key: `acme+${ created.body.id }`
      }, 'custom notFound body'));

      const patchMissing = await request(`${ baseUrl }/api/acme/users/999`, {
        method: 'PATCH',
        json: { active: true }
      });
      failures.push(...expectStatus(patchMissing.status, 404, 'patch missing'));
      failures.push(...expectEqual(patchMissing.body.code, 'USER_NOT_FOUND', 'patch notFound code'));
      failures.push(...expectEqual(patchMissing.body.key, 'acme+999', 'patch notFound key'));

      const notesEmpty = await request(`${ baseUrl }/api/notes`);
      failures.push(...expectStatus(notesEmpty.status, 200, 'notes empty list'));
      failures.push(...expectEqual(notesEmpty.body, [], 'notes seed empty'));

      const note = await request(`${ baseUrl }/api/notes`, {
        method: 'POST',
        json: { title: 'Primera' }
      });
      failures.push(...expectStatus(note.status, 201, 'notes create'));
      failures.push(...expectEqual(note.body.title, 'Primera', 'note title'));
      failures.push(...expectEqual(note.body.done, false, 'note template'));

      const noteDup = await request(`${ baseUrl }/api/notes`, {
        method: 'POST',
        json: { title: 'Primera' }
      });
      failures.push(...expectStatus(noteDup.status, 409, 'notes unique default'));

      const noteMissing = await request(`${ baseUrl }/api/notes/999`);
      failures.push(...expectStatus(noteMissing.status, 404, 'notes default notFound'));
      failures.push(...expectEqual(
        noteMissing.body,
        { message: 'Not found' },
        'notes default notFound body'
      ));

      return failures;
    }
  })
};
