'use strict';

const { runHttpUseCase } = require('../../lib/execute-mock-file');
const { request, expectStatus, expectEqual } = require('../../lib/http-assert');

module.exports = {
  name: 'runtime/store-relations',
  description: 'HTTP: relations FK, expand one/many/nested, composite key, onDelete',
  run: () => runHttpUseCase({
    name: 'runtime/store-relations',
    description: 'HTTP: relations FK, expand one/many/nested, composite key, onDelete',
    mockRelativePath: 'mocks/38-store-relations.json',
    timeoutMs: 20000,
    async assert({ baseUrl }) {
      const failures = [];

      const listed = await request(`${ baseUrl }/api/posts`);
      failures.push(...expectStatus(listed.status, 200, 'initial posts list'));
      failures.push(...expectEqual(listed.body.length, 2, 'seed posts'));
      failures.push(...expectEqual(listed.body[0].user, undefined, 'no expand by default'));

      const expanded = await request(`${ baseUrl }/api/posts/1?expand=user`);
      failures.push(...expectStatus(expanded.status, 200, 'expand by embedAs'));
      failures.push(...expectEqual(expanded.body.userId, 1, 'fk kept'));
      failures.push(...expectEqual(expanded.body.user?.name, 'Ada', 'embedded user'));

      const expandField = await request(`${ baseUrl }/api/posts/1?expand=userId`);
      failures.push(...expectStatus(expandField.status, 200, 'expand by localField'));
      failures.push(...expectEqual(expandField.body.user?.id, 1, 'embed via localField'));

      const expandList = await request(`${ baseUrl }/api/posts?expand=user`);
      failures.push(...expectStatus(expandList.status, 200, 'list expand'));
      failures.push(...expectEqual(expandList.body[0].user?.name !== undefined, true, 'list embeds'));

      const manyExpand = await request(`${ baseUrl }/api/users/1?expand=posts`);
      failures.push(...expectStatus(manyExpand.status, 200, 'many expand'));
      failures.push(...expectEqual(Array.isArray(manyExpand.body.posts), true, 'many is array'));
      failures.push(...expectEqual(manyExpand.body.posts.length, 1, 'user 1 posts'));
      failures.push(...expectEqual(manyExpand.body.posts[0].title, 'Hello', 'many child title'));

      const nestedExpand = await request(`${ baseUrl }/api/users/1?expand=posts.user`);
      failures.push(...expectStatus(nestedExpand.status, 200, 'nested expand'));
      failures.push(...expectEqual(nestedExpand.body.posts?.[0]?.user?.name, 'Ada', 'nested user embed'));

      const compositeExpand = await request(
        `${ baseUrl }/api/acme/order-items/1?expand=order`
      );
      failures.push(...expectStatus(compositeExpand.status, 200, 'composite expand'));
      failures.push(...expectEqual(compositeExpand.body.order?.total, 10, 'composite target embed'));

      const compositeMany = await request(
        `${ baseUrl }/api/acme/orders/1?expand=items`
      );
      failures.push(...expectStatus(compositeMany.status, 200, 'composite many expand'));
      failures.push(...expectEqual(compositeMany.body.items?.length, 2, 'order items many'));

      const badCompositeFk = await request(`${ baseUrl }/api/acme/order-items`, {
        method: 'POST',
        json: { tenantId: 'acme', orderId: 999, sku: 'Z' }
      });
      failures.push(...expectStatus(badCompositeFk.status, 409, 'composite invalid FK default'));

      const cascadeOrder = await request(`${ baseUrl }/api/acme/orders/2`, { method: 'DELETE' });
      failures.push(...expectStatus(cascadeOrder.status, 204, 'delete order without items'));

      const shorthandExpand = await request(`${ baseUrl }/api/shorthand?expand=userId`);
      failures.push(...expectStatus(shorthandExpand.status, 200, 'shorthand expand'));
      failures.push(...expectEqual(
        shorthandExpand.body[0]['userId$']?.name,
        'Ada',
        'default embed key userId$'
      ));

      const badFk = await request(`${ baseUrl }/api/posts`, {
        method: 'POST',
        json: { title: 'Nope', userId: 999 }
      });
      failures.push(...expectStatus(badFk.status, 422, 'invalid FK custom status'));
      failures.push(...expectEqual(badFk.body.code, 'INVALID_USER', 'invalid FK body'));

      const missingRequired = await request(`${ baseUrl }/api/posts`, {
        method: 'POST',
        json: { title: 'No user' }
      });
      failures.push(...expectStatus(missingRequired.status, 422, 'missing required FK'));

      const tagOnRestricted = await request(`${ baseUrl }/api/tags`, {
        method: 'POST',
        json: { label: 'grace-tag', userId: 2 }
      });
      failures.push(...expectStatus(tagOnRestricted.status, 201, 'tag on user with posts'));

      const softDeleteUser = await request(`${ baseUrl }/api/users/2`, { method: 'DELETE' });
      failures.push(...expectStatus(softDeleteUser.status, 409, 'restrict blocks delete with posts'));
      failures.push(...expectEqual(softDeleteUser.body.code, 'HAS_POSTS', 'restrict custom body'));

      const tagsAfterRestrict = await request(`${ baseUrl }/api/tags`);
      failures.push(...expectStatus(tagsAfterRestrict.status, 200, 'tags after failed restrict'));
      const graceTag = tagsAfterRestrict.body.find((item) => item.label === 'grace-tag');
      failures.push(...expectEqual(
        graceTag?.userId,
        2,
        'setNull not applied when restrict blocks delete'
      ));

      const deleteSolo = await request(`${ baseUrl }/api/users/3`, { method: 'DELETE' });
      failures.push(...expectStatus(deleteSolo.status, 204, 'setNull parent delete'));

      const tagsAfter = await request(`${ baseUrl }/api/tags`);
      failures.push(...expectStatus(tagsAfter.status, 200, 'tags after setNull'));
      const soloTag = tagsAfter.body.find((item) => item.id === 1);
      failures.push(...expectEqual(soloTag?.userId, null, 'setNull cleared FK'));

      const ownerExpand = await request(`${ baseUrl }/api/tags/1?expand=owner`);
      failures.push(...expectEqual(ownerExpand.body.owner, null, 'null FK embeds null'));

      const cascadeDelete = await request(`${ baseUrl }/api/posts/1`, { method: 'DELETE' });
      failures.push(...expectStatus(cascadeDelete.status, 204, 'cascade parent soft delete'));

      const comments = await request(`${ baseUrl }/api/comments`);
      failures.push(...expectStatus(comments.status, 200, 'comments after cascade'));
      failures.push(...expectEqual(comments.body.length, 0, 'cascade hard-deleted children'));

      const likes = await request(`${ baseUrl }/api/likes`);
      failures.push(...expectStatus(likes.status, 200, 'likes after nested cascade'));
      failures.push(...expectEqual(likes.body.length, 0, 'nested cascade removed likes'));

      const postsLeft = await request(`${ baseUrl }/api/posts`);
      failures.push(...expectEqual(postsLeft.body.length, 1, 'one post left'));
      failures.push(...expectEqual(postsLeft.body[0].id, 2, 'remaining post'));

      const deleteUser2 = await request(`${ baseUrl }/api/users/2`, { method: 'DELETE' });
      failures.push(...expectStatus(deleteUser2.status, 409, 'still restricted by post 2'));

      const softDeletePost2 = await request(`${ baseUrl }/api/posts/2`, { method: 'DELETE' });
      failures.push(...expectStatus(softDeletePost2.status, 204, 'soft delete last post'));

      const deleteUser2Ok = await request(`${ baseUrl }/api/users/2`, { method: 'DELETE' });
      failures.push(...expectStatus(deleteUser2Ok.status, 204, 'delete after dependents soft-deleted'));

      const createAgainstDeleted = await request(`${ baseUrl }/api/posts`, {
        method: 'POST',
        json: { title: 'Ghost', userId: 2 }
      });
      failures.push(...expectStatus(createAgainstDeleted.status, 422, 'FK to soft-deleted user'));

      const restoreUser2 = await request(`${ baseUrl }/api/users/2`, { method: 'POST' });
      failures.push(...expectStatus(restoreUser2.status, 200, 'restore user'));

      const createOk = await request(`${ baseUrl }/api/posts`, {
        method: 'POST',
        json: { title: 'Back', userId: 2 }
      });
      failures.push(...expectStatus(createOk.status, 201, 'create after restore'));
      failures.push(...expectEqual(createOk.body.userId, 2, 'valid FK'));

      const patchBad = await request(`${ baseUrl }/api/posts/${ createOk.body.id }`, {
        method: 'PATCH',
        json: { userId: 999 }
      });
      failures.push(...expectStatus(patchBad.status, 422, 'patch invalid FK'));

      const cascadeOrderItems = await request(`${ baseUrl }/api/acme/orders/1`, {
        method: 'DELETE'
      });
      failures.push(...expectStatus(cascadeOrderItems.status, 204, 'cascade composite parent'));
      const itemsAfter = await request(`${ baseUrl }/api/acme/order-items`);
      failures.push(...expectEqual(itemsAfter.body.length, 0, 'composite cascade removed items'));

      const deleteLeaf = await request(`${ baseUrl }/api/categories/4`, { method: 'DELETE' });
      failures.push(...expectStatus(deleteLeaf.status, 204, 'self-ref leaf delete'));

      const deleteRoot = await request(`${ baseUrl }/api/categories/1`, { method: 'DELETE' });
      failures.push(...expectStatus(deleteRoot.status, 204, 'self-ref cascade root'));
      const categoriesAfter = await request(`${ baseUrl }/api/categories`);
      failures.push(...expectStatus(categoriesAfter.status, 200, 'categories after self-ref cascade'));
      failures.push(...expectEqual(categoriesAfter.body.length, 0, 'self-ref cascade removed tree'));

      return failures;
    }
  })
};
