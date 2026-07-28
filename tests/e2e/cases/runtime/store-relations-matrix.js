'use strict';

const { runHttpUseCase } = require('../../lib/execute-mock-file');
const { request, expectStatus, expectEqual } = require('../../lib/http-assert');

module.exports = {
  name: 'runtime/store-relations-matrix',
  description: 'HTTP: relations combos — list/filter/expand, depth, soft-delete, unique, request, partial FK',
  run: () => runHttpUseCase({
    name: 'runtime/store-relations-matrix',
    description: 'HTTP: relations combos — list/filter/expand, depth, soft-delete, unique, request, partial FK',
    mockRelativePath: 'mocks/39-store-relations-matrix.json',
    timeoutMs: 25000,
    async assert({ baseUrl }) {
      const failures = [];

      // Expand depth: a.b.c.d.e → E must not be nested (max depth 3 hops from root)
      const deep = await request(`${ baseUrl }/api/nodes-a/1?expand=b.c.d.e`);
      failures.push(...expectStatus(deep.status, 200, 'expand-depth-capped'));
      failures.push(...expectEqual(deep.body.b?.name, 'B', 'depth1 b'));
      failures.push(...expectEqual(deep.body.b?.c?.name, 'C', 'depth2 c'));
      failures.push(...expectEqual(deep.body.b?.c?.d?.name, 'D', 'depth3 d'));
      failures.push(...expectEqual(deep.body.b?.c?.d?.e, undefined, 'depth4 e not nested'));
      failures.push(...expectEqual(deep.body.b?.c?.d?.eId, 1, 'fk kept at depth3'));

      // Unknown expand token is ignored (no crash, no extra keys)
      const unknownExpand = await request(`${ baseUrl }/api/articles-mx/1?expand=nope`);
      failures.push(...expectStatus(unknownExpand.status, 200, 'unknown expand ok'));
      failures.push(...expectEqual(unknownExpand.body.author, undefined, 'unknown expand no embed'));
      failures.push(...expectEqual(unknownExpand.body.nope, undefined, 'no phantom key'));

      // list + filter + expand
      const listed = await request(
        `${ baseUrl }/api/articles-mx?status=published&authorId=1&expand=author&pageSize=10`
      );
      failures.push(...expectStatus(listed.status, 200, 'list-filter-expand'));
      failures.push(...expectEqual(listed.body.length, 1, 'filtered published for author 1'));
      failures.push(...expectEqual(listed.body[0]?.author?.name, 'Ada', 'list embeds author'));
      failures.push(...expectEqual(listed.body[0]?.slug, 'hello', 'correct article'));

      // many expand + soft-deleted children omitted
      const softChild = await request(`${ baseUrl }/api/articles-mx/2`, { method: 'DELETE' });
      failures.push(...expectStatus(softChild.status, 204, 'soft delete draft article'));
      const manyExpand = await request(`${ baseUrl }/api/authors-mx/1?expand=articles`);
      failures.push(...expectStatus(manyExpand.status, 200, 'many expand after soft delete'));
      failures.push(...expectEqual(manyExpand.body.articles?.length, 1, 'soft-deleted child omitted'));
      failures.push(...expectEqual(manyExpand.body.articles?.[0]?.id, 1, 'active child only'));

      // includeDeleted expands soft-deleted one target
      const softAuthor = await request(`${ baseUrl }/api/authors-mx/2`, { method: 'DELETE' });
      // author 2 still has article 3 → restrict
      failures.push(...expectStatus(softAuthor.status, 409, 'restrict while article active'));
      failures.push(...expectEqual(softAuthor.body.code, 'HAS_ARTICLES', 'restrict body'));

      const softArticle3 = await request(`${ baseUrl }/api/articles-mx/3`, { method: 'DELETE' });
      failures.push(...expectStatus(softArticle3.status, 204, 'soft delete last grace article'));
      const softAuthorOk = await request(`${ baseUrl }/api/authors-mx/2`, { method: 'DELETE' });
      failures.push(...expectStatus(softAuthorOk.status, 204, 'soft delete author after dependents gone'));

      const expandDeleted = await request(
        `${ baseUrl }/api/articles-mx/3?expand=author&includeDeleted=true`
      );
      failures.push(...expectStatus(expandDeleted.status, 200, 'includeDeleted-expand'));
      failures.push(...expectEqual(expandDeleted.body.author?.name, 'Grace', 'soft-deleted author embedded'));

      const expandDeletedHidden = await request(`${ baseUrl }/api/articles-mx/3?expand=author`);
      failures.push(...expectStatus(expandDeletedHidden.status, 404, 'soft-deleted article hidden without flag'));

      // request validation runs before FK
      const badRequest = await request(`${ baseUrl }/api/articles-mx`, {
        method: 'POST',
        json: { title: '', slug: 'x', authorId: 1 }
      });
      failures.push(...expectStatus(badRequest.status, 422, 'request-before-fk'));
      failures.push(...expectEqual(badRequest.body.code, 'VALIDATION', 'validation body not FK'));

      // unique conflict with valid FK
      const dupSlug = await request(`${ baseUrl }/api/articles-mx`, {
        method: 'POST',
        json: { title: 'Again', slug: 'hello', authorId: 1 }
      });
      failures.push(...expectStatus(dupSlug.status, 409, 'UNIQUE_AND_FK'));
      failures.push(...expectEqual(dupSlug.body.code, 'DUPLICATE_SLUG', 'unique wins over FK path'));

      // invalid FK on create
      const badFk = await request(`${ baseUrl }/api/articles-mx`, {
        method: 'POST',
        json: { title: 'Ghost', slug: 'ghost', authorId: 999 }
      });
      failures.push(...expectStatus(badFk.status, 422, 'invalid FK create'));
      failures.push(...expectEqual(badFk.body.code, 'INVALID_AUTHOR', 'FK body'));

      // update / patch invalid FK
      const badUpdate = await request(`${ baseUrl }/api/articles-mx/1`, {
        method: 'PUT',
        json: {
          title: 'Hello',
          slug: 'hello',
          status: 'published',
          authorId: 999
        }
      });
      failures.push(...expectStatus(badUpdate.status, 422, 'update invalid FK'));

      const badPatch = await request(`${ baseUrl }/api/articles-mx/1`, {
        method: 'PATCH',
        json: { authorId: 999 }
      });
      failures.push(...expectStatus(badPatch.status, 422, 'patch invalid FK'));

      // composite: list filter + expand parent/children
      const orderExpand = await request(
        `${ baseUrl }/api/acme/matrix-orders?status=open&expand=items`
      );
      failures.push(...expectStatus(orderExpand.status, 200, 'orders list expand'));
      failures.push(...expectEqual(orderExpand.body.length, 1, 'open orders'));
      failures.push(...expectEqual(orderExpand.body[0]?.items?.length, 2, 'embedded items'));

      const itemExpand = await request(
        `${ baseUrl }/api/acme/matrix-items?orderId=1&expand=order`
      );
      failures.push(...expectStatus(itemExpand.status, 200, 'items list expand order'));
      failures.push(...expectEqual(itemExpand.body[0]?.order?.status, 'open', 'parent embed'));

      // partial composite FK via patch
      const partial = await request(`${ baseUrl }/api/acme/matrix-items/1`, {
        method: 'PATCH',
        json: { orderId: null }
      });
      failures.push(...expectStatus(partial.status, 422, 'INCOMPLETE_ORDER_REF'));
      failures.push(...expectEqual(partial.body.code, 'INVALID_ORDER', 'partial FK uses conflict'));

      // request blocks before FK on items
      const itemBadReq = await request(`${ baseUrl }/api/acme/matrix-items`, {
        method: 'POST',
        json: { orderId: 1, sku: '', qty: 1 }
      });
      failures.push(...expectStatus(itemBadReq.status, 422, 'item request before FK'));
      failures.push(...expectEqual(itemBadReq.body.code, 'VALIDATION', 'item validation'));

      // unique + valid FK
      const dupSku = await request(`${ baseUrl }/api/acme/matrix-items`, {
        method: 'POST',
        json: { orderId: 1, sku: 'TEA', qty: 9 }
      });
      failures.push(...expectStatus(dupSku.status, 409, 'item unique conflict'));
      failures.push(...expectEqual(dupSku.body.code, 'DUPLICATE_SKU', 'sku unique'));

      // cascade still works with list/persist stores
      const cascade = await request(`${ baseUrl }/api/acme/matrix-orders/1`, {
        method: 'DELETE'
      });
      failures.push(...expectStatus(cascade.status, 204, 'cascade delete order'));
      const itemsLeft = await request(`${ baseUrl }/api/acme/matrix-items?orderId=1`);
      failures.push(...expectEqual(itemsLeft.body.length, 0, 'cascade cleared items'));

      return failures;
    }
  })
};
