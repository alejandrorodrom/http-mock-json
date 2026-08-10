'use strict';

const fs = require('fs');
const path = require('path');
const { runUnitUseCase, PROJECT_ROOT } = require('../../lib/execute-mock-file');
const { createWorkspace } = require('../../lib/server-harness');
const { stripAnsi } = require('../../lib/strip-ansi');

const FIXTURES = path.join(PROJECT_ROOT, 'tests/e2e/fixtures/openapi');

module.exports = {
  name: 'unit/import-openapi',
  description: 'importOpenApi maps OAS 3.x to mock JSON and rejects Swagger 2',
  run: () => runUnitUseCase({
    name: 'unit/import-openapi',
    description: 'importOpenApi maps OAS 3.x to mock JSON and rejects Swagger 2',
    expectedOutcome: 'success',
    async assert() {
      const { importOpenApi } = require(
        path.join(PROJECT_ROOT, 'dist/src/cli/commands/import/import-openapi.js')
      );
      const { openApiToMock } = require(
        path.join(PROJECT_ROOT, 'dist/src/cli/commands/import/openapi-to-mock.js')
      );
      const { loadOpenApiDocument } = require(
        path.join(PROJECT_ROOT, 'dist/src/cli/commands/import/openapi-load.js')
      );

      const failures = [];
      const { workspaceDir, cleanup } = createWorkspace(null, { skipMocksDir: true });
      const previousCwd = process.cwd();
      const logs = [];
      const originalLog = console.log;
      const previousExitCode = process.exitCode;

      console.log = (...args) => {
        logs.push(stripAnsi(args.map(String).join(' ')));
      };

      try {
        process.chdir(workspaceDir);
        fs.mkdirSync(path.join(workspaceDir, 'api-mocks'), { recursive: true });

        const openapiPath = path.join(FIXTURES, 'pets.yaml');

        await importOpenApi({
          path: 'api-mocks',
          openapi: openapiPath,
          overwrite: true
        });

        const configFile = path.join(workspaceDir, 'api-mocks', 'mock.config.json');
        const petsFile = path.join(workspaceDir, 'api-mocks', 'pets', 'pets.json');
        const storeFile = path.join(workspaceDir, 'api-mocks', 'store', 'store.json');

        if (!fs.existsSync(configFile)) {
          failures.push(`Expected mock.config.json at ${ configFile }`);
        } else {
          const config = JSON.parse(fs.readFileSync(configFile, 'utf8'));
          if (config.folders?.pets?.prefix !== '/api/v1' || config.folders?.store?.prefix !== '/api/v1') {
            failures.push(`Expected folders.*.prefix /api/v1, got: ${ JSON.stringify(config) }`);
          }
        }

        if (!fs.existsSync(petsFile)) {
          failures.push(`Expected pets.json at ${ petsFile }`);
        } else {
          const pets = JSON.parse(fs.readFileSync(petsFile, 'utf8'));

          if (!pets.pets?.GET || !pets.pets?.POST) {
            failures.push(`Expected pets GET+POST, got: ${ JSON.stringify(pets.pets) }`);
          } else {
            if (pets.pets.GET.nameResponse !== 'success_200') {
              failures.push(
                `Expected nameResponse success_200, got ${ pets.pets.GET.nameResponse }`
              );
            }
            const names = pets.pets.GET.responses.map((r) => r.name).sort();
            if (!names.includes('success_200') || !names.includes('error_500')) {
              failures.push(`Expected success_200 and error_500 in GET responses: ${ names }`);
            }
            if (pets.pets.GET.responses.find((r) => r.name === 'success_200')?.body?.pets?.[0]?.name !== 'doggie') {
              failures.push('Expected example body for GET /pets');
            }
          }

          if (!pets['pets/:petId']?.GET) {
            failures.push('Expected pets/:petId GET from {petId} path param');
          } else {
            const getOne = pets['pets/:petId'].GET;
            if (getOne.nameResponse !== 'success_200') {
              failures.push('Expected pets/:petId nameResponse success_200');
            }
            const error404 = getOne.responses.find((r) => r.name === 'error_404');
            if (!error404 || error404.statusCode !== 404) {
              failures.push('Expected error_404 response on pets/:petId');
            }
          }

          if (pets.pets?.HEAD) {
            failures.push('HEAD must not be imported');
          }
        }

        if (!fs.existsSync(storeFile)) {
          failures.push(`Expected store.json at ${ storeFile }`);
        } else {
          const store = JSON.parse(fs.readFileSync(storeFile, 'utf8'));
          if (!store['store/inventory']?.GET) {
            failures.push(`Expected store/inventory GET, got: ${ JSON.stringify(store) }`);
          }
        }

        const joined = logs.join('\n');
        if (!joined.includes('OpenAPI import ready')) {
          failures.push(`Expected success log. Logs:\n${ joined }`);
        }
        if (!joined.includes('/api/v1')) {
          failures.push(`Expected prefix log /api/v1. Logs:\n${ joined }`);
        }
        if (!joined.includes('HEAD')) {
          failures.push(`Expected HEAD skip warning. Logs:\n${ joined }`);
        }
        if (!joined.includes('Next:') || !joined.includes('mock-server start')) {
          failures.push(`Expected Next: footer with mock-server start. Logs:\n${ joined }`);
        }

        // --no-split-tags with server prefix → single folder + mock.config
        logs.length = 0;
        await importOpenApi({
          path: 'api-mocks-single',
          openapi: openapiPath,
          splitTags: false,
          out: 'from-openapi',
          overwrite: true
        });

        const singleConfig = path.join(workspaceDir, 'api-mocks-single', 'mock.config.json');
        const single = path.join(workspaceDir, 'api-mocks-single', 'from-openapi', 'from-openapi.json');
        if (!fs.existsSync(singleConfig) || !fs.existsSync(single)) {
          failures.push('Expected mock.config + from-openapi/from-openapi.json with --no-split-tags');
        } else {
          const parsed = JSON.parse(fs.readFileSync(single, 'utf8'));
          if (!parsed.pets || !parsed['store/inventory']) {
            failures.push('Single file should contain pets and store/inventory endpoints');
          }
          const cfg = JSON.parse(fs.readFileSync(singleConfig, 'utf8'));
          if (cfg.folders?.['from-openapi']?.prefix !== '/api/v1') {
            failures.push(`Expected from-openapi folder prefix /api/v1, got: ${ JSON.stringify(cfg) }`);
          }
        }

        // --no-server-prefix → flat root files (no mock.config)
        logs.length = 0;
        await importOpenApi({
          path: 'api-mocks-flat',
          openapi: openapiPath,
          serverPrefix: false,
          overwrite: true
        });

        const flatPets = path.join(workspaceDir, 'api-mocks-flat', 'pets.json');
        const flatConfig = path.join(workspaceDir, 'api-mocks-flat', 'mock.config.json');
        if (!fs.existsSync(flatPets)) {
          failures.push('Expected flat pets.json with --no-server-prefix');
        }
        if (fs.existsSync(flatConfig)) {
          failures.push('Did not expect mock.config.json with --no-server-prefix');
        }

        // Swagger 2 rejection
        logs.length = 0;
        process.exitCode = 0;
        await importOpenApi({
          path: 'api-mocks',
          openapi: path.join(FIXTURES, 'swagger-2.json'),
          overwrite: true
        });

        if (!logs.join('\n').includes('Swagger 2.0 is not supported')) {
          failures.push(`Expected Swagger 2 rejection. Logs:\n${ logs.join('\n') }`);
        }

        // Mapper: hyphen param imported; dot param skipped; routePrefix from servers
        const document = await loadOpenApiDocument(openapiPath);
        const mapped = openApiToMock(document, { splitTags: true });
        const petsBundle = mapped.bundles.find((bundle) => bundle.fileName === 'pets');
        if (!petsBundle?.mock['items/:item-id']?.GET) {
          failures.push('Expected items/:item-id to be imported (hyphen in param name)');
        }
        const weird = mapped.warnings.some((w) =>
          w.includes('items/:item.id') && w.includes('not a valid mock endpoint')
        );
        if (!weird) {
          failures.push(`Expected invalid path warning for :item.id, got: ${ mapped.warnings.join(' | ') }`);
        }
        if (mapped.routePrefix !== '/api/v1') {
          failures.push(`Expected routePrefix /api/v1, got ${ mapped.routePrefix }`);
        }
      } finally {
        console.log = originalLog;
        process.chdir(previousCwd);
        process.exitCode = previousExitCode;
        cleanup();
      }

      return failures;
    }
  })
};
