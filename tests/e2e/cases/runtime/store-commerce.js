'use strict';

const { runHttpUseCase } = require('../../lib/execute-mock-file');
const { request, expectStatus, expectEqual, expectHeader } = require('../../lib/http-assert');

module.exports = {
  name: 'runtime/store-commerce',
  description: 'HTTP: commerce catalog combines store.list, request, match, delay, unique',
  run: () => runHttpUseCase({
    name: 'runtime/store-commerce',
    description: 'HTTP: commerce catalog combines store.list, request, match, delay, unique',
    mockRelativePath: 'mocks/32-store-commerce.json',
    timeoutMs: 30000,
    async assert({ baseUrl }) {
      const failures = [];
      const catalog = `${ baseUrl }/api/catalog/products`;

      const page1 = await request(catalog);
      failures.push(...expectStatus(page1.status, 200, 'catalog page1'));
      failures.push(...expectHeader(page1.headers, 'x-total-count', '6', 'catalog total'));
      failures.push(...expectHeader(page1.headers, 'x-catalog', 'store', 'catalog source'));
      failures.push(...expectEqual(page1.body.pageSize, 3, 'default pageSize'));
      failures.push(...expectEqual(page1.body.total, 6, 'catalog total body'));
      failures.push(...expectEqual(page1.body.data.length, 3, 'page1 length'));
      failures.push(...expectEqual(page1.body.hasNext, true, 'page1 hasNext'));

      const filtered = await request(`${ catalog }?status=active&category=home&pageSize=10`);
      failures.push(...expectStatus(filtered.status, 200, 'filter status+category'));
      failures.push(...expectEqual(filtered.body.total, 3, 'home active total'));
      failures.push(...expectEqual(
        filtered.body.data.map(item => item.sku).sort(),
        ['SKU-BAG-003', 'SKU-CUP-005', 'SKU-MUG-010'],
        'home active skus'
      ));

      const searched = await request(`${ catalog }?q=tea&pageSize=10`);
      failures.push(...expectStatus(searched.status, 200, 'search tea'));
      failures.push(...expectEqual(searched.body.total, 2, 'tea search total'));

      const priced = await request(
        `${ catalog }?minPrice=12&maxPrice=22&excludeStatus=draft&pageSize=10`
      );
      failures.push(...expectStatus(priced.status, 200, 'price range + ne'));
      failures.push(...expectEqual(
        priced.body.data.map(item => item.sku).sort(),
        ['SKU-BAG-003', 'SKU-MUG-010', 'SKU-TEA-001'],
        'priced skus'
      ));

      const inStock = await request(`${ catalog }?minStock=0&categories=home,grocery&pageSize=10`);
      failures.push(...expectStatus(inStock.status, 200, 'gt stock + in category'));
      failures.push(...expectEqual(
        inStock.body.data.map(item => item.sku).sort(),
        ['SKU-BAG-003', 'SKU-CUP-005', 'SKU-HNY-004', 'SKU-MUG-010'],
        'in-stock categories'
      ));

      const warehouse = await request(`${ catalog }?warehouse=WH-EU&status=active&pageSize=10`);
      failures.push(...expectStatus(warehouse.status, 200, 'nested warehouse'));
      failures.push(...expectEqual(
        warehouse.body.data.map(item => item.sku).sort(),
        ['SKU-CUP-005', 'SKU-TEA-001'],
        'eu active skus'
      ));

      const orWarehouse = await request(
        `${ catalog }?anyWarehouse=WH-LATAM&anyCategory=grocery&pageSize=10`
      );
      failures.push(...expectStatus(orWarehouse.status, 200, 'or warehouse/category'));
      failures.push(...expectEqual(
        orWarehouse.body.data.map(item => item.sku).sort(),
        ['SKU-BAG-003', 'SKU-HNY-004'],
        'or skus'
      ));

      const multiSort = await request(`${ catalog }?sort=price:desc,name:asc&pageSize=10`);
      failures.push(...expectStatus(multiSort.status, 200, 'multi-sort'));
      failures.push(...expectEqual(multiSort.body.data[0]?.sku, 'SKU-CUP-005', 'highest price first'));

      const featured = await request(`${ catalog }?view=featured`);
      failures.push(...expectStatus(featured.status, 200, 'featured match'));
      failures.push(...expectHeader(featured.headers, 'x-view', 'featured', 'featured header'));
      failures.push(...expectEqual(featured.body.view, 'featured', 'featured body'));

      const maintenance = await request(`${ catalog }?mode=maintenance`);
      failures.push(...expectStatus(maintenance.status, 503, 'maintenance match'));
      failures.push(...expectHeader(maintenance.headers, 'retry-after', '30', 'retry after'));
      failures.push(...expectEqual(maintenance.body.code, 'CATALOG_MAINTENANCE', 'maintenance code'));

      const invalidCreate = await request(catalog, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sku: 'bad', name: 'X', category: 'home', price: 1 })
      });
      failures.push(...expectStatus(invalidCreate.status, 422, 'create validation'));

      const created = await request(catalog, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sku: 'SKU-NEW-099',
          name: 'Matcha Kit',
          category: 'beverages',
          price: 15,
          stock: 4,
          status: 'active'
        })
      });
      failures.push(...expectStatus(created.status, 201, 'create product'));
      failures.push(...expectEqual(created.body.sku, 'SKU-NEW-099', 'created sku'));
      const createdId = created.body.id;

      const duplicateSku = await request(catalog, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sku: 'SKU-TEA-001',
          name: 'Clone Tea',
          category: 'beverages',
          price: 10
        })
      });
      failures.push(...expectStatus(duplicateSku.status, 409, 'sku conflict'));
      failures.push(...expectEqual(duplicateSku.body.code, 'SKU_TAKEN', 'sku taken code'));

      const archivedPatch = await request(`${ catalog }/${ createdId }`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'archived' })
      });
      failures.push(...expectStatus(archivedPatch.status, 409, 'archive via match'));
      failures.push(...expectEqual(
        archivedPatch.body.code,
        'USE_ARCHIVE_ENDPOINT',
        'archive static code'
      ));

      const stockPatch = await request(`${ catalog }/${ createdId }`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stock: 9 })
      });
      failures.push(...expectStatus(stockPatch.status, 200, 'stock patch'));
      failures.push(...expectEqual(stockPatch.body.stock, 9, 'patched stock'));

      const checkoutBad = await request(`${ baseUrl }/api/catalog/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sku: 'SKU-TEA-001', quantity: 1, cardLast4: '12' })
      });
      failures.push(...expectStatus(checkoutBad.status, 422, 'checkout validation'));

      const checkout402 = await request(`${ baseUrl }/api/catalog/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sku: 'SKU-TEA-001', quantity: 1, cardLast4: '0000' })
      });
      failures.push(...expectStatus(checkout402.status, 402, 'checkout declined'));

      const checkoutOk = await request(`${ baseUrl }/api/catalog/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sku: 'SKU-TEA-001', quantity: 1, cardLast4: '4242' })
      });
      failures.push(...expectStatus(checkoutOk.status, 201, 'checkout paid'));
      failures.push(...expectEqual(checkoutOk.body.status, 'paid', 'paid status'));

      return failures;
    }
  })
};
