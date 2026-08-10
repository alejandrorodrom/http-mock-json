'use strict';

const fs = require('fs');
const path = require('path');
const prompts = require('prompts');
const { runUnitUseCase, PROJECT_ROOT } = require('../../lib/execute-mock-file');
const { createWorkspace } = require('../../lib/server-harness');
const { captureLogs } = require('../../lib/capture-logs');

module.exports = {
  name: 'unit/add-presets',
  description: 'addMock --preset scaffolds, alias --crud, and resolve errors',
  run: () => runUnitUseCase({
    name: 'unit/add-presets',
    description: 'addMock --preset scaffolds, alias --crud, and resolve errors',
    expectedOutcome: 'success',
    async assert() {
      const { addMock } = require(
        path.join(PROJECT_ROOT, 'dist/src/cli/commands/add/add-mock.js')
      );
      const {
        resolveAddPreset,
        ADD_PRESETS,
        presetLabel,
        presetReadyHint,
        presetInitialEndpoint,
        presetNeedsHttpVerbs
      } = require(
        path.join(PROJECT_ROOT, 'dist/src/cli/commands/add/presets.js')
      );
      const {
        formatAddNextStepsLines,
        formatInitNextStepsLines
      } = require(
        path.join(PROJECT_ROOT, 'dist/src/cli/commands/add/next-steps.js')
      );
      const { structureCrudFullMock } = require(
        path.join(PROJECT_ROOT, 'dist/src/cli/commands/add/structure-crud-mock.js')
      );
      const { structureScenariosMock } = require(
        path.join(PROJECT_ROOT, 'dist/src/cli/commands/add/structure-scenarios-mock.js')
      );
      const { structureAuthLoginMock } = require(
        path.join(PROJECT_ROOT, 'dist/src/cli/commands/add/structure-auth-login-mock.js')
      );
      const { structureProxyHybridMock } = require(
        path.join(PROJECT_ROOT, 'dist/src/cli/commands/add/structure-proxy-hybrid-mock.js')
      );
      const { structurePaginatedListMock } = require(
        path.join(PROJECT_ROOT, 'dist/src/cli/commands/add/structure-paginated-list-mock.js')
      );
      const { structureUploadMock } = require(
        path.join(PROJECT_ROOT, 'dist/src/cli/commands/add/structure-upload-mock.js')
      );
      const { structureRelationsMock } = require(
        path.join(PROJECT_ROOT, 'dist/src/cli/commands/add/structure-relations-mock.js')
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
        const mocksDir = path.join(workspaceDir, 'api-mocks');
        fs.mkdirSync(mocksDir, { recursive: true });

        // --- resolveAddPreset ---
        if (resolveAddPreset({}) !== 'static') {
          failures.push('[resolve] default should be static');
        }
        if (resolveAddPreset({ crud: true }) !== 'crud') {
          failures.push('[resolve] --crud should map to crud');
        }
        if (resolveAddPreset({ preset: 'scenarios' }) !== 'scenarios') {
          failures.push('[resolve] --preset scenarios');
        }
        if (resolveAddPreset({ preset: 'crud', crud: true }) !== 'crud') {
          failures.push('[resolve] --preset crud + --crud should be ok');
        }
        try {
          resolveAddPreset({ preset: 'nope' });
          failures.push('[resolve] unknown preset should throw');
        } catch (error) {
          if (!(error instanceof Error) || !error.message.includes('Unknown add preset')) {
            failures.push(`[resolve] unexpected unknown-preset error: ${ error }`);
          }
        }
        try {
          resolveAddPreset({ preset: 'static', crud: true });
          failures.push('[resolve] conflicting --crud + --preset static should throw');
        } catch (error) {
          if (!(error instanceof Error) || !error.message.includes('Cannot combine --crud')) {
            failures.push(`[resolve] unexpected conflict error: ${ error }`);
          }
        }
        if (ADD_PRESETS.length !== 9) {
          failures.push(`[resolve] Expected 9 presets, got ${ ADD_PRESETS.length }`);
        }

        // --- preset metadata ---
        {
          for (const preset of ADD_PRESETS) {
            const label = presetLabel(preset);
            const hint = presetReadyHint(preset);
            if (!label.includes(preset)) {
              failures.push(`[meta] presetLabel(${ preset }) should include name: ${ label }`);
            }
            if (!hint.startsWith('!')) {
              failures.push(`[meta] presetReadyHint(${ preset }) should start with !`);
            }
          }
          if (presetNeedsHttpVerbs('static') !== true) {
            failures.push('[meta] static should need http verbs');
          }
          if (presetNeedsHttpVerbs('crud') !== false) {
            failures.push('[meta] crud should not need http verbs');
          }
          if (presetInitialEndpoint('auth-login') !== 'api/auth/login') {
            failures.push('[meta] auth-login initial endpoint');
          }
          if (presetInitialEndpoint('relations') !== 'api/users') {
            failures.push('[meta] relations initial endpoint');
          }
          if (presetInitialEndpoint('static') !== undefined) {
            failures.push('[meta] static should have no initial endpoint');
          }
        }

        // --- Next: footer formatters ---
        {
          const staticLines = formatAddNextStepsLines('/data/animals/', 'static');
          const staticJoined = staticLines.join('\n');
          if (!staticJoined.includes('Next:')) {
            failures.push(`[next] static missing Next:. ${ staticJoined }`);
          }
          if (!staticJoined.includes('curl -i http://localhost:3001/data/animals')) {
            failures.push(`[next] static curl path. ${ staticJoined }`);
          }
          if (!staticJoined.includes(presetReadyHint('static'))) {
            failures.push(`[next] static missing preset hint. ${ staticJoined }`);
          }
          if (presetReadyHint('static') !== '! set nameResponse to "error" to try the 404 body') {
            failures.push(
              `[meta] static ready hint mismatch: ${ presetReadyHint('static') }`
            );
          }
          if (!staticJoined.includes('set nameResponse to "error"') || !staticJoined.includes('404 body')) {
            failures.push(`[next] static hint should mention nameResponse + 404. ${ staticJoined }`);
          }
          if (staticJoined.includes('Edit nameResponse in the mock JSON')) {
            failures.push(`[next] static should not duplicate nameResponse tip. ${ staticJoined }`);
          }

          const scenarioLines = formatAddNextStepsLines('api/events', 'scenarios');
          const scenarioJoined = scenarioLines.join('\n');
          if (!scenarioJoined.includes('Next:') || !scenarioJoined.includes('mock-server start')) {
            failures.push(`[next] scenarios missing Next/start. ${ scenarioJoined }`);
          }
          if (!scenarioJoined.includes(presetReadyHint('scenarios'))) {
            failures.push(`[next] scenarios missing preset hint. ${ scenarioJoined }`);
          }
          if (scenarioJoined.includes('set nameResponse to "error"')) {
            failures.push('[next] scenarios should not include static nameResponse tip');
          }

          const initLines = formatInitNextStepsLines().join('\n');
          if (!initLines.includes('Next:') || !initLines.includes('mock-server add')
            || !initLines.includes('mock-server start')) {
            failures.push(`[next] init footer. ${ initLines }`);
          }
        }

        // --- structure helpers (no IO) ---
        {
          const full = structureCrudFullMock('api/notes');
          const store = full['api/notes']?.store;
          if (!store?.persist || store.softDelete !== true) {
            failures.push(`[crud-full-shape] Expected persist+softDelete, got: ${ JSON.stringify(store) }`);
          }
          if (!Array.isArray(store?.unique) || store.unique[0] !== 'title') {
            failures.push(`[crud-full-shape] Expected unique title, got: ${ JSON.stringify(store?.unique) }`);
          }
          if (full['api/notes/:id']?.POST?.responses?.[0]?.action !== 'restore') {
            failures.push('[crud-full-shape] Expected item POST restore action');
          }

          const scenarios = structureScenariosMock('/items/');
          const responses = scenarios.items?.GET?.responses ?? [];
          const names = responses.map((r) => r.name).sort();
          if (names.join(',') !== 'error,fallback,missing,ok') {
            failures.push(`[scenarios-shape] Unexpected response names: ${ names }`);
          }
          if (scenarios.items?.GET?.nameResponse !== 'fallback') {
            failures.push('[scenarios-shape] Expected nameResponse fallback');
          }

          const auth = structureAuthLoginMock('api/auth/login');
          if (!auth['api/auth/login']?.POST?.request?.payload?.email) {
            failures.push('[auth-shape] Expected request.payload.email');
          }
          const authNames = (auth['api/auth/login']?.POST?.responses ?? []).map((r) => r.name);
          for (const required of ['success', 'forbidden', 'unauthorized', 'invalid']) {
            if (!authNames.includes(required)) {
              failures.push(`[auth-shape] Missing response ${ required }`);
            }
          }
        }

        // --- --preset crud alias parity with --crud ---
        {
          prompts.inject(['preset-crud', 'things', true]);
          await addMock({ path: 'api-mocks', preset: 'crud' });
          const mockFile = path.join(mocksDir, 'preset-crud.json');
          const parsed = JSON.parse(fs.readFileSync(mockFile, 'utf8'));
          if (parsed.things?.GET?.responses?.[0]?.action !== 'list') {
            failures.push('[preset-crud] Expected list action');
          }
          if (!parsed['things/:id']?.DELETE) {
            failures.push('[preset-crud] Expected item DELETE');
          }
        }

        // --- --preset crud-full writes + validates ---
        {
          prompts.inject(['preset-full', 'api/notes', true]);
          await addMock({ path: 'api-mocks', preset: 'crud-full' });
          const mockFile = path.join(mocksDir, 'preset-full.json');
          const parsed = JSON.parse(fs.readFileSync(mockFile, 'utf8'));
          if (parsed['api/notes']?.store?.persist !== true) {
            failures.push('[preset-full] Expected persist true');
          }
          if (parsed['api/notes/:id']?.POST?.responses?.[0]?.action !== 'restore') {
            failures.push('[preset-full] Expected restore action');
          }
          try {
            getMocksData(mocksDir);
          } catch (error) {
            failures.push(
              `[preset-full] Validation failed: ${
                error instanceof Error ? error.message : String(error)
              }`
            );
          }
        }

        // --- --preset scenarios ---
        {
          const output = await captureLogs(async () => {
            prompts.inject(['preset-scenarios', 'status', true]);
            await addMock({ path: 'api-mocks', preset: 'scenarios' });
          });
          const mockFile = path.join(mocksDir, 'preset-scenarios.json');
          const parsed = JSON.parse(fs.readFileSync(mockFile, 'utf8'));
          if (parsed.status?.GET?.responses?.length !== 4) {
            failures.push(
              `[preset-scenarios] Expected 4 responses, got ${ parsed.status?.GET?.responses?.length }`
            );
          }
          if (!output.includes('scenario=ok')) {
            failures.push(`[preset-scenarios] Expected hint. Output:\n${ output }`);
          }
        }

        // --- --preset auth-login ---
        {
          prompts.inject(['preset-auth', 'api/auth/login', true]);
          await addMock({ path: 'api-mocks', preset: 'auth-login' });
          const mockFile = path.join(mocksDir, 'preset-auth.json');
          const parsed = JSON.parse(fs.readFileSync(mockFile, 'utf8'));
          const method = parsed['api/auth/login']?.POST;
          if (!method?.request?.payload?.password) {
            failures.push('[preset-auth] Expected password request rule');
          }
          if (method?.nameResponse !== 'unauthorized') {
            failures.push('[preset-auth] Expected nameResponse unauthorized');
          }
          try {
            getMocksData(mocksDir);
          } catch (error) {
            failures.push(
              `[preset-auth] Validation failed: ${
                error instanceof Error ? error.message : String(error)
              }`
            );
          }
        }

        // --- --preset static still asks verbs ---
        {
          prompts.inject(['preset-static', 'health', ['get'], true]);
          await addMock({ path: 'api-mocks', preset: 'static' });
          const mockFile = path.join(mocksDir, 'preset-static.json');
          const parsed = JSON.parse(fs.readFileSync(mockFile, 'utf8'));
          if (!parsed.health?.GET || parsed.health?.POST) {
            failures.push(`[preset-static] Expected GET-only, got: ${ JSON.stringify(parsed) }`);
          }
          const successBody = parsed.health?.GET?.responses?.find((r) => r.name === 'success')?.body;
          const errorBody = parsed.health?.GET?.responses?.find((r) => r.name === 'error')?.body;
          if (successBody?.message !== 'ok') {
            failures.push(`[preset-static] Expected success message "ok", got: ${ JSON.stringify(successBody) }`);
          }
          if (errorBody?.message !== 'Not found') {
            failures.push(`[preset-static] Expected error message "Not found", got: ${ JSON.stringify(errorBody) }`);
          }
        }

        // --- structureMock sample bodies ---
        {
          const { structureMock } = require(
            path.join(PROJECT_ROOT, 'dist/src/cli/commands/add/structure-mock.js')
          );
          const shaped = structureMock('api/demo', ['get']);
          const success = shaped['api/demo']?.GET?.responses?.find((r) => r.name === 'success');
          const error = shaped['api/demo']?.GET?.responses?.find((r) => r.name === 'error');
          if (success?.body?.message !== 'ok' || error?.body?.message !== 'Not found') {
            failures.push(
              `[structureMock] Expected sample bodies, got success=${ JSON.stringify(success?.body) } error=${ JSON.stringify(error?.body) }`
            );
          }
        }

        // --- tier 2 structure shapes ---
        {
          const hybrid = structureProxyHybridMock('api/notes');
          if (!hybrid['api/notes']?.GET || !hybrid['api/notes/live']?.GET?.responses?.[0]?.proxy) {
            failures.push(`[proxy-hybrid-shape] Expected local + live proxy routes`);
          }
          const hybridItem = structureProxyHybridMock('api/notes/:id');
          if (!hybridItem['api/notes']?.GET || !hybridItem['api/notes/live']?.GET) {
            failures.push(
              '[proxy-hybrid-shape] Expected /:id endpoint to use collection + /live sibling'
            );
          }
          if (hybridItem['api/notes/:id/live']) {
            failures.push('[proxy-hybrid-shape] Should not nest /live under /:id');
          }

          const page = structurePaginatedListMock('api/items');
          if (!page['api/items']?.store?.list?.pageSize) {
            failures.push('[paginated-list-shape] Expected store.list.pageSize');
          }
          if ((page['api/items']?.store?.seed ?? []).length < 5) {
            failures.push('[paginated-list-shape] Expected seeded rows');
          }

          const upload = structureUploadMock('api/uploads');
          if (upload['api/uploads']?.POST?.request?.as !== 'multipart') {
            failures.push('[upload-shape] Expected multipart request');
          }
          if (upload['api/uploads/:id']?.GET?.responses?.[0]?.encoding !== 'base64') {
            failures.push('[upload-shape] Expected base64 download');
          }

          const uploadParam = structureUploadMock('api/uploads/:fileId');
          const downloadUrl = uploadParam['api/uploads']?.POST?.responses?.[0]?.body?.downloadUrl;
          if (downloadUrl !== '/api/uploads/file_1') {
            failures.push(
              `[upload-shape] Expected downloadUrl /api/uploads/file_1 for :fileId, got: ${ downloadUrl }`
            );
          }

          const relations = structureRelationsMock('api/users');
          if (!relations['api/users']?.store?.relations?.posts) {
            failures.push('[relations-shape] Expected users.posts many relation');
          }
          if (!relations['api/posts']?.store?.relations?.userId) {
            failures.push('[relations-shape] Expected posts.userId FK');
          }
          if (!relations['api/posts/:id']?.GET) {
            failures.push('[relations-shape] Expected posts/:id GET');
          }

          const relationsAlt = structureRelationsMock('api/posts', 'comments');
          if (!relationsAlt['api/posts']?.store?.relations?.comments) {
            failures.push('[relations-shape] Expected posts.comments many relation');
          }
          if (!relationsAlt['api/comments']?.store?.relations?.postId) {
            failures.push('[relations-shape] Expected comments.postId FK from parent posts');
          }
          if (relationsAlt['api/comments']?.store?.relations?.userId) {
            failures.push('[relations-shape] comments should not keep userId when parent is posts');
          }

          for (const badEndpoint of ['api/posts', 'posts']) {
            try {
              structureRelationsMock(badEndpoint);
              failures.push(
                `[relations-collide] Expected collision for endpoint ${ badEndpoint }`
              );
            } catch (error) {
              if (
                !(error instanceof Error)
                || !error.message.includes('collides with child "posts"')
              ) {
                failures.push(
                  `[relations-collide] Unexpected error for ${ badEndpoint }: ${ error }`
                );
              }
            }
          }
        }

        // --- tier 2 presets write + validate ---
        for (const [label, preset, name, endpoint] of [
          ['proxy-hybrid', 'proxy-hybrid', 'preset-hybrid', 'api/notes'],
          ['paginated-list', 'paginated-list', 'preset-page', 'api/items'],
          ['upload', 'upload', 'preset-upload', 'api/uploads'],
          ['relations', 'relations', 'preset-rel', 'api/users']
        ]) {
          prompts.inject([name, endpoint, true]);
          await addMock({ path: 'api-mocks', preset });
          const mockFile = path.join(mocksDir, `${ name }.json`);
          if (!fs.existsSync(mockFile)) {
            failures.push(`[${ label }] Expected file ${ mockFile }`);
            continue;
          }
          try {
            getMocksData(mocksDir);
          } catch (error) {
            failures.push(
              `[${ label }] Validation failed: ${
                error instanceof Error ? error.message : String(error)
              }`
            );
          }
        }

        // --- conflict surfaced via addMock (logError + exitCode) ---
        {
          const previousExitCode = process.exitCode;
          process.exitCode = 0;
          const output = await captureLogs(async () => {
            await addMock({ path: 'api-mocks', preset: 'scenarios', crud: true });
          });
          if (!output.includes('Cannot combine --crud')) {
            failures.push(`[conflict] Expected combine error. Output:\n${ output }`);
          }
          if (process.exitCode !== 1) {
            failures.push(`[conflict] Expected exitCode 1, got ${ process.exitCode }`);
          }
          process.exitCode = previousExitCode;
        }

        // --- relations child prompt cancel → Aborting (not exitCode 1) ---
        {
          const previousExitCode = process.exitCode;
          process.exitCode = 0;
          const before = fs.readdirSync(mocksDir);
          const output = await captureLogs(async () => {
            // prompts.inject(null) cancels the active prompt
            prompts.inject(['preset-rel-abort', 'api/posts', null]);
            await addMock({ path: 'api-mocks', preset: 'relations' });
          });
          if (!output.includes('Aborting')) {
            failures.push(
              `[relations-child-abort] Expected Aborting. Output:\n${ output }`
            );
          }
          if (process.exitCode === 1) {
            failures.push('[relations-child-abort] Cancel should not set exitCode 1');
          }
          if (fs.existsSync(path.join(mocksDir, 'preset-rel-abort.json'))) {
            failures.push('[relations-child-abort] Should not write file on cancel');
          }
          if (fs.readdirSync(mocksDir).length !== before.length) {
            failures.push('[relations-child-abort] Should not add files on cancel');
          }
          process.exitCode = previousExitCode;
        }

        // --- relations collision → ask child collection instead of failing ---
        for (const [label, endpoint, fileName] of [
          ['api/posts', 'api/posts', 'preset-rel-child'],
          ['posts', 'posts', 'preset-rel-child-flat']
        ]) {
          const previousExitCode = process.exitCode;
          process.exitCode = 0;
          prompts.inject([fileName, endpoint, 'comments', true]);
          await addMock({ path: 'api-mocks', preset: 'relations' });
          const mockFile = path.join(mocksDir, `${ fileName }.json`);
          if (!fs.existsSync(mockFile)) {
            failures.push(`[relations-child-prompt:${ label }] Expected file ${ mockFile }`);
            process.exitCode = previousExitCode;
            continue;
          }
          if (process.exitCode === 1) {
            failures.push(
              `[relations-child-prompt:${ label }] Unexpected exitCode 1 after child prompt`
            );
          }
          const payload = JSON.parse(fs.readFileSync(mockFile, 'utf8'));
          const parentKey = endpoint;
          const childKey = endpoint.includes('/')
            ? `${ endpoint.slice(0, endpoint.lastIndexOf('/')) }/comments`
            : 'comments';
          if (!payload[parentKey]?.store?.relations?.comments) {
            failures.push(
              `[relations-child-prompt:${ label }] Expected ${ parentKey }.relations.comments`
            );
          }
          if (!payload[childKey]?.store?.id || payload[childKey].store.id !== 'comments') {
            failures.push(
              `[relations-child-prompt:${ label }] Expected child store at ${ childKey }`
            );
          }
          if (!payload[childKey]?.store?.relations?.postId) {
            failures.push(
              `[relations-child-prompt:${ label }] Expected FK postId from parent posts`
            );
          }
          const isolateDir = path.join(workspaceDir, `rel-child-${ label.replace(/\//g, '-') }`);
          fs.mkdirSync(isolateDir, { recursive: true });
          fs.copyFileSync(mockFile, path.join(isolateDir, `${ fileName }.json`));
          try {
            getMocksData(isolateDir);
          } catch (error) {
            failures.push(
              `[relations-child-prompt:${ label }] Validation failed: ${
                error instanceof Error ? error.message : String(error)
              }`
            );
          }
          process.exitCode = previousExitCode;
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
