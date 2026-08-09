'use strict';

const fs = require('fs');
const path = require('path');
const { runUnitUseCase, PROJECT_ROOT } = require('../../lib/execute-mock-file');
const { createWorkspace } = require('../../lib/server-harness');
const { stripAnsi } = require('../../lib/strip-ansi');

const FIXTURES = path.join(PROJECT_ROOT, 'tests/e2e/fixtures/openapi');

/**
 * @param {Record<string, unknown>} actual
 * @param {Record<string, unknown>} expected
 * @param {string} label
 * @returns {string[]}
 */
function expectDeepEqual(actual, expected, label) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) {
    return [`${ label }: expected ${ e }, got ${ a }`];
  }
  return [];
}

module.exports = {
  name: 'unit/import-openapi-request',
  description: 'import maps OpenAPI requestBody/parameters to request.*; edges, warnings, --no-request',
  run: () => runUnitUseCase({
    name: 'unit/import-openapi-request',
    description: 'import maps OpenAPI requestBody/parameters to request.*; edges, warnings, --no-request',
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
      const { schemaToFieldRule, buildOperationRequest } = require(
        path.join(PROJECT_ROOT, 'dist/src/cli/commands/import/schema-to-request.js')
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

        // Direct mapper: schema rules
        const schemaWarnings = [];
        const emailRule = schemaToFieldRule(
          { type: 'string', format: 'email', minLength: 3 },
          schemaWarnings,
          'email'
        );
        failures.push(...expectDeepEqual(
          emailRule,
          { type: 'string', minLength: 3, format: 'email' },
          'schemaToFieldRule email'
        ));

        const intRule = schemaToFieldRule(
          { type: 'integer', minimum: 0, maximum: 10 },
          schemaWarnings,
          'age'
        );
        failures.push(...expectDeepEqual(
          intRule,
          { type: 'number', min: 0, max: 10 },
          'schemaToFieldRule integer→number'
        ));

        const uriWarnings = [];
        const uriRule = schemaToFieldRule(
          { type: 'string', format: 'uri' },
          uriWarnings,
          'link'
        );
        failures.push(...expectDeepEqual(
          uriRule,
          { type: 'string', format: 'url' },
          'schemaToFieldRule uri→url'
        ));

        const oneOfWarnings = [];
        const oneOfRule = schemaToFieldRule(
          {
            oneOf: [
              {
                type: 'object',
                required: ['kind'],
                properties: { kind: { type: 'string', enum: ['cat'] } }
              },
              {
                type: 'object',
                required: ['kind'],
                properties: { kind: { type: 'string', enum: ['dog'] } }
              }
            ]
          },
          oneOfWarnings,
          'branch'
        );
        if (!oneOfWarnings.some((w) => w.includes('oneOf'))) {
          failures.push(`Expected oneOf warning, got: ${ oneOfWarnings.join(' | ') }`);
        }
        if (!oneOfRule?.properties?.kind) {
          failures.push(`Expected oneOf first-branch properties, got: ${ JSON.stringify(oneOfRule) }`);
        }

        // anyOf → first branch + warning
        const anyOfWarnings = [];
        const anyOfRule = schemaToFieldRule(
          {
            anyOf: [
              {
                type: 'object',
                required: ['kind'],
                properties: { kind: { type: 'string', enum: ['a'] } }
              },
              {
                type: 'object',
                required: ['kind'],
                properties: { kind: { type: 'string', enum: ['b'] } }
              }
            ]
          },
          anyOfWarnings,
          'any'
        );
        if (!anyOfWarnings.some((w) => w.includes('anyOf'))) {
          failures.push(`Expected anyOf warning, got: ${ anyOfWarnings.join(' | ') }`);
        }
        failures.push(...expectDeepEqual(
          anyOfRule?.properties?.kind,
          { type: 'string', enum: ['a'] },
          'anyOf first-branch kind'
        ));

        // allOf merge
        const allOfWarnings = [];
        const allOfRule = schemaToFieldRule(
          {
            allOf: [
              {
                type: 'object',
                required: ['id'],
                properties: { id: { type: 'string' } }
              },
              {
                type: 'object',
                properties: { label: { type: 'string' } }
              }
            ]
          },
          allOfWarnings,
          'merged'
        );
        if (!allOfRule?.properties?.id || !allOfRule?.properties?.['label?']) {
          failures.push(`Expected allOf merge id + label?, got: ${ JSON.stringify(allOfRule) }`);
        }

        // date-time → date + warning
        const dateWarnings = [];
        const dateRule = schemaToFieldRule(
          { type: 'string', format: 'date-time' },
          dateWarnings,
          'when'
        );
        failures.push(...expectDeepEqual(
          dateRule,
          { type: 'string', format: 'date' },
          'date-time mapped to date'
        ));
        if (!dateWarnings.some((w) => w.includes('date-time') && w.includes('date'))) {
          failures.push(`Expected date-time mapping warning, got: ${ dateWarnings.join(' | ') }`);
        }

        // Unsupported format → omitted + warning
        const formatWarnings = [];
        const hostnameRule = schemaToFieldRule(
          { type: 'string', format: 'hostname' },
          formatWarnings,
          'host'
        );
        failures.push(...expectDeepEqual(
          hostnameRule,
          { type: 'string' },
          'unsupported format hostname omitted'
        ));
        if (!formatWarnings.some((w) => w.includes('unsupported format') && w.includes('hostname'))) {
          failures.push(`Expected unsupported format warning, got: ${ formatWarnings.join(' | ') }`);
        }

        // Unknown schema type
        const typeWarnings = [];
        const unknownType = schemaToFieldRule(
          { type: 'not-a-real-type' },
          typeWarnings,
          'weird'
        );
        if (unknownType !== null) {
          failures.push(`Expected unsupported schema type → null, got: ${ JSON.stringify(unknownType) }`);
        }
        if (!typeWarnings.some((w) => w.includes('unsupported schema type'))) {
          failures.push(`Expected unsupported schema type warning, got: ${ typeWarnings.join(' | ') }`);
        }

        // Circular schema → skip cyclic property + warning
        const circular = { type: 'object', properties: {} };
        circular.properties.self = circular;
        const circularWarnings = [];
        const circularRule = schemaToFieldRule(circular, circularWarnings, 'loop');
        if (!circularWarnings.some((w) => w.includes('circular schema'))) {
          failures.push(`Expected circular schema warning, got: ${ circularWarnings.join(' | ') }`);
        }
        if (circularRule?.properties?.self || circularRule?.properties?.['self?']) {
          failures.push(
            `Circular property must be omitted, got: ${ JSON.stringify(circularRule) }`
          );
        }

        // Depth limit (>6) → warning on deep nest
        let deep = { type: 'string' };
        for (let i = 0; i < 8; i += 1) {
          deep = { type: 'object', properties: { nest: deep }, required: ['nest'] };
        }
        const depthWarnings = [];
        schemaToFieldRule(deep, depthWarnings, 'deep');
        if (!depthWarnings.some((w) => w.includes('depth limit'))) {
          failures.push(`Expected depth limit warning, got: ${ depthWarnings.join(' | ') }`);
        }

        // Non-object / no-schema requestBody edges (fixture)
        const edgesPath = path.join(FIXTURES, 'pets-request-edges.yaml');
        const edgesDoc = await loadOpenApiDocument(edgesPath);
        const edgesMapped = openApiToMock(edgesDoc, { splitTags: true, includeRequest: true });
        const edgesBundle = edgesMapped.bundles.find((bundle) => bundle.fileName === 'edges');
        if (!edgesBundle) {
          failures.push('Expected edges bundle from pets-request-edges.yaml');
        } else {
          if (edgesBundle.mock['array-body']?.POST?.request?.payload) {
            failures.push('array requestBody must not become payload field map');
          }
          if (!edgesMapped.warnings.some((w) => w.includes('non-object requestBody'))) {
            failures.push(
              `Expected non-object requestBody warning, got: ${ edgesMapped.warnings.join(' | ') }`
            );
          }

          if (edgesBundle.mock['no-schema']?.POST?.request?.payload) {
            failures.push('requestBody without schema must skip payload');
          }
          if (!edgesMapped.warnings.some((w) => w.includes('no schema'))) {
            failures.push(
              `Expected no-schema requestBody warning, got: ${ edgesMapped.warnings.join(' | ') }`
            );
          }

          const weird = edgesBundle.mock['weird-format']?.POST;
          if (!weird?.request?.payload?.code) {
            failures.push('weird-format should still map code as string');
          } else if (weird.request.payload.code.format) {
            failures.push('hostname format must be omitted on code field');
          }
          if (!edgesMapped.warnings.some((w) => w.includes('hostname'))) {
            failures.push(
              `Expected hostname format warning from fixture, got: ${ edgesMapped.warnings.join(' | ') }`
            );
          }

          const formLogin = edgesBundle.mock['form-login']?.POST;
          if (formLogin?.request?.as !== 'form') {
            failures.push(`Expected form-login as:form, got: ${ JSON.stringify(formLogin?.request) }`);
          } else if (!formLogin.request.payload?.username || !formLogin.request.payload?.password) {
            failures.push('form-login payload must include username and password');
          }

          const allOfBody = edgesBundle.mock['allof-body']?.POST;
          if (!allOfBody?.request?.payload?.id || !allOfBody.request.payload?.['label?']) {
            failures.push(
              `Expected allof-body payload id + label?, got: ${ JSON.stringify(allOfBody?.request) }`
            );
          }

          if (!edgesMapped.warnings.some((w) => w.includes('anyOf'))) {
            failures.push(
              `Expected anyOf warning from fixture, got: ${ edgesMapped.warnings.join(' | ') }`
            );
          }
          const anyOfBody = edgesBundle.mock['anyof-body']?.POST;
          if (anyOfBody?.request?.payload?.kind?.enum?.[0] !== 'a') {
            failures.push(
              `Expected anyof-body first branch kind=a, got: ${ JSON.stringify(anyOfBody?.request) }`
            );
          }

          const dt = edgesBundle.mock['datetime-field']?.POST;
          if (dt?.request?.payload?.when?.format !== 'date') {
            failures.push(
              `Expected datetime-field when.format=date, got: ${ JSON.stringify(dt?.request) }`
            );
          }
          if (!edgesMapped.warnings.some((w) => w.includes('date-time'))) {
            failures.push(
              `Expected date-time warning from fixture, got: ${ edgesMapped.warnings.join(' | ') }`
            );
          }

          if (!edgesMapped.warnings.some((w) => w.includes('no JSON/form/multipart'))) {
            failures.push(
              `Expected xml-only content warning, got: ${ edgesMapped.warnings.join(' | ') }`
            );
          }
          if (!edgesBundle.mock['xml-only']?.POST?.request?.payload?.name) {
            failures.push('xml-only should still map object schema from first media');
          }

        }

        // Unresolved $ref paths (post-dereference leftovers / synthetic)
        const refParam = buildOperationRequest(
          {
            parameters: [{ $ref: '#/components/parameters/Missing' }]
          },
          undefined,
          { method: 'get', pathKey: 'ref-param' }
        );
        if (!refParam.warnings.some((w) => w.includes('unresolved parameter $ref'))) {
          failures.push(
            `Expected unresolved parameter $ref warning, got: ${ refParam.warnings.join(' | ') }`
          );
        }

        const refBody = buildOperationRequest(
          {
            requestBody: { $ref: '#/components/requestBodies/Missing' }
          },
          undefined,
          { method: 'post', pathKey: 'ref-body' }
        );
        if (!refBody.warnings.some((w) => w.includes('unresolved requestBody $ref'))) {
          failures.push(
            `Expected unresolved requestBody $ref warning, got: ${ refBody.warnings.join(' | ') }`
          );
        }

        const noSchemaParam = buildOperationRequest(
          {
            parameters: [{ name: 'q', in: 'query', required: false }]
          },
          undefined,
          { method: 'get', pathKey: 'no-schema-param' }
        );
        if (!noSchemaParam.warnings.some((w) => w.includes('no schema'))) {
          failures.push(
            `Expected parameter no schema warning, got: ${ noSchemaParam.warnings.join(' | ') }`
          );
        }

        const openapiPath = path.join(FIXTURES, 'pets-with-request.yaml');
        const document = await loadOpenApiDocument(openapiPath);
        const mapped = openApiToMock(document, { splitTags: true, includeRequest: true });
        const petsBundle = mapped.bundles.find((bundle) => bundle.fileName === 'pets');
        if (!petsBundle) {
          failures.push('Expected pets bundle from pets-with-request.yaml');
        } else {
          const post = petsBundle.mock.pets?.POST;
          if (!post?.request?.payload) {
            failures.push(`Expected POST /pets request.payload, got: ${ JSON.stringify(post?.request) }`);
          } else {
            const payload = post.request.payload;
            failures.push(...expectDeepEqual(
              payload.name,
              { type: 'string', minLength: 2, maxLength: 40 },
              'POST payload.name'
            ));
            failures.push(...expectDeepEqual(
              payload.email,
              { type: 'string', format: 'email' },
              'POST payload.email'
            ));
            if (!payload['tag?']) {
              failures.push('Expected optional tag? in payload');
            }
            failures.push(...expectDeepEqual(
              payload['age?'],
              { type: 'number', min: 0, max: 30 },
              'POST payload.age?'
            ));
            failures.push(...expectDeepEqual(
              payload['status?'],
              { type: 'string', enum: ['available', 'pending', 'sold'] },
              'POST payload.status?'
            ));
          }

          const list = petsBundle.mock.pets?.GET;
          if (!list?.request?.query || !list.request.headers) {
            failures.push(`Expected GET /pets request.query+headers, got: ${ JSON.stringify(list?.request) }`);
          } else {
            failures.push(...expectDeepEqual(
              list.request.query['status?'],
              { type: 'string', enum: ['available', 'pending', 'sold'] },
              'GET query.status?'
            ));
            failures.push(...expectDeepEqual(
              list.request.query['limit?'],
              { type: 'number', min: 1, max: 100 },
              'GET query.limit?'
            ));
            failures.push(...expectDeepEqual(
              list.request.headers['X-Request-Id?'],
              { type: 'string', format: 'uuid' },
              'GET headers.X-Request-Id?'
            ));
          }

          const getOne = petsBundle.mock['pets/:petId']?.GET;
          if (!getOne?.request?.query?.['verbose?']) {
            failures.push(
              `Expected path-level query verbose? on GET /pets/:petId, got: ${ JSON.stringify(getOne?.request) }`
            );
          }
          if (getOne?.request?.payload) {
            failures.push('GET /pets/:petId must not invent payload');
          }

          const upload = petsBundle.mock.uploads?.POST;
          if (upload?.request?.as !== 'multipart') {
            failures.push(`Expected uploads POST as multipart, got: ${ JSON.stringify(upload?.request) }`);
          } else if (upload.request.payload?.file?.type !== 'file') {
            failures.push(`Expected multipart file field type file, got: ${ JSON.stringify(upload.request.payload) }`);
          }

          const token = petsBundle.mock.token?.POST;
          if (token?.request?.as !== 'form') {
            failures.push(`Expected token POST as form, got: ${ JSON.stringify(token?.request) }`);
          } else if (!token.request.payload?.username || !token.request.payload?.password) {
            failures.push('token form payload must include username and password');
          }

          if (!mapped.warnings.some((w) => w.includes('cookie parameter'))) {
            failures.push(`Expected cookie parameter skip warning, got: ${ mapped.warnings.join(' | ') }`);
          }
          if (!mapped.warnings.some((w) => w.includes('oneOf'))) {
            failures.push(`Expected oneOf warning from /branch, got: ${ mapped.warnings.join(' | ') }`);
          }
        }

        // --no-request / includeRequest: false
        const noRequest = openApiToMock(document, { splitTags: true, includeRequest: false });
        const noPets = noRequest.bundles.find((bundle) => bundle.fileName === 'pets');
        if (noPets?.mock.pets?.POST?.request) {
          failures.push('includeRequest:false must omit request on POST /pets');
        }
        if (noPets?.mock.pets?.GET?.request) {
          failures.push('includeRequest:false must omit request on GET /pets');
        }

        // Full import write + --no-request via ImportOptions
        await importOpenApi({
          path: 'with-request',
          openapi: openapiPath,
          serverPrefix: false,
          overwrite: true
        });
        const written = path.join(workspaceDir, 'with-request', 'pets.json');
        if (!fs.existsSync(written)) {
          failures.push(`Expected written pets.json at ${ written }`);
        } else {
          const pets = JSON.parse(fs.readFileSync(written, 'utf8'));
          if (!pets.pets?.POST?.request?.payload?.email) {
            failures.push('Written import should include request.payload.email');
          }
        }

        logs.length = 0;
        await importOpenApi({
          path: 'without-request',
          openapi: openapiPath,
          serverPrefix: false,
          request: false,
          overwrite: true
        });
        const flat = path.join(workspaceDir, 'without-request', 'pets.json');
        if (!fs.existsSync(flat)) {
          failures.push('Expected pets.json with request:false');
        } else {
          const pets = JSON.parse(fs.readFileSync(flat, 'utf8'));
          if (pets.pets?.POST?.request || pets.pets?.GET?.request) {
            failures.push('request:false import must not write request blocks');
          }
        }

        // buildOperationRequest cookie warning unit
        const cookieBuilt = buildOperationRequest(
          {
            parameters: [
              { name: 'sid', in: 'cookie', schema: { type: 'string' } }
            ]
          },
          undefined,
          { method: 'get', pathKey: 'x' }
        );
        if (!cookieBuilt.warnings.some((w) => w.includes('cookie'))) {
          failures.push('buildOperationRequest should warn on cookie params');
        }
        if (cookieBuilt.request) {
          failures.push('cookie-only parameters must not produce request');
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
