'use strict';

const fs = require('fs');
const path = require('path');
const {
  createWorkspace,
  startMockServer
} = require('../../lib/server-harness');
const {
  request,
  expectStatus,
  expectEqual,
  expectHeader
} = require('../../lib/http-assert');

module.exports = {
  name: 'runtime/store-saas',
  description: 'HTTP: SaaS projects/tasks with request+match+store+persist restart',
  async run() {
    const startedAt = Date.now();
    const failures = [];
    const { workspaceDir, cleanup } = createWorkspace('mocks/29-store-saas.json');
    const projectsFile = path.join(workspaceDir, 'mocks', '.store', 'projects.json');
    const tasksFile = path.join(workspaceDir, 'mocks', '.store', 'tasks.json');

    let first;
    let second;

    try {
      first = await startMockServer({
        workspaceDir,
        cleanup,
        cleanupOnStop: false,
        timeoutMs: 25000
      });

      const listed = await request(`${ first.baseUrl }/api/orgs/org_acme/projects`);
      failures.push(...expectStatus(listed.status, 200, 'list seed projects'));
      failures.push(...expectEqual(listed.body.length, 1, 'seed size'));
      failures.push(...expectEqual(listed.body[0]?.slug, 'website', 'seed slug'));
      failures.push(...expectHeader(
        listed.headers,
        'x-store-action',
        'list',
        'list action header'
      ));

      const board = await request(`${ first.baseUrl }/api/orgs/org_acme/projects?view=board`);
      failures.push(...expectStatus(board.status, 200, 'board static match'));
      failures.push(...expectEqual(board.body.source, 'static-match', 'board body'));
      failures.push(...expectHeader(board.headers, 'x-view', 'board', 'board header'));

      const forbiddenList = await request(`${ first.baseUrl }/api/orgs/org_blocked/projects`);
      failures.push(...expectStatus(forbiddenList.status, 403, 'forbidden org list'));
      failures.push(...expectEqual(forbiddenList.body.code, 'ORG_FORBIDDEN', 'forbidden code'));

      const invalidCreate = await request(`${ first.baseUrl }/api/orgs/org_acme/projects`, {
        method: 'POST',
        json: {
          name: 'Ab',
          slug: 'BAD SLUG',
          ownerEmail: 'not-an-email'
        }
      });
      failures.push(...expectStatus(invalidCreate.status, 422, 'project validation'));
      failures.push(...expectEqual(
        invalidCreate.body.code,
        'VALIDATION_ERROR',
        'validation code'
      ));

      const forbiddenCreate = await request(`${ first.baseUrl }/api/orgs/org_blocked/projects`, {
        method: 'POST',
        json: {
          name: 'Secret',
          slug: 'secret',
          ownerEmail: 'x@blocked.com'
        }
      });
      failures.push(...expectStatus(forbiddenCreate.status, 403, 'forbidden org create'));

      const created = await request(`${ first.baseUrl }/api/orgs/org_acme/projects`, {
        method: 'POST',
        json: {
          name: 'Mobile App',
          slug: 'mobile',
          ownerEmail: 'pm@acme.com',
          status: 'active'
        }
      });
      failures.push(...expectStatus(created.status, 201, 'create project'));
      failures.push(...expectEqual(created.body.slug, 'mobile', 'created slug'));
      failures.push(...expectEqual(created.body.orgId, 'org_acme', 'param org wins'));
      failures.push(...expectHeader(
        created.headers,
        'x-store-action',
        'create',
        'create action header'
      ));

      const slugTaken = await request(`${ first.baseUrl }/api/orgs/org_acme/projects`, {
        method: 'POST',
        json: {
          name: 'Another Mobile',
          slug: 'mobile',
          ownerEmail: 'pm2@acme.com'
        }
      });
      failures.push(...expectStatus(slugTaken.status, 409, 'slug taken'));
      failures.push(...expectEqual(slugTaken.body.code, 'SLUG_TAKEN', 'slug taken code'));
      failures.push(...expectEqual(
        slugTaken.body.errors,
        [{ field: 'slug', value: 'mobile' }],
        'slug conflict detail'
      ));

      const got = await request(
        `${ first.baseUrl }/api/orgs/org_acme/projects/${ created.body.id }`
      );
      failures.push(...expectStatus(got.status, 200, 'get project'));
      failures.push(...expectEqual(got.body.name, 'Mobile App', 'get name'));

      const archiveBlocked = await request(
        `${ first.baseUrl }/api/orgs/org_acme/projects/${ created.body.id }`,
        {
          method: 'PATCH',
          json: { status: 'archived' }
        }
      );
      failures.push(...expectStatus(archiveBlocked.status, 409, 'archive via match'));
      failures.push(...expectEqual(
        archiveBlocked.body.code,
        'ARCHIVE_VIA_STORE_DISABLED',
        'archive static code'
      ));

      const paused = await request(
        `${ first.baseUrl }/api/orgs/org_acme/projects/${ created.body.id }`,
        {
          method: 'PATCH',
          json: { status: 'paused' }
        }
      );
      failures.push(...expectStatus(paused.status, 200, 'patch project status'));
      failures.push(...expectEqual(paused.body.status, 'paused', 'paused status'));

      const tasks = await request(
        `${ first.baseUrl }/api/orgs/org_acme/projects/1/tasks`
      );
      failures.push(...expectStatus(tasks.status, 200, 'list tasks'));
      failures.push(...expectEqual(tasks.body.length, 1, 'seed task size'));
      failures.push(...expectEqual(tasks.body[0]?.title, 'Kickoff', 'seed task'));

      const taskInvalid = await request(
        `${ first.baseUrl }/api/orgs/org_acme/projects/1/tasks`,
        {
          method: 'POST',
          json: { title: 'X', assignee: 'bad' }
        }
      );
      failures.push(...expectStatus(taskInvalid.status, 422, 'task validation'));

      const task = await request(
        `${ first.baseUrl }/api/orgs/org_acme/projects/${ created.body.id }/tasks`,
        {
          method: 'POST',
          json: {
            title: 'Ship MVP',
            assignee: 'dev@acme.com',
            status: 'doing'
          }
        }
      );
      failures.push(...expectStatus(task.status, 201, 'create task'));
      failures.push(...expectEqual(task.body.title, 'Ship MVP', 'task title'));
      failures.push(...expectEqual(task.body.orgId, 'org_acme', 'task org param'));
      failures.push(...expectEqual(
        task.body.projectId,
        created.body.id,
        'task project param'
      ));

      const taskDup = await request(
        `${ first.baseUrl }/api/orgs/org_acme/projects/${ created.body.id }/tasks`,
        {
          method: 'POST',
          json: {
            title: 'Ship MVP',
            assignee: 'dev2@acme.com'
          }
        }
      );
      failures.push(...expectStatus(taskDup.status, 409, 'default unique task title'));
      failures.push(...expectEqual(
        taskDup.body.message,
        'Duplicate value(s)',
        'default conflict message'
      ));

      const taskPatched = await request(
        `${ first.baseUrl }/api/orgs/org_acme/projects/${ created.body.id }/tasks/${ task.body.id }`,
        {
          method: 'PATCH',
          json: { status: 'done' }
        }
      );
      failures.push(...expectStatus(taskPatched.status, 200, 'patch task'));
      failures.push(...expectEqual(taskPatched.body.status, 'done', 'task done'));
      failures.push(...expectEqual(taskPatched.body.title, 'Ship MVP', 'task keeps title'));

      const removedTask = await request(
        `${ first.baseUrl }/api/orgs/org_acme/projects/1/tasks/1`,
        { method: 'DELETE' }
      );
      failures.push(...expectStatus(removedTask.status, 204, 'delete seed task'));

      if (!fs.existsSync(projectsFile)) {
        failures.push(`Expected projects persist file at ${ projectsFile }`);
      }
      if (!fs.existsSync(tasksFile)) {
        failures.push(`Expected tasks persist file at ${ tasksFile }`);
      }

      await first.stop();

      second = await startMockServer({
        workspaceDir,
        cleanup,
        cleanupOnStop: false,
        timeoutMs: 25000
      });

      const projectsAfter = await request(`${ second.baseUrl }/api/orgs/org_acme/projects`);
      failures.push(...expectStatus(projectsAfter.status, 200, 'projects after restart'));
      failures.push(...expectEqual(projectsAfter.body.length, 2, 'persisted projects size'));
      const slugs = projectsAfter.body.map((item) => item.slug).sort();
      failures.push(...expectEqual(slugs, ['mobile', 'website'], 'persisted project slugs'));

      const mobile = projectsAfter.body.find((item) => item.slug === 'mobile');
      failures.push(...expectEqual(mobile?.status, 'paused', 'persisted paused status'));

      const tasksAfter = await request(
        `${ second.baseUrl }/api/orgs/org_acme/projects/${ mobile.id }/tasks`
      );
      failures.push(...expectStatus(tasksAfter.status, 200, 'tasks after restart'));
      failures.push(...expectEqual(tasksAfter.body.length, 1, 'persisted tasks size'));
      failures.push(...expectEqual(tasksAfter.body[0]?.title, 'Ship MVP', 'persisted task'));
      failures.push(...expectEqual(tasksAfter.body[0]?.status, 'done', 'persisted task status'));

      const seedTasksGone = await request(
        `${ second.baseUrl }/api/orgs/org_acme/projects/1/tasks`
      );
      failures.push(...expectEqual(seedTasksGone.body.length, 0, 'deleted seed task stays gone'));

      await second.stop();
    } catch (error) {
      failures.push(error instanceof Error ? error.message : String(error));
    } finally {
      if (second) {
        await second.stop().catch(() => undefined);
      } else if (first) {
        await first.stop().catch(() => undefined);
      }
      cleanup();
    }

    return {
      name: 'runtime/store-saas',
      description: 'HTTP: SaaS projects/tasks with request+match+store+persist restart',
      passed: failures.length === 0,
      failures,
      durationMs: Date.now() - startedAt,
      expectedOutcome: 'success'
    };
  }
};
