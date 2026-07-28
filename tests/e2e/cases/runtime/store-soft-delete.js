'use strict';

const { runHttpUseCase } = require('../../lib/execute-mock-file');
const { request, expectStatus, expectEqual } = require('../../lib/http-assert');

module.exports = {
  name: 'runtime/store-soft-delete',
  description: 'HTTP: soft delete matrix (includeDeleted, restore, unique/key, list, custom field)',
  run: () => runHttpUseCase({
    name: 'runtime/store-soft-delete',
    description: 'HTTP: soft delete matrix (includeDeleted, restore, unique/key, list, custom field)',
    mockRelativePath: 'mocks/37-store-soft-delete.json',
    timeoutMs: 20000,
    async assert({ baseUrl, stdout }) {
      const failures = [];

      const listed = await request(`${ baseUrl }/api/notes`);
      failures.push(...expectStatus(listed.status, 200, 'initial list'));
      failures.push(...expectEqual(listed.body.length, 2, 'seed size'));

      const removed = await request(`${ baseUrl }/api/notes/2`, { method: 'DELETE' });
      failures.push(...expectStatus(removed.status, 204, 'soft delete'));

      const missing = await request(`${ baseUrl }/api/notes/2`);
      failures.push(...expectStatus(missing.status, 404, 'get soft-deleted'));

      const listedAfter = await request(`${ baseUrl }/api/notes`);
      failures.push(...expectStatus(listedAfter.status, 200, 'list after soft delete'));
      failures.push(...expectEqual(listedAfter.body.length, 1, 'hidden soft-deleted'));
      failures.push(...expectEqual(listedAfter.body[0].id, 1, 'remaining item'));

      const included = await request(`${ baseUrl }/api/notes?includeDeleted=true`);
      failures.push(...expectStatus(included.status, 200, 'includeDeleted=true list'));
      failures.push(...expectEqual(included.body.length, 2, 'includeDeleted=true size'));

      const includedOne = await request(`${ baseUrl }/api/notes?includeDeleted=1`);
      failures.push(...expectStatus(includedOne.status, 200, 'includeDeleted=1 list'));
      failures.push(...expectEqual(includedOne.body.length, 2, 'includeDeleted=1 size'));

      const ignoredYes = await request(`${ baseUrl }/api/notes?includeDeleted=yes`);
      failures.push(...expectStatus(ignoredYes.status, 200, 'includeDeleted=yes ignored'));
      failures.push(...expectEqual(ignoredYes.body.length, 1, 'yes does not include deleted'));

      const ignoredFalse = await request(`${ baseUrl }/api/notes?includeDeleted=false`);
      failures.push(...expectStatus(ignoredFalse.status, 200, 'includeDeleted=false ignored'));
      failures.push(...expectEqual(ignoredFalse.body.length, 1, 'false does not include deleted'));

      const includedGet = await request(`${ baseUrl }/api/notes/2?includeDeleted=true`);
      failures.push(...expectStatus(includedGet.status, 200, 'includeDeleted get'));
      failures.push(...expectEqual(typeof includedGet.body.deletedAt, 'string', 'deletedAt set'));

      const patchGone = await request(`${ baseUrl }/api/notes/2`, {
        method: 'PATCH',
        json: { done: true }
      });
      failures.push(...expectStatus(patchGone.status, 404, 'patch soft-deleted'));

      const putGone = await request(`${ baseUrl }/api/notes/2`, {
        method: 'PUT',
        json: { title: 'Nope', done: true }
      });
      failures.push(...expectStatus(putGone.status, 404, 'update soft-deleted'));

      const restoreActive = await request(`${ baseUrl }/api/notes/1`, { method: 'POST' });
      failures.push(...expectStatus(restoreActive.status, 404, 'restore active item'));

      const restoreMissing = await request(`${ baseUrl }/api/notes/999`, { method: 'POST' });
      failures.push(...expectStatus(restoreMissing.status, 404, 'restore missing item'));

      const reuseTitle = await request(`${ baseUrl }/api/notes`, {
        method: 'POST',
        json: { title: 'Trash me' }
      });
      failures.push(...expectStatus(reuseTitle.status, 201, 'unique freed after soft delete'));
      failures.push(...expectEqual(reuseTitle.body.title, 'Trash me', 'reused title'));

      const restored = await request(`${ baseUrl }/api/notes/2`, { method: 'POST' });
      failures.push(...expectStatus(restored.status, 409, 'restore unique conflict'));

      const deleteReuse = await request(`${ baseUrl }/api/notes/${ reuseTitle.body.id }`, {
        method: 'DELETE'
      });
      failures.push(...expectStatus(deleteReuse.status, 204, 'soft delete reused'));

      const restoredOk = await request(`${ baseUrl }/api/notes/2`, { method: 'POST' });
      failures.push(...expectStatus(restoredOk.status, 200, 'restore'));
      failures.push(...expectEqual(restoredOk.body.id, 2, 'restored id'));
      failures.push(...expectEqual(restoredOk.body.deletedAt, undefined, 'deletedAt cleared'));

      const gotRestored = await request(`${ baseUrl }/api/notes/2`);
      failures.push(...expectStatus(gotRestored.status, 200, 'get after restore'));

      const secondDelete = await request(`${ baseUrl }/api/notes/2`, { method: 'DELETE' });
      failures.push(...expectStatus(secondDelete.status, 204, 'soft delete again'));
      const thirdDelete = await request(`${ baseUrl }/api/notes/2`, { method: 'DELETE' });
      failures.push(...expectStatus(thirdDelete.status, 404, 'soft delete already deleted'));

      const ghost = await request(`${ baseUrl }/api/notes`, {
        method: 'POST',
        json: { title: 'Ghost', deletedAt: '2099-01-01T00:00:00.000Z' }
      });
      failures.push(...expectStatus(ghost.status, 201, 'create with deletedAt'));
      failures.push(...expectEqual(typeof ghost.body.deletedAt, 'string', 'created carries deletedAt'));

      const listedNoGhost = await request(`${ baseUrl }/api/notes`);
      const ghostVisible = listedNoGhost.body.some((item) => item.title === 'Ghost');
      if (ghostVisible) {
        failures.push('Expected create+deletedAt item hidden from default list');
      }
      const listedGhost = await request(`${ baseUrl }/api/notes?includeDeleted=true`);
      const ghostInTrash = listedGhost.body.some((item) => item.title === 'Ghost');
      if (!ghostInTrash) {
        failures.push('Expected create+deletedAt item visible with includeDeleted');
      }

      if (!stdout.includes('The "body" property is ignored when "action" is set')) {
        failures.push('Expected warning for restore body ignored when action is set');
      }

      const archiveDelete = await request(`${ baseUrl }/api/archived/2`, { method: 'DELETE' });
      failures.push(...expectStatus(archiveDelete.status, 204, 'custom field soft delete'));
      const archiveGone = await request(`${ baseUrl }/api/archived/2`);
      failures.push(...expectStatus(archiveGone.status, 404, 'custom field hidden'));
      const archiveShown = await request(`${ baseUrl }/api/archived/2?includeDeleted=1`);
      failures.push(...expectStatus(archiveShown.status, 200, 'custom field includeDeleted'));
      failures.push(...expectEqual(typeof archiveShown.body.removedAt, 'string', 'removedAt set'));
      failures.push(...expectEqual(archiveShown.body.deletedAt, undefined, 'no default deletedAt'));
      const archiveRestore = await request(`${ baseUrl }/api/archived/2`, { method: 'POST' });
      failures.push(...expectStatus(archiveRestore.status, 200, 'custom field restore'));
      failures.push(...expectEqual(archiveRestore.body.removedAt, undefined, 'removedAt cleared'));

      const taskDelete = await request(`${ baseUrl }/api/tasks/2`, { method: 'DELETE' });
      failures.push(...expectStatus(taskDelete.status, 204, 'list store soft delete'));
      const taskList = await request(`${ baseUrl }/api/tasks`);
      failures.push(...expectStatus(taskList.status, 200, 'list after soft delete'));
      failures.push(...expectEqual(taskList.body.total, 2, 'list total hides soft-deleted'));
      failures.push(...expectEqual(taskList.body.data.length, 2, 'list data hides soft-deleted'));
      const taskListAll = await request(`${ baseUrl }/api/tasks?includeDeleted=true`);
      failures.push(...expectEqual(taskListAll.body.total, 3, 'list includeDeleted total'));
      const taskFiltered = await request(`${ baseUrl }/api/tasks?status=open`);
      failures.push(...expectEqual(taskFiltered.body.total, 1, 'filter after soft-delete hide'));
      failures.push(...expectEqual(taskFiltered.body.data[0]?.id, 1, 'remaining open task'));

      const slotDelete = await request(`${ baseUrl }/api/slots/1`, { method: 'DELETE' });
      failures.push(...expectStatus(slotDelete.status, 204, 'key soft delete'));
      const slotReuse = await request(`${ baseUrl }/api/slots`, {
        method: 'POST',
        json: { id: 1, label: 'reclaimed' }
      });
      failures.push(...expectStatus(slotReuse.status, 201, 'key freed after soft delete'));
      failures.push(...expectEqual(slotReuse.body.label, 'reclaimed', 'reclaimed label'));
      const slotList = await request(`${ baseUrl }/api/slots`);
      failures.push(...expectEqual(slotList.body.length, 1, 'reclaimed replaces soft-deleted'));
      failures.push(...expectEqual(slotList.body[0].label, 'reclaimed', 'active reclaimed row'));

      const hardDelete = await request(`${ baseUrl }/api/hard/1`, { method: 'DELETE' });
      failures.push(...expectStatus(hardDelete.status, 204, 'hard delete'));
      const hardGone = await request(`${ baseUrl }/api/hard/1?includeDeleted=true`);
      failures.push(...expectStatus(hardGone.status, 404, 'hard delete permanent'));
      const hardList = await request(`${ baseUrl }/api/hard`);
      failures.push(...expectEqual(hardList.body, [], 'hard list empty'));

      return failures;
    }
  })
};
