'use strict';

/**
 * Multi-tenant SaaS RBAC + async jobs.
 * Distinguishes 401 (unauthenticated) vs 403 (authenticated, not allowed),
 * hides privileged resources as 404 for members, soft-delete 410, and
 * job polling with delay — common frontend failure modes in org-scoped APIs.
 */

const { runHttpUseCase } = require('../../lib/execute-mock-file');
const {
  request,
  expectStatus,
  expectEqual,
  expectHeader,
  expectMinDelay
} = require('../../lib/http-assert');

module.exports = {
  name: 'runtime/multi-tenant-rbac',
  description: 'HTTP: multi-tenant 401/403/404/410 + async jobs',
  run: () => runHttpUseCase({
    name: 'runtime/multi-tenant-rbac',
    description: 'HTTP: multi-tenant 401/403/404/410 + async jobs',
    mockRelativePath: 'mocks/20-multi-tenant-rbac.json',
    timeoutMs: 20000,
    async assert({ baseUrl }) {
      const failures = [];

      const adminList = await request(
        `${ baseUrl }/api/v1/orgs/org_1/projects?role=admin&includeArchived=false`
      );
      failures.push(...expectStatus(adminList.status, 200, 'admin list'));
      failures.push(...expectHeader(adminList.headers, 'x-org-id', 'org_1', 'X-Org-Id'));
      failures.push(...expectEqual(adminList.body.data.length, 2, 'admin projects'));

      const memberList = await request(
        `${ baseUrl }/api/v1/orgs/org_1/projects?role=member`
      );
      failures.push(...expectStatus(memberList.status, 200, 'member list'));
      failures.push(...expectEqual(memberList.body.data.length, 1, 'member projects'));

      const otherOrg = await request(
        `${ baseUrl }/api/v1/orgs/org_2/projects?role=member`
      );
      failures.push(...expectStatus(otherOrg.status, 403, 'other org forbidden'));
      failures.push(...expectEqual(otherOrg.body.code, 'ORG_FORBIDDEN', 'org forbidden code'));

      const unauth = await request(`${ baseUrl }/api/v1/orgs/org_1/projects`);
      failures.push(...expectStatus(unauth.status, 401, 'unauthorized fallback'));
      failures.push(...expectHeader(unauth.headers, 'www-authenticate', 'Bearer', 'WWW-Authenticate'));
      failures.push(...expectEqual(unauth.body.code, 'UNAUTHORIZED', 'unauthorized code'));

      const created = await request(
        `${ baseUrl }/api/v1/orgs/org_1/projects?role=admin`,
        {
          method: 'POST',
          json: { name: 'Billing', visibility: 'private' }
        }
      );
      failures.push(...expectStatus(created.status, 201, 'create project'));
      failures.push(...expectEqual(created.body.id, 'prj_3', 'created id'));

      const memberCreate = await request(
        `${ baseUrl }/api/v1/orgs/org_1/projects?role=member`,
        { method: 'POST', json: { name: 'Billing' } }
      );
      failures.push(...expectStatus(memberCreate.status, 403, 'member create forbidden'));
      failures.push(...expectEqual(memberCreate.body.code, 'INSUFFICIENT_ROLE', 'role code'));

      const invalid = await request(
        `${ baseUrl }/api/v1/orgs/org_1/projects?role=admin`,
        { method: 'POST', json: { name: '' } }
      );
      failures.push(...expectStatus(invalid.status, 422, 'create validation'));
      failures.push(...expectEqual(invalid.body.errors?.[0]?.code, 'REQUIRED', 'required field'));

      const found = await request(
        `${ baseUrl }/api/v1/orgs/org_1/projects/prj_1?role=admin`
      );
      failures.push(...expectStatus(found.status, 200, 'get project'));
      failures.push(...expectEqual(found.body.name, 'Website', 'project name'));

      const hidden = await request(
        `${ baseUrl }/api/v1/orgs/org_1/projects/prj_secret?role=member`
      );
      failures.push(...expectStatus(hidden.status, 404, 'hidden as not-found'));
      failures.push(...expectEqual(hidden.body.code, 'PROJECT_NOT_FOUND', 'hidden code'));

      const deleted = await request(
        `${ baseUrl }/api/v1/orgs/org_1/projects/prj_1?role=admin`,
        { method: 'DELETE' }
      );
      failures.push(...expectStatus(deleted.status, 204, 'soft delete'));
      failures.push(...expectEqual(deleted.body, null, 'delete body'));

      const gone = await request(
        `${ baseUrl }/api/v1/orgs/org_1/projects/prj_archived?role=admin`,
        { method: 'DELETE' }
      );
      failures.push(...expectStatus(gone.status, 410, 'already gone'));
      failures.push(...expectEqual(gone.body.code, 'PROJECT_GONE', 'gone code'));

      const memberDelete = await request(
        `${ baseUrl }/api/v1/orgs/org_1/projects/prj_1?role=member`,
        { method: 'DELETE' }
      );
      failures.push(...expectStatus(memberDelete.status, 403, 'member delete forbidden'));

      const queued = await request(`${ baseUrl }/api/v1/jobs`, {
        method: 'POST',
        json: { type: 'export', orgId: 'org_1' }
      });
      failures.push(...expectStatus(queued.status, 202, 'job accepted'));
      failures.push(...expectHeader(queued.headers, 'location', '/api/v1/jobs/job_1', 'job Location'));
      failures.push(...expectEqual(queued.body.status, 'queued', 'queued status'));

      const runningStarted = Date.now();
      const running = await request(`${ baseUrl }/api/v1/jobs/job_1?wait=false`);
      failures.push(...expectMinDelay(Date.now() - runningStarted, 180, 'job running delay'));
      failures.push(...expectStatus(running.status, 200, 'job running'));
      failures.push(...expectEqual(running.body.status, 'running', 'running status'));

      const doneStarted = Date.now();
      const done = await request(`${ baseUrl }/api/v1/jobs/job_1?wait=true`);
      failures.push(...expectMinDelay(Date.now() - doneStarted, 200, 'job wait delay'));
      failures.push(...expectStatus(done.status, 200, 'job succeeded'));
      failures.push(...expectEqual(done.body.status, 'succeeded', 'succeeded status'));

      const failed = await request(`${ baseUrl }/api/v1/jobs/job_fail`);
      failures.push(...expectStatus(failed.status, 200, 'job failed payload'));
      failures.push(...expectEqual(failed.body.error.code, 'EXPORT_FAILED', 'export failed'));

      const missingJob = await request(`${ baseUrl }/api/v1/jobs/job_missing`);
      failures.push(...expectStatus(missingJob.status, 404, 'job not found'));

      return failures;
    }
  })
};
