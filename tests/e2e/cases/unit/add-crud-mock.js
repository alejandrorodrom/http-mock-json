'use strict';

const fs = require('fs');
const path = require('path');
const prompts = require('prompts');
const { runUnitUseCase, PROJECT_ROOT } = require('../../lib/execute-mock-file');
const { createWorkspace } = require('../../lib/server-harness');
const { captureLogs } = require('../../lib/capture-logs');

/**
 * @param {unknown} parsed
 * @param {string} collectionKey
 * @param {string} storeId
 * @param {string} [itemParam]
 * @returns {string[]}
 */
function assertCrudShape(parsed, collectionKey, storeId, itemParam = ':id') {
  const failures = [];
  const itemKey = `${ collectionKey }/${ itemParam }`;
  const collection = parsed[collectionKey];
  const item = parsed[itemKey];

  if (!collection?.store?.id || collection.store.id !== storeId) {
    failures.push(
      `Expected store.id "${ storeId }" on ${ collectionKey }, got: ${ JSON.stringify(collection?.store) }`
    );
  }
  if (collection?.GET?.responses?.[0]?.action !== 'list') {
    failures.push(`Expected GET action "list" on ${ collectionKey }`);
  }
  if (collection?.POST?.responses?.[0]?.action !== 'create') {
    failures.push(`Expected POST action "create" on ${ collectionKey }`);
  }
  if (!item?.store || item.store.id !== storeId) {
    failures.push(
      `Expected store reference { id: "${ storeId }" } on ${ itemKey }, got: ${ JSON.stringify(item?.store) }`
    );
  }
  if (item?.GET?.responses?.[0]?.action !== 'get') {
    failures.push(`Expected GET action "get" on ${ itemKey }`);
  }
  if (item?.PUT?.responses?.[0]?.action !== 'update') {
    failures.push(`Expected PUT action "update" on ${ itemKey }`);
  }
  if (item?.PATCH?.responses?.[0]?.action !== 'patch') {
    failures.push(`Expected PATCH action "patch" on ${ itemKey }`);
  }
  if (item?.DELETE?.responses?.[0]?.action !== 'delete') {
    failures.push(`Expected DELETE action "delete" on ${ itemKey }`);
  }

  return failures;
}

module.exports = {
  name: 'unit/add-crud-mock',
  description: 'addMock --crud: scaffold, edges, errors, and --path/--crud combos',
  run: () => runUnitUseCase({
    name: 'unit/add-crud-mock',
    description: 'addMock --crud: scaffold, edges, errors, and --path/--crud combos',
    expectedOutcome: 'success',
    async assert() {
      const { addMock } = require(
        path.join(PROJECT_ROOT, 'dist/src/cli/commands/add/add-mock.js')
      );
      const { structureCrudMock } = require(
        path.join(PROJECT_ROOT, 'dist/src/cli/commands/add/structure-crud-mock.js')
      );
      const { getMocksData } = require(
        path.join(PROJECT_ROOT, 'dist/src/cli/commands/start/files.js')
      );
      const failures = [];
      const { workspaceDir, cleanup } = createWorkspace(null, { skipMocksDir: true });
      const previousCwd = process.cwd();
      const originalLog = console.log;
      console.log = () => undefined;

      try {
        process.chdir(workspaceDir);

        // --- structureCrudMock edges (no IO) ---
        {
          const fromParamOnly = structureCrudMock(':id');
          if (!fromParamOnly.items || !fromParamOnly['items/:id']) {
            failures.push(
              `[edge-:id] Expected items + items/:id, got: ${ Object.keys(fromParamOnly) }`
            );
          } else {
            failures.push(...assertCrudShape(fromParamOnly, 'items', 'items').map(
              (f) => `[edge-:id] ${ f }`
            ));
          }

          const stripped = structureCrudMock('/api/notes/');
          if (!stripped['api/notes'] || !stripped['api/notes/:id']) {
            failures.push(
              `[edge-slashes] Expected api/notes routes, got: ${ Object.keys(stripped) }`
            );
          }
        }

        // --- --path + --crud (custom mocks dir) ---
        const customDir = path.join(workspaceDir, 'api-mocks');
        fs.mkdirSync(customDir, { recursive: true });

        {
          const output = await captureLogs(async () => {
            prompts.inject(['notes-api', 'api/notes', true]);
            await addMock({ path: 'api-mocks', crud: true });
          });

          const mockFile = path.join(customDir, 'notes-api.json');
          if (!fs.existsSync(mockFile)) {
            failures.push(`[path+crud] Expected mock file at ${ mockFile }`);
          } else {
            const parsed = JSON.parse(fs.readFileSync(mockFile, 'utf8'));
            failures.push(
              ...assertCrudShape(parsed, 'api/notes', 'notes').map((f) => `[path+crud] ${ f }`)
            );
          }

          if (!output.includes('Mock ready')) {
            failures.push(`[path+crud] Expected "Mock ready". Output:\n${ output }`);
          }
          if (!output.includes('Next:')) {
            failures.push(`[path+crud] Expected "Next:". Output:\n${ output }`);
          }
          if (!output.includes('curl -i http://localhost:3001/api/notes')) {
            failures.push(`[path+crud] Expected curl for api/notes. Output:\n${ output }`);
          }
          if (!output.includes('store actions')) {
            failures.push(`[path+crud] Expected CRUD hint. Output:\n${ output }`);
          }
          if (!output.includes('Preparing mock') || !output.includes('crud')) {
            failures.push(`[path+crud] Expected preparing message for crud. Output:\n${ output }`);
          }
        }

        // --- flag order: crud first, then path ---
        {
          prompts.inject(['todos-api', 'todos', true]);
          await addMock({ crud: true, path: 'api-mocks' });
          const mockFile = path.join(customDir, 'todos-api.json');
          if (!fs.existsSync(mockFile)) {
            failures.push('[crud+path] Expected todos-api.json under api-mocks');
          } else {
            const parsed = JSON.parse(fs.readFileSync(mockFile, 'utf8'));
            failures.push(
              ...assertCrudShape(parsed, 'todos', 'todos').map((f) => `[crud+path] ${ f }`)
            );
          }
        }

        // --- default path (mocks) + crud ---
        {
          const defaultMocks = path.join(workspaceDir, 'mocks');
          fs.mkdirSync(defaultMocks, { recursive: true });
          prompts.inject(['products-api', 'products', true]);
          await addMock({ path: 'mocks', crud: true });
          const mockFile = path.join(defaultMocks, 'products-api.json');
          if (!fs.existsSync(mockFile)) {
            failures.push('[default-path+crud] Expected products-api.json under mocks/');
          } else {
            const parsed = JSON.parse(fs.readFileSync(mockFile, 'utf8'));
            failures.push(
              ...assertCrudShape(parsed, 'products', 'products').map(
                (f) => `[default-path+crud] ${ f }`
              )
            );

            try {
              getMocksData(defaultMocks);
            } catch (error) {
              failures.push(
                `[default-path+crud] Generated CRUD mock failed validation: ${
                  error instanceof Error ? error.message : String(error)
                }`
              );
            }
          }
        }

        // --- endpoint ending with /:param keeps that param name ---
        {
          prompts.inject(['users-api', 'users/:userId', true]);
          await addMock({ path: 'api-mocks', crud: true });
          const usersFile = path.join(customDir, 'users-api.json');
          const usersParsed = JSON.parse(fs.readFileSync(usersFile, 'utf8'));
          if (!usersParsed.users || !usersParsed['users/:userId']) {
            failures.push(
              `[param-endpoint] Expected users + users/:userId, got: ${ Object.keys(usersParsed) }`
            );
          } else {
            failures.push(
              ...assertCrudShape(usersParsed, 'users', 'users', ':userId').map(
                (f) => `[param-endpoint] ${ f }`
              )
            );
          }
        }

        // --- abort with --crud ---
        {
          const before = fs.readdirSync(customDir);
          const output = await captureLogs(async () => {
            prompts.inject(['aborted-crud', 'gone', false]);
            await addMock({ path: 'api-mocks', crud: true });
          });

          if (fs.existsSync(path.join(customDir, 'aborted-crud.json'))) {
            failures.push('[abort+crud] Should not write aborted-crud.json');
          }
          if (fs.readdirSync(customDir).length !== before.length) {
            failures.push('[abort+crud] Should not add files under mocks dir');
          }
          if (!output.includes('Aborting')) {
            failures.push(`[abort+crud] Expected abort message. Output:\n${ output }`);
          }
          if (output.includes('Mock ready')) {
            failures.push('[abort+crud] Should not print Mock ready on abort');
          }
          if (output.includes('Next:')) {
            failures.push('[abort+crud] Should not print Next: on abort');
          }
        }

        // --- ENOENT with --crud (missing mocks directory) ---
        {
          const previousExitCode = process.exitCode;
          process.exitCode = 0;
          const output = await captureLogs(async () => {
            prompts.inject(['broken-crud', 'ping', true]);
            await addMock({ path: 'missing-mocks-dir', crud: true });
          });

          if (!output.includes('ENOENT') && !output.includes('no such file')) {
            failures.push(`[enoent+crud] Expected write failure. Output:\n${ output }`);
          }
          if (output.includes('Mock ready')) {
            failures.push('[enoent+crud] Should not print Mock ready after write failure');
          }
          if (output.includes('Next:')) {
            failures.push('[enoent+crud] Should not print Next: after write failure');
          }
          if (process.exitCode !== 1) {
            failures.push(`[enoent+crud] Expected exitCode 1, got ${ process.exitCode }`);
          }
          process.exitCode = previousExitCode;
        }

        // --- overwrite same file with --path + --crud (confirm overwrite) ---
        {
          prompts.inject(['notes-api', 'api/v2/notes', true, true]);
          await addMock({ path: 'api-mocks', crud: true });
          const mockFile = path.join(customDir, 'notes-api.json');
          const parsed = JSON.parse(fs.readFileSync(mockFile, 'utf8'));
          if (!parsed['api/v2/notes'] || parsed['api/notes']) {
            failures.push(
              `[overwrite+crud] Expected overwrite to api/v2/notes, got: ${ Object.keys(parsed) }`
            );
          }
        }

        // --- refuse overwrite ---
        {
          const mockFile = path.join(customDir, 'notes-api.json');
          const before = fs.readFileSync(mockFile, 'utf8');
          const output = await captureLogs(async () => {
            prompts.inject(['notes-api', 'api/v3/notes', true, false]);
            await addMock({ path: 'api-mocks', crud: true });
          });
          const after = fs.readFileSync(mockFile, 'utf8');
          if (before !== after) {
            failures.push('[overwrite-refuse] File content should stay unchanged when overwrite is declined');
          }
          if (!output.includes('Aborting')) {
            failures.push(`[overwrite-refuse] Expected abort message. Output:\n${ output }`);
          }
          if (output.includes('Mock ready')) {
            failures.push('[overwrite-refuse] Should not print Mock ready when overwrite is declined');
          }
          if (output.includes('Next:')) {
            failures.push('[overwrite-refuse] Should not print Next: when overwrite is declined');
          }
        }

        // --- crud:false keeps verb prompt behavior (combo regression) ---
        {
          prompts.inject(['basic-api', 'health', ['get'], true]);
          await addMock({ path: 'api-mocks', crud: false });
          const mockFile = path.join(customDir, 'basic-api.json');
          const parsed = JSON.parse(fs.readFileSync(mockFile, 'utf8'));
          if (!parsed.health?.GET || parsed.health?.POST) {
            failures.push(
              `[crud-false+path] Expected static GET-only mock, got: ${ JSON.stringify(parsed) }`
            );
          }
          if (parsed.health?.GET?.responses?.[0]?.action) {
            failures.push('[crud-false+path] Basic scaffold must not use store actions');
          }
          if (parsed.health?.GET?.responses?.[0]?.statusCode !== 200) {
            failures.push(
              `[crud-false+path] Expected numeric statusCode 200, got: ${
                parsed.health?.GET?.responses?.[0]?.statusCode
              }`
            );
          }
          const successBody = parsed.health?.GET?.responses?.find((r) => r.name === 'success')?.body;
          const errorBody = parsed.health?.GET?.responses?.find((r) => r.name === 'error')?.body;
          if (successBody?.message !== 'ok') {
            failures.push(
              `[crud-false+path] Expected success message "ok", got: ${ JSON.stringify(successBody) }`
            );
          }
          if (errorBody?.message !== 'Not found') {
            failures.push(
              `[crud-false+path] Expected error message "Not found", got: ${ JSON.stringify(errorBody) }`
            );
          }
        }
      } finally {
        console.log = originalLog;
        process.chdir(previousCwd);
        cleanup();
      }

      return failures;
    }
  })
};
