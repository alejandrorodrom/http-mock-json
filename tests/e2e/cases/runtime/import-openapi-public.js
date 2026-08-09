'use strict';

const fs = require('fs');
const path = require('path');
const { PROJECT_ROOT } = require('../../lib/execute-mock-file');
const { createWorkspace, startMockServer } = require('../../lib/server-harness');
const { request, expectStatus } = require('../../lib/http-assert');
const { stripAnsi } = require('../../lib/strip-ansi');

const FIXTURES = path.join(PROJECT_ROOT, 'tests/e2e/fixtures/openapi');

/** @type {Array<{
 *   id: string,
 *   fixture: string,
 *   expectConfigPrefix: string | null,
 *   expectFiles: string[],
 *   routes: Array<{ path: string, status: number, bodyIncludes?: string }>
 * }>} */
const CASES = [
  {
    id: 'petstore3',
    fixture: 'petstore3.json',
    expectConfigPrefix: '/api/v3',
    expectFiles: [
      'mock.config.json',
      'pet/pet.json',
      'store/store.json',
      'user/user.json'
    ],
    routes: [
      { path: '/api/v3/pet/1', status: 200, bodyIncludes: 'doggie' },
      { path: '/api/v3/store/inventory', status: 200 },
      { path: '/api/v3/user/login', status: 200 }
    ]
  },
  {
    id: 'nasa-apod',
    fixture: 'nasa-apod.json',
    expectConfigPrefix: '/planetary',
    expectFiles: [
      'mock.config.json',
      'request-tag/request-tag.json'
    ],
    routes: [
      { path: '/planetary/apod', status: 200 },
      { path: '/apod', status: 404 }
    ]
  },
  {
    id: 'postman',
    fixture: 'postman.json',
    expectConfigPrefix: null,
    expectFiles: [
      'collections.json',
      'api.json',
      'workspaces.json'
    ],
    routes: [
      { path: '/collections', status: 200, bodyIncludes: 'collections' },
      { path: '/apis', status: 200 },
      { path: '/workspaces', status: 200, bodyIncludes: 'workspaces' }
    ]
  }
];

/**
 * @param {string} dir
 * @returns {string[]}
 */
function listRelativeFiles(dir) {
  /** @type {string[]} */
  const out = [];
  const walk = (current, prefix) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const rel = prefix ? `${ prefix }/${ entry.name }` : entry.name;
      if (entry.isDirectory()) {
        walk(path.join(current, entry.name), rel);
      } else {
        out.push(rel);
      }
    }
  };
  walk(dir, '');
  return out.sort();
}

module.exports = {
  name: 'runtime/import-openapi-public',
  description: 'Import Petstore3, NASA APOD, and Postman OpenAPI fixtures then hit key routes',
  async run() {
    const startedAt = Date.now();
    const failures = [];
    const { importOpenApi } = require(
      path.join(PROJECT_ROOT, 'dist/src/cli/commands/import/import-openapi.js')
    );

    const { workspaceDir, cleanup } = createWorkspace(null, { skipMocksDir: true });
    const previousCwd = process.cwd();
    const logs = [];
    const originalLog = console.log;

    console.log = (...args) => {
      logs.push(stripAnsi(args.map(String).join(' ')));
    };

    try {
      process.chdir(workspaceDir);

      for (const testCase of CASES) {
        const mocksPath = `mocks-${ testCase.id }`;
        const mocksDir = path.join(workspaceDir, mocksPath);
        const openapiPath = path.join(FIXTURES, testCase.fixture);

        if (!fs.existsSync(openapiPath)) {
          failures.push(`[${ testCase.id }] Missing fixture ${ openapiPath }`);
          continue;
        }

        await importOpenApi({
          path: mocksPath,
          openapi: openapiPath,
          overwrite: true
        });

        const written = listRelativeFiles(mocksDir);
        for (const expected of testCase.expectFiles) {
          if (!written.includes(expected)) {
            failures.push(
              `[${ testCase.id }] Expected file ${ expected }, got: ${ written.join(', ') }`
            );
          }
        }

        const configPath = path.join(mocksDir, 'mock.config.json');
        if (testCase.expectConfigPrefix) {
          if (!fs.existsSync(configPath)) {
            failures.push(`[${ testCase.id }] Expected mock.config.json with prefix`);
          } else {
            const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            const prefixes = Object.values(config.folders || {})
              .map((folder) => folder && folder.prefix)
              .filter(Boolean);
            if (!prefixes.includes(testCase.expectConfigPrefix)) {
              failures.push(
                `[${ testCase.id }] Expected folder prefix ${ testCase.expectConfigPrefix }, got ${ JSON.stringify(config) }`
              );
            }
          }
        } else if (fs.existsSync(configPath)) {
          failures.push(`[${ testCase.id }] Did not expect mock.config.json (host-only servers)`);
        }

        let server;
        try {
          server = await startMockServer({
            workspaceDir,
            cleanup,
            cleanupOnStop: false,
            cliPath: mocksPath,
            timeoutMs: 25000
          });

          for (const route of testCase.routes) {
            const response = await request(`${ server.baseUrl }${ route.path }`);
            failures.push(
              ...expectStatus(
                response.status,
                route.status,
                `[${ testCase.id }] ${ route.path }`
              )
            );

            if (route.bodyIncludes) {
              const bodyText = typeof response.body === 'string'
                ? response.body
                : JSON.stringify(response.body);
              if (!bodyText.includes(route.bodyIncludes)) {
                failures.push(
                  `[${ testCase.id }] ${ route.path }: expected body to include ${ JSON.stringify(route.bodyIncludes) }, got ${ bodyText.slice(0, 160) }`
                );
              }
            }
          }
        } catch (error) {
          failures.push(
            `[${ testCase.id }] server/http: ${ error instanceof Error ? error.message : String(error) }`
          );
        } finally {
          if (server) {
            await server.stop();
          }
        }
      }
    } finally {
      console.log = originalLog;
      process.chdir(previousCwd);
      cleanup();
    }

    return {
      name: 'runtime/import-openapi-public',
      description: 'Import Petstore3, NASA APOD, and Postman OpenAPI fixtures then hit key routes',
      passed: failures.length === 0,
      failures,
      durationMs: Date.now() - startedAt,
      expectedOutcome: 'success'
    };
  }
};
