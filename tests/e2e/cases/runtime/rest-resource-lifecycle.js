'use strict';

/**
 * Real-world REST resource lifecycle (JSON:API / RFC 7807 style).
 * Covers pagination filters, optimistic concurrency (409), gone (410),
 * field validation (422), and 204 delete — patterns called out by
 * Postman/MockFlow frontend status-code checklists.
 */

const { runHttpUseCase } = require('../../lib/execute-mock-file');
const {
  request,
  expectStatus,
  expectEqual,
  expectHeader
} = require('../../lib/http-assert');

module.exports = {
  name: 'runtime/rest-resource-lifecycle',
  description: 'HTTP: REST CRUD + controlled errors 404/409/410/422',
  run: () => runHttpUseCase({
    name: 'runtime/rest-resource-lifecycle',
    description: 'HTTP: REST CRUD + controlled errors 404/409/410/422',
    mockRelativePath: 'mocks/18-rest-resource-lifecycle.json',
    async assert({ baseUrl }) {
      const failures = [];

      const page1 = await request(`${ baseUrl }/api/v1/products?page=1&status=active`);
      failures.push(...expectStatus(page1.status, 200, 'list page-1-active'));
      failures.push(...expectHeader(page1.headers, 'x-total-count', '2', 'list total'));
      failures.push(...expectEqual(page1.body.total, 2, 'list total body'));
      failures.push(...expectEqual(page1.body.data.length, 2, 'list data length'));

      const empty = await request(`${ baseUrl }/api/v1/products`);
      failures.push(...expectStatus(empty.status, 200, 'list empty fallback'));
      failures.push(...expectEqual(empty.body.data, [], 'empty data'));

      const found = await request(`${ baseUrl }/api/v1/products/prod_1`);
      failures.push(...expectStatus(found.status, 200, 'GET prod_1'));
      failures.push(...expectHeader(found.headers, 'etag', 'W/"v3"', 'ETag'));
      failures.push(...expectEqual(found.body.id, 'prod_1', 'found id'));

      const gone = await request(`${ baseUrl }/api/v1/products/prod_gone`);
      failures.push(...expectStatus(gone.status, 410, 'GET gone'));
      failures.push(...expectEqual(gone.body.code, 'PRODUCT_GONE', 'gone code'));

      const missing = await request(`${ baseUrl }/api/v1/products/prod_missing`);
      failures.push(...expectStatus(missing.status, 404, 'GET not-found'));
      failures.push(...expectEqual(missing.body.code, 'PRODUCT_NOT_FOUND', 'not-found code'));

      const validation = await request(`${ baseUrl }/api/v1/products`, {
        method: 'POST',
        json: { name: '', price: -1 }
      });
      failures.push(...expectStatus(validation.status, 422, 'POST validation'));
      failures.push(...expectEqual(validation.body.status, 422, 'problem status'));
      failures.push(...expectEqual(
        validation.body.errors?.[0]?.field,
        'name',
        'validation field'
      ));

      const duplicate = await request(`${ baseUrl }/api/v1/products`, {
        method: 'POST',
        json: { name: 'Clone', sku: 'SKU-EXISTS' }
      });
      failures.push(...expectStatus(duplicate.status, 409, 'POST duplicate sku'));
      failures.push(...expectEqual(duplicate.body.code, 'DUPLICATE_SKU', 'duplicate code'));

      const created = await request(`${ baseUrl }/api/v1/products`, {
        method: 'POST',
        json: { name: 'New Product', sku: 'SKU-NEW' }
      });
      failures.push(...expectStatus(created.status, 201, 'POST created'));
      failures.push(...expectHeader(
        created.headers,
        'location',
        '/api/v1/products/prod_99',
        'Location'
      ));

      const conflict = await request(`${ baseUrl }/api/v1/products/prod_1`, {
        method: 'PATCH',
        json: { version: 2, name: 'Starter Plus' }
      });
      failures.push(...expectStatus(conflict.status, 409, 'PATCH version conflict'));
      failures.push(...expectEqual(conflict.body.code, 'VERSION_CONFLICT', 'conflict code'));
      failures.push(...expectEqual(conflict.body.currentVersion, 3, 'currentVersion'));

      const updated = await request(`${ baseUrl }/api/v1/products/prod_1`, {
        method: 'PATCH',
        json: { version: 3, name: 'Starter Plus' }
      });
      failures.push(...expectStatus(updated.status, 200, 'PATCH updated'));
      failures.push(...expectEqual(updated.body.version, 4, 'updated version'));

      const deleted = await request(`${ baseUrl }/api/v1/products/prod_1`, {
        method: 'DELETE'
      });
      failures.push(...expectStatus(deleted.status, 204, 'DELETE prod_1'));
      failures.push(...expectEqual(deleted.body, null, 'DELETE body'));

      const deleteMissing = await request(`${ baseUrl }/api/v1/products/prod_x`, {
        method: 'DELETE'
      });
      failures.push(...expectStatus(deleteMissing.status, 404, 'DELETE missing'));

      return failures;
    }
  })
};
