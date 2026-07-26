'use strict';

const { runHttpUseCase } = require('../../lib/execute-mock-file');
const {
  request,
  expectStatus,
  expectEqual,
  expectHeader,
  expectMinDelay
} = require('../../lib/http-assert');

module.exports = {
  name: 'runtime/store-matrix',
  description: 'HTTP: store matrix for PUT/key/unique/match/headers/delay/404 mutators',
  run: () => runHttpUseCase({
    name: 'runtime/store-matrix',
    description: 'HTTP: store matrix for PUT/key/unique/match/headers/delay/404 mutators',
    mockRelativePath: 'mocks/27-store-matrix.json',
    timeoutMs: 25000,
    async assert({ baseUrl, getStdout }) {
      const failures = [];

      const acmeList = await request(`${ baseUrl }/api/acme/items`);
      failures.push(...expectStatus(acmeList.status, 200, 'acme list'));
      failures.push(...expectEqual(acmeList.body.length, 1, 'acme filtered by tenant'));
      failures.push(...expectEqual(acmeList.body[0]?.sku, 'SKU-1', 'acme sku'));

      const globexList = await request(`${ baseUrl }/api/globex/items`);
      failures.push(...expectStatus(globexList.status, 200, 'globex list'));
      failures.push(...expectEqual(globexList.body.length, 1, 'globex filtered'));
      failures.push(...expectEqual(globexList.body[0]?.name, 'Globex One', 'globex name'));

      const conflictStarted = Date.now();
      const keyConflict = await request(`${ baseUrl }/api/acme/items`, {
        method: 'POST',
        json: { id: 1, sku: 'SKU-NEW', name: 'Other' }
      });
      const conflictElapsed = Date.now() - conflictStarted;
      failures.push(...expectStatus(keyConflict.status, 409, 'duplicate key'));
      failures.push(...expectEqual(keyConflict.body.code, 'DUPLICATE_KEY', 'duplicate key code'));
      failures.push(...expectMinDelay(conflictElapsed, 150, 'delay before conflict'));
      if (conflictElapsed >= 350) {
        failures.push(`Conflict must not double-apply delay; got ${ conflictElapsed }ms`);
      }

      const skuConflict = await request(`${ baseUrl }/api/acme/items`, {
        method: 'POST',
        json: { sku: 'SKU-1', name: 'Unique Name' }
      });
      failures.push(...expectStatus(skuConflict.status, 409, 'single unique sku'));
      failures.push(...expectEqual(skuConflict.body.code, 'DUPLICATE_SKU', 'sku override response'));
      failures.push(...expectEqual(
        skuConflict.body.errors,
        [{
          field: 'sku',
          value: 'SKU-1',
          msg: 'Duplicate value for unique field "sku"'
        }],
        'sku conflict detail'
      ));

      const multiConflict = await request(`${ baseUrl }/api/acme/items`, {
        method: 'POST',
        json: { sku: 'SKU-1', name: 'Alpha' }
      });
      failures.push(...expectStatus(multiConflict.status, 409, 'multi unique'));
      failures.push(...expectEqual(multiConflict.body.code, 'DUPLICATE_FIELDS', 'multi uses shared response'));
      failures.push(...expectEqual(multiConflict.body.field, 'sku', 'first field placeholder'));
      failures.push(...expectEqual(multiConflict.body.value, 'SKU-1', 'first value placeholder'));
      failures.push(...expectEqual(multiConflict.body.errors?.length, 2, 'both unique conflicts'));

      const createStarted = Date.now();
      const created = await request(`${ baseUrl }/api/acme/items`, {
        method: 'POST',
        json: {
          tenantId: 'evil',
          sku: 'SKU-2',
          name: 'Beta'
        }
      });
      const createElapsed = Date.now() - createStarted;
      failures.push(...expectStatus(created.status, 201, 'create ok'));
      failures.push(...expectMinDelay(createElapsed, 150, 'delay before successful create'));
      failures.push(...expectHeader(
        created.headers,
        'x-store-action',
        'create',
        'create action header'
      ));
      failures.push(...expectEqual(created.body.sku, 'SKU-2', 'created sku'));
      failures.push(...expectEqual(created.body.tenantId, 'acme', 'params win over body tenantId'));
      failures.push(...expectEqual(created.body.active, true, 'template field'));
      failures.push(...expectEqual(created.body.ignored, undefined, 'action body ignored'));

      const gotCreated = await request(`${ baseUrl }/api/acme/items/${ created.body.id }`);
      failures.push(...expectStatus(gotCreated.status, 200, 'get created'));
      failures.push(...expectHeader(
        gotCreated.headers,
        'x-store-action',
        'get',
        'get action header'
      ));

      const updated = await request(`${ baseUrl }/api/acme/items/${ created.body.id }`, {
        method: 'PUT',
        json: { sku: 'SKU-2B', name: 'Beta Updated', active: false }
      });
      failures.push(...expectStatus(updated.status, 200, 'put update'));
      failures.push(...expectEqual(updated.body.name, 'Beta Updated', 'put name'));
      failures.push(...expectEqual(updated.body.active, false, 'put active'));
      failures.push(...expectEqual(updated.body.id, created.body.id, 'put keeps id'));
      failures.push(...expectEqual(updated.body.tenantId, 'acme', 'put keeps tenant'));

      const patched = await request(`${ baseUrl }/api/acme/items/${ created.body.id }`, {
        method: 'PATCH',
        json: { active: true }
      });
      failures.push(...expectStatus(patched.status, 200, 'patch'));
      failures.push(...expectEqual(patched.body.active, true, 'patch active'));
      failures.push(...expectEqual(patched.body.name, 'Beta Updated', 'patch keeps name'));

      const putSkuConflict = await request(`${ baseUrl }/api/acme/items/${ created.body.id }`, {
        method: 'PUT',
        json: { sku: 'SKU-1', name: 'Clash', active: true }
      });
      failures.push(...expectStatus(putSkuConflict.status, 409, 'put unique conflict'));

      const putMissing = await request(`${ baseUrl }/api/acme/items/999`, {
        method: 'PUT',
        json: { sku: 'SKU-X', name: 'Missing', active: true }
      });
      failures.push(...expectStatus(putMissing.status, 404, 'put missing'));
      failures.push(...expectEqual(putMissing.body, { message: 'Not found' }, 'put missing body'));

      const patchMissing = await request(`${ baseUrl }/api/acme/items/999`, {
        method: 'PATCH',
        json: { active: false }
      });
      failures.push(...expectStatus(patchMissing.status, 404, 'patch missing'));
      failures.push(...expectEqual(patchMissing.body, { message: 'Not found' }, 'patch missing body'));

      const deleteMissing = await request(`${ baseUrl }/api/acme/items/999`, {
        method: 'DELETE'
      });
      failures.push(...expectStatus(deleteMissing.status, 404, 'delete missing'));
      failures.push(...expectEqual(deleteMissing.body, { message: 'Not found' }, 'delete missing body'));

      const badBody = await request(`${ baseUrl }/api/tags`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '"not-an-object"'
      });
      failures.push(...expectStatus(badBody.status, 400, 'non-object body'));
      failures.push(...expectEqual(
        badBody.body,
        { message: 'Request body must be a JSON object' },
        'bad body message'
      ));

      const tag = await request(`${ baseUrl }/api/tags`, {
        method: 'POST',
        json: { label: 'hot' }
      });
      failures.push(...expectStatus(tag.status, 201, 'tag create'));

      const defaultConflict = await request(`${ baseUrl }/api/tags`, {
        method: 'POST',
        json: { label: 'hot' }
      });
      failures.push(...expectStatus(defaultConflict.status, 409, 'default unique conflict'));
      failures.push(...expectEqual(
        defaultConflict.body,
        {
          message: 'Duplicate value(s)',
          conflicts: [{
            field: 'label',
            value: 'hot',
            message: 'Duplicate value for unique field "label"'
          }]
        },
        'default conflict body'
      ));

      const staticMatch = await request(`${ baseUrl }/api/tags?mode=static`);
      failures.push(...expectStatus(staticMatch.status, 200, 'static match with store'));
      failures.push(...expectEqual(
        staticMatch.body,
        { frozen: true, source: 'static-match' },
        'match selects static body over action list'
      ));

      const tagsListed = await request(`${ baseUrl }/api/tags`);
      failures.push(...expectStatus(tagsListed.status, 200, 'tags list action'));
      failures.push(...expectEqual(tagsListed.body.length, 1, 'tags list size'));
      failures.push(...expectEqual(tagsListed.body[0]?.label, 'hot', 'tags list value'));

      const missing = await request(`${ baseUrl }/api/acme/items/999`);
      failures.push(...expectStatus(missing.status, 404, 'get missing'));
      failures.push(...expectEqual(missing.body, { message: 'Not found' }, 'not found body'));

      const removed = await request(`${ baseUrl }/api/acme/items/${ created.body.id }`, {
        method: 'DELETE'
      });
      failures.push(...expectStatus(removed.status, 204, 'delete'));

      const gone = await request(`${ baseUrl }/api/acme/items/${ created.body.id }`);
      failures.push(...expectStatus(gone.status, 404, 'get after delete'));

      const stdout = getStdout();
      if (!stdout.includes('The "body" property is ignored when "action" is set')) {
        failures.push('Expected warning for body ignored when action is set');
      }
      if (!stdout.includes(
        'The "statusCode" is ignored for action "delete" (always responds with 204)'
      )) {
        failures.push('Expected warning for delete statusCode ignored');
      }

      return failures;
    }
  })
};
