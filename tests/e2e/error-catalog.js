'use strict';

/**
 * Inventory of project Errors / warnings.
 * Used by the e2e runner preflight (`lib/assert-error-catalog.js`).
 * Every entry MUST reference an existing e2e case via `caseName`.
 *
 * @typedef {object} ErrorCatalogEntry
 * @property {string} id
 * @property {string} message Substring that the case must assert/produce
 * @property {string} source
 * @property {'validation' | 'cli' | 'runtime' | 'init' | 'watch' | 'warning' | 'defensive' | 'http'} kind
 * @property {string} caseName Use-case `name` that covers this error
 */

/** @type {ErrorCatalogEntry[]} */
const ERROR_CATALOG = [
  // --- file / process ---
  {
    id: 'file.mocks-dir-missing',
    message: 'The directory named mocks does not exist',
    source: 'src/cli/commands/start/files.ts',
    kind: 'cli',
    caseName: 'system/mocks-dir-missing'
  },
  {
    id: 'file.no-files-found',
    message: 'No files found',
    source: 'src/cli/commands/start/files.ts',
    kind: 'cli',
    caseName: 'system/no-files-found'
  },
  {
    id: 'file.not-object',
    message: 'The file must contain a valid JSON object',
    source: 'src/cli/commands/start/process-file.ts',
    kind: 'validation',
    caseName: 'error/file-not-object'
  },
  {
    id: 'file.empty-endpoints',
    message: 'The file does not contain any endpoints',
    source: 'src/cli/commands/start/process-file.ts',
    kind: 'validation',
    caseName: 'error/file-empty-endpoints'
  },
  {
    id: 'file.syntax-error',
    message: 'JSON syntax error: Expected \',\' or \']\' after array element in JSON at position 244',
    source: 'src/cli/commands/start/process-file.ts',
    kind: 'validation',
    caseName: 'error/file-syntax-error'
  },
  // --- endpoint ---
  {
    id: 'endpoint.invalid-path',
    message: 'Invalid path. Allowed characters:',
    source: 'src/validators/endpoint.validator.ts',
    kind: 'validation',
    caseName: 'error/endpoint-errors'
  },
  {
    id: 'endpoint.not-object',
    message: 'Must be an object',
    source: 'src/validators/endpoint.validator.ts',
    kind: 'validation',
    caseName: 'error/endpoint-errors'
  },
  {
    id: 'endpoint.no-methods',
    message: 'Does not contain any HTTP methods',
    source: 'src/validators/endpoint.validator.ts',
    kind: 'validation',
    caseName: 'error/endpoint-errors'
  },

  // --- method ---
  {
    id: 'method.invalid',
    message: 'Invalid HTTP method. Valid methods: GET, POST, PUT, PATCH, DELETE',
    source: 'src/validators/method.validator.ts',
    kind: 'validation',
    caseName: 'error/method-errors'
  },
  {
    id: 'method.not-object',
    message: 'The method must be an object',
    source: 'src/validators/method.validator.ts',
    kind: 'validation',
    caseName: 'error/method-errors'
  },
  {
    id: 'method.missing-nameResponse',
    message: 'Missing property "nameResponse"',
    source: 'src/validators/method.validator.ts',
    kind: 'validation',
    caseName: 'error/method-errors'
  },
  {
    id: 'method.missing-responses',
    message: 'Missing property "responses"',
    source: 'src/validators/method.validator.ts',
    kind: 'validation',
    caseName: 'error/method-errors'
  },
  {
    id: 'method.responses-not-array',
    message: 'The "responses" property must be an array',
    source: 'src/validators/method.validator.ts',
    kind: 'validation',
    caseName: 'error/method-responses-not-array'
  },
  {
    id: 'method.responses-empty',
    message: 'The responses array is empty',
    source: 'src/validators/method.validator.ts',
    kind: 'validation',
    caseName: 'error/method-errors'
  },
  {
    id: 'method.nameResponse-missing',
    message: 'The "nameResponse" "NotFound" does not exist in responses',
    source: 'src/validators/method.validator.ts',
    kind: 'validation',
    caseName: 'error/method-errors'
  },

  // --- delay ---
  {
    id: 'delay.method-not-number',
    message: 'The "delay" "slow" is not a valid number',
    source: 'src/validators/delay.validator.ts',
    kind: 'validation',
    caseName: 'error/method-errors'
  },
  {
    id: 'delay.method-negative',
    message: 'The "delay" must be greater than or equal to 0',
    source: 'src/validators/delay.validator.ts',
    kind: 'validation',
    caseName: 'error/method-errors'
  },
  {
    id: 'delay.response-not-number',
    message: 'The "delay" "fast" is not a valid number',
    source: 'src/validators/delay.validator.ts',
    kind: 'validation',
    caseName: 'error/response-errors'
  },
  {
    id: 'delay.response-negative',
    message: 'The "delay" must be greater than or equal to 0',
    source: 'src/validators/delay.validator.ts',
    kind: 'validation',
    caseName: 'error/response-errors'
  },

  // --- response ---
  {
    id: 'response.not-object',
    message: 'The response must be an object',
    source: 'src/validators/response.validator.ts',
    kind: 'validation',
    caseName: 'error/response-errors'
  },
  {
    id: 'response.missing-name',
    message: 'Missing property "name"',
    source: 'src/validators/response.validator.ts',
    kind: 'validation',
    caseName: 'error/response-errors'
  },
  {
    id: 'response.missing-statusCode',
    message: 'Missing property "statusCode"',
    source: 'src/validators/response.validator.ts',
    kind: 'validation',
    caseName: 'error/response-errors'
  },
  {
    id: 'response.statusCode-not-number',
    message: 'The "statusCode" "not-a-number" is not a valid number',
    source: 'src/validators/response.validator.ts',
    kind: 'validation',
    caseName: 'error/response-errors'
  },
  {
    id: 'response.missing-body',
    message: 'Missing property "body"',
    source: 'src/validators/response.validator.ts',
    kind: 'validation',
    caseName: 'error/response-errors'
  },
  {
    id: 'response.headers-not-object',
    message: 'The "headers" property must be an object',
    source: 'src/validators/response.validator.ts',
    kind: 'validation',
    caseName: 'error/response-errors'
  },
  {
    id: 'response.statusCode-warning',
    message: 'The "statusCode" 299 is not a standard HTTP status code',
    source: 'src/validators/response.validator.ts',
    kind: 'warning',
    caseName: '11-status-codes-warnings'
  },

  // --- match ---
  {
    id: 'match.not-object',
    message: 'The "match" property must be an object',
    source: 'src/validators/response.validator.ts',
    kind: 'validation',
    caseName: 'error/match-errors'
  },
  {
    id: 'match.empty',
    message: 'The "match" property must include "params", "query", "body" and/or "call"',
    source: 'src/validators/response.validator.ts',
    kind: 'validation',
    caseName: 'error/match-errors'
  },
  {
    id: 'match.params-not-object',
    message: 'The "match.params" property must be an object',
    source: 'src/validators/response.validator.ts',
    kind: 'validation',
    caseName: 'error/match-errors'
  },
  {
    id: 'match.params-empty',
    message: 'The "match.params" property must not be empty',
    source: 'src/validators/response.validator.ts',
    kind: 'validation',
    caseName: 'error/match-errors'
  },
  {
    id: 'match.query-not-object',
    message: 'The "match.query" property must be an object',
    source: 'src/validators/response.validator.ts',
    kind: 'validation',
    caseName: 'error/match-errors'
  },
  {
    id: 'match.query-empty',
    message: 'The "match.query" property must not be empty',
    source: 'src/validators/response.validator.ts',
    kind: 'validation',
    caseName: 'error/match-errors'
  },
  {
    id: 'match.call-not-positive-integer',
    message: 'The "match.call" property must be a positive integer (>= 1) or an object',
    source: 'src/validators/response.validator.ts',
    kind: 'validation',
    caseName: 'error/match-errors'
  },
  {
    id: 'match.call-object-empty',
    message: 'The "match.call" object must include "index" and/or "reset": true',
    source: 'src/validators/response.validator.ts',
    kind: 'validation',
    caseName: 'error/match-errors'
  },
  {
    id: 'match.call-reset-only-needs-match',
    message: 'A "match.call" with only "reset": true must also include "params", "query" and/or "body"',
    source: 'src/validators/response.validator.ts',
    kind: 'validation',
    caseName: 'error/match-errors'
  },
  {
    id: 'match.call-by-inconsistent',
    message: 'All "match.call.by" values in a method must be identical',
    source: 'src/validators/method.validator.ts',
    kind: 'validation',
    caseName: 'error/match-errors'
  },
  {
    id: 'match.call-index-not-positive-integer',
    message: 'The "match.call.index" property must be a positive integer (>= 1)',
    source: 'src/validators/response.validator.ts',
    kind: 'validation',
    caseName: 'error/match-errors'
  },
  {
    id: 'match.call-loop-not-boolean',
    message: 'The "match.call.loop" property must be a boolean',
    source: 'src/validators/response.validator.ts',
    kind: 'validation',
    caseName: 'error/match-errors'
  },
  {
    id: 'match.call-reset-not-boolean',
    message: 'The "match.call.reset" property must be a boolean',
    source: 'src/validators/response.validator.ts',
    kind: 'validation',
    caseName: 'error/match-errors'
  },
  {
    id: 'match.call-by-exactly-one',
    message: 'The "match.call.by" property must include exactly one of "body", "query", or "params"',
    source: 'src/validators/response.validator.ts',
    kind: 'validation',
    caseName: 'error/match-errors'
  },
  {
    id: 'match.call-by-not-object',
    message: 'The "match.call.by" property must be an object',
    source: 'src/validators/response.validator.ts',
    kind: 'validation',
    caseName: 'error/match-errors'
  },
  {
    id: 'match.call-by-field-empty',
    message: 'The "match.call.by.body" property must be a non-empty string',
    source: 'src/validators/response.validator.ts',
    kind: 'validation',
    caseName: 'error/match-errors'
  },
  {
    id: 'match.call-loop-indexes-not-dense',
    message: 'When "match.call.loop" is true, "index" values should be contiguous from 1 to max',
    source: 'src/validators/method.validator.ts',
    kind: 'warning',
    caseName: '40-match-call'
  },

  // --- request validation (startup) ---
  {
    id: 'request.not-object',
    message: 'The "request" property must be an object',
    source: 'src/validators/request.validator.ts',
    kind: 'validation',
    caseName: 'error/request-errors'
  },
  {
    id: 'request.empty',
    message: 'The "request" property must include "body" and/or "query"',
    source: 'src/validators/request.validator.ts',
    kind: 'validation',
    caseName: 'error/request-errors'
  },
  {
    id: 'request.body-not-object',
    message: 'The "request.body" property must be an object',
    source: 'src/validators/request.validator.ts',
    kind: 'validation',
    caseName: 'error/request-errors'
  },
  {
    id: 'request.body-empty',
    message: 'The "request.body" property must not be empty',
    source: 'src/validators/request.validator.ts',
    kind: 'validation',
    caseName: 'error/request-errors'
  },
  {
    id: 'request.query-not-object',
    message: 'The "request.query" property must be an object',
    source: 'src/validators/request.validator.ts',
    kind: 'validation',
    caseName: 'error/request-errors'
  },
  {
    id: 'request.query-empty',
    message: 'The "request.query" property must not be empty',
    source: 'src/validators/request.validator.ts',
    kind: 'validation',
    caseName: 'error/request-errors'
  },
  {
    id: 'request.field-invalid',
    message: 'The "request.body.email" field must be a type string or a rule object with "type"',
    source: 'src/validators/request.validator.ts',
    kind: 'validation',
    caseName: 'error/request-errors'
  },
  {
    id: 'request.field-name-invalid',
    message: 'The "request.body" contains an invalid field name',
    source: 'src/validators/request.validator.ts',
    kind: 'validation',
    caseName: 'error/request-errors'
  },
  {
    id: 'request.type-invalid',
    message: 'The "request.body.email.type" must be one of: string, number, boolean, object, array',
    source: 'src/validators/request.validator.ts',
    kind: 'validation',
    caseName: 'error/request-errors'
  },
  {
    id: 'request.string-rules-type',
    message: 'The "request.body.age" string rules (minLength, maxLength, pattern, format) require type "string"',
    source: 'src/validators/request.validator.ts',
    kind: 'validation',
    caseName: 'error/request-errors'
  },
  {
    id: 'request.range-rules-type',
    message: 'The "request.body.name" range rules (min, max) require type "number"',
    source: 'src/validators/request.validator.ts',
    kind: 'validation',
    caseName: 'error/request-errors'
  },
  {
    id: 'request.array-rules-type',
    message: 'The "request.body.name" array rules (minItems, maxItems, items) require type "array"',
    source: 'src/validators/request.validator.ts',
    kind: 'validation',
    caseName: 'error/request-errors'
  },
  {
    id: 'request.properties-type',
    message: 'The "request.body.name.properties" requires type "object"',
    source: 'src/validators/request.validator.ts',
    kind: 'validation',
    caseName: 'error/request-errors'
  },
  {
    id: 'request.properties-empty',
    message: 'The "request.body.address.properties" must be a non-empty object',
    source: 'src/validators/request.validator.ts',
    kind: 'validation',
    caseName: 'error/request-errors'
  },
  {
    id: 'request.bound-negative',
    message: 'The "request.body.name.minLength" must be a non-negative number',
    source: 'src/validators/request.validator.ts',
    kind: 'validation',
    caseName: 'error/request-errors'
  },
  {
    id: 'request.pattern-invalid',
    message: 'The "request.body.code.pattern" is not a valid regular expression',
    source: 'src/validators/request.validator.ts',
    kind: 'validation',
    caseName: 'error/request-errors'
  },
  {
    id: 'request.pattern-empty',
    message: 'The "request.body.code.pattern" must be a non-empty string',
    source: 'src/validators/request.validator.ts',
    kind: 'validation',
    caseName: 'error/request-errors'
  },
  {
    id: 'request.format-invalid',
    message: 'The "request.body.email.format" must be one of: email, uuid, url, date',
    source: 'src/validators/request.validator.ts',
    kind: 'validation',
    caseName: 'error/request-errors'
  },
  {
    id: 'request.enum-empty',
    message: 'The "request.body.role.enum" must be a non-empty array',
    source: 'src/validators/request.validator.ts',
    kind: 'validation',
    caseName: 'error/request-errors'
  },
  {
    id: 'request.enum-values-invalid',
    message: 'The "request.body.role.enum" values must be strings or numbers',
    source: 'src/validators/request.validator.ts',
    kind: 'validation',
    caseName: 'error/request-errors'
  },
  {
    id: 'request.message-not-string',
    message: 'The "request.body.email.message" must be a string',
    source: 'src/validators/request.validator.ts',
    kind: 'validation',
    caseName: 'error/request-errors'
  },
  {
    id: 'request.invalid-response-missing',
    message: 'The "request.invalidResponse" "missing-error" does not exist in responses',
    source: 'src/validators/request.validator.ts',
    kind: 'validation',
    caseName: 'error/request-errors'
  },
  {
    id: 'request.invalid-response-empty',
    message: 'The "request.invalidResponse" must be a non-empty string',
    source: 'src/validators/request.validator.ts',
    kind: 'validation',
    caseName: 'error/request-errors'
  },
  {
    id: 'request.error-format',
    message: 'The "request.errorFormat" must be one of: array, map',
    source: 'src/validators/request.validator.ts',
    kind: 'validation',
    caseName: 'error/request-errors'
  },
  {
    id: 'request.error-detail-values',
    message: 'The "request.errorDetail" object values must be strings',
    source: 'src/validators/request.validator.ts',
    kind: 'validation',
    caseName: 'error/request-errors'
  },
  {
    id: 'request.error-detail-shape',
    message: 'The "request.errorDetail" must be a non-empty string or object',
    source: 'src/validators/request.validator.ts',
    kind: 'validation',
    caseName: 'error/request-errors'
  },
  {
    id: 'request.error-details-key',
    message: 'The "request.errorDetailsKey" must be a non-empty string',
    source: 'src/validators/request.validator.ts',
    kind: 'validation',
    caseName: 'error/request-errors'
  },

  // --- proxy validation ---
  {
    id: 'proxy.method-true-forbidden',
    message: 'The "proxy" must be a URL string or an object with "target"',
    source: 'src/validators/proxy.validator.ts',
    kind: 'validation',
    caseName: 'error/method-errors'
  },
  {
    id: 'proxy.invalid-url',
    message: 'The "proxy" must be a valid http or https URL',
    source: 'src/validators/proxy.validator.ts',
    kind: 'validation',
    caseName: 'error/proxy-errors'
  },
  {
    id: 'proxy.response-invalid-shape',
    message: 'The "proxy" must be a URL string, true, or an object with "target"',
    source: 'src/validators/proxy.validator.ts',
    kind: 'validation',
    caseName: 'error/proxy-errors'
  },
  {
    id: 'proxy.target-required',
    message: 'The "proxy.target" property is required',
    source: 'src/validators/proxy.validator.ts',
    kind: 'validation',
    caseName: 'error/proxy-errors'
  },
  {
    id: 'proxy.target-invalid',
    message: 'The "proxy.target" must be a valid http or https URL',
    source: 'src/validators/proxy.validator.ts',
    kind: 'validation',
    caseName: 'error/proxy-errors'
  },
  {
    id: 'proxy.path-not-string',
    message: 'The "proxy.path" must be a string',
    source: 'src/validators/proxy.validator.ts',
    kind: 'validation',
    caseName: 'error/proxy-errors'
  },

  // --- store ---
  {
    id: 'store.not-object',
    message: 'The "store" property must be an object',
    source: 'src/validators/store.validator.ts',
    kind: 'validation',
    caseName: 'error/store-errors'
  },
  {
    id: 'store.id-invalid',
    message: 'The "store.id" must be a non-empty string',
    source: 'src/validators/store.validator.ts',
    kind: 'validation',
    caseName: 'error/store-errors'
  },
  {
    id: 'store.unknown-key',
    message: 'The "store" property contains unknown key "foo"',
    source: 'src/validators/store.validator.ts',
    kind: 'validation',
    caseName: 'error/store-errors'
  },
  {
    id: 'store.seed-not-array',
    message: 'The "store.seed" property must be an array',
    source: 'src/validators/store.validator.ts',
    kind: 'validation',
    caseName: 'error/store-errors'
  },
  {
    id: 'store.seed-item-not-object',
    message: 'The "store.seed[0]" item must be an object',
    source: 'src/validators/store.validator.ts',
    kind: 'validation',
    caseName: 'error/store-errors'
  },
  {
    id: 'store.template-not-object',
    message: 'The "store.template" property must be an object',
    source: 'src/validators/store.validator.ts',
    kind: 'validation',
    caseName: 'error/store-errors'
  },
  {
    id: 'store.unique-type',
    message: 'The "store.unique" property must be an array or an object',
    source: 'src/validators/store.validator.ts',
    kind: 'validation',
    caseName: 'error/store-errors'
  },
  {
    id: 'store.unique-empty',
    message: 'The "store.unique" array must not be empty',
    source: 'src/validators/store.validator.ts',
    kind: 'validation',
    caseName: 'error/store-errors'
  },
  {
    id: 'store.unique-fields-missing',
    message: 'The "store.unique" object must include "fields"',
    source: 'src/validators/store.validator.ts',
    kind: 'validation',
    caseName: 'error/store-errors'
  },
  {
    id: 'store.key-type',
    message: 'The "store.key" must be a string, an array of strings, or an object',
    source: 'src/validators/store.validator.ts',
    kind: 'validation',
    caseName: 'error/store-errors'
  },
  {
    id: 'store.seed-duplicate-key',
    message: 'The "store.seed" contains duplicate key (id)',
    source: 'src/validators/store.validator.ts',
    kind: 'validation',
    caseName: 'error/store-errors'
  },
  {
    id: 'store.seed-duplicate-unique',
    message: 'The "store.seed" contains duplicate unique field "email"',
    source: 'src/validators/store.validator.ts',
    kind: 'validation',
    caseName: 'error/store-errors'
  },
  {
    id: 'store.unique-both-field-fields',
    message: 'The "store.unique.fields[0]" object cannot include both "field" and "fields"',
    source: 'src/validators/store.validator.ts',
    kind: 'validation',
    caseName: 'error/store-errors'
  },
  {
    id: 'store.unique-composite-empty',
    message: 'The "store.unique.fields[0].fields" must be a non-empty array of strings',
    source: 'src/validators/store.validator.ts',
    kind: 'validation',
    caseName: 'error/store-errors'
  },
  {
    id: 'store.unique-missing-field-or-fields',
    message: 'The "store.unique.fields[0]" object must include "field" or "fields"',
    source: 'src/validators/store.validator.ts',
    kind: 'validation',
    caseName: 'error/store-errors'
  },
  {
    id: 'store.seed-duplicate-unique-composite',
    message: 'The "store.seed" contains duplicate unique field "tenantId+email"',
    source: 'src/validators/store.validator.ts',
    kind: 'validation',
    caseName: 'error/store-errors'
  },
  {
    id: 'store.unique-fields-non-string',
    message: 'The "store.unique.fields[0].fields" must be a non-empty array of strings',
    source: 'src/validators/store.validator.ts',
    kind: 'validation',
    caseName: 'error/store-errors'
  },
  {
    id: 'store.unique-unknown-key',
    message: 'The "store.unique.fields[0]" property contains unknown key "foo"',
    source: 'src/validators/store.validator.ts',
    kind: 'validation',
    caseName: 'error/store-errors'
  },
  {
    id: 'store.unique-duplicate-constraint',
    message: 'The "store.unique.fields[1]" duplicates the unique constraint "email"',
    source: 'src/validators/store.validator.ts',
    kind: 'validation',
    caseName: 'error/store-errors'
  },
  {
    id: 'store.unique-redundant-string',
    message: 'The "store.unique.fields[0]" matches the store key and is redundant',
    source: 'src/validators/store.validator.ts',
    kind: 'validation',
    caseName: 'success/36-store-unique-redundant'
  },
  {
    id: 'store.unique-redundant-field',
    message: 'The "store.unique.fields[0].field" matches the store key and is redundant',
    source: 'src/validators/store.validator.ts',
    kind: 'validation',
    caseName: 'success/36-store-unique-redundant'
  },
  {
    id: 'store.unique-redundant-fields',
    message: 'The "store.unique.fields[0].fields" matches the store key and is redundant',
    source: 'src/validators/store.validator.ts',
    kind: 'validation',
    caseName: 'success/36-store-unique-redundant'
  },
  {
    id: 'http.store.409.unique-composite',
    message: 'DUPLICATE_TENANT_EMAIL',
    source: 'src/scripts/store.script.ts',
    kind: 'http',
    caseName: 'runtime/store-unique-composite'
  },
  {
    id: 'http.store.409.unique-composite-default',
    message: 'Duplicate value for unique fields "code+region"',
    source: 'src/scripts/store.script.ts',
    kind: 'http',
    caseName: 'runtime/store-unique-composite'
  },
  {
    id: 'http.store.409.unique-multi',
    message: 'DUPLICATE',
    source: 'src/scripts/store.script.ts',
    kind: 'http',
    caseName: 'runtime/store-unique-composite'
  },
  {
    id: 'store.action-requires-store',
    message: 'The "action" property requires a "store" on the endpoint',
    source: 'src/validators/action.validator.ts',
    kind: 'validation',
    caseName: 'error/store-errors'
  },
  {
    id: 'store.action-with-proxy',
    message: 'The "action" property cannot be used together with "proxy"',
    source: 'src/validators/action.validator.ts',
    kind: 'validation',
    caseName: 'error/store-errors'
  },
  {
    id: 'store.action-invalid',
    message: 'The "action" must be one of: list, get, create, update, patch, delete, restore',
    source: 'src/validators/action.validator.ts',
    kind: 'validation',
    caseName: 'error/store-errors'
  },
  {
    id: 'store.soft-delete-type',
    message: 'The "store.softDelete" property must be a boolean or an object',
    source: 'src/validators/store.validator.ts',
    kind: 'validation',
    caseName: 'error/store-errors'
  },
  {
    id: 'store.soft-delete-field',
    message: 'The "store.softDelete.field" must be a non-empty string',
    source: 'src/validators/store.validator.ts',
    kind: 'validation',
    caseName: 'error/store-errors'
  },
  {
    id: 'store.soft-delete-unknown-key',
    message: 'The "store.softDelete" property contains unknown key "foo"',
    source: 'src/validators/store.validator.ts',
    kind: 'validation',
    caseName: 'error/store-errors'
  },
  {
    id: 'store.soft-delete-overlap-key',
    message: 'The "store.softDelete.field" "id" cannot overlap store key fields',
    source: 'src/validators/store.validator.ts',
    kind: 'validation',
    caseName: 'error/store-errors'
  },
  {
    id: 'store.soft-delete-overlap-unique',
    message: 'The "store.softDelete.field" "email" cannot overlap store unique fields',
    source: 'src/validators/store.validator.ts',
    kind: 'validation',
    caseName: 'error/store-errors'
  },
  {
    id: 'store.restore-requires-soft-delete',
    message: 'The "action" "restore" requires "store.softDelete" to be enabled',
    source: 'src/validators/action.validator.ts',
    kind: 'validation',
    caseName: 'error/store-errors'
  },
  {
    id: 'store.relations-type',
    message: 'The "store.relations" property must be an object',
    source: 'src/validators/store.validator.ts',
    kind: 'validation',
    caseName: 'error/store-errors'
  },
  {
    id: 'store.relations-unknown-key',
    message: 'The "store.relations.userId" property contains unknown key "foo"',
    source: 'src/validators/store.validator.ts',
    kind: 'validation',
    caseName: 'error/store-errors'
  },
  {
    id: 'store.relations-missing-store',
    message: 'The "store.relations.userId.store" must be a non-empty string',
    source: 'src/validators/store.validator.ts',
    kind: 'validation',
    caseName: 'error/store-errors'
  },
  {
    id: 'store.relations-on-delete',
    message: 'The "store.relations.userId.onDelete" must be one of: restrict, cascade, setNull',
    source: 'src/validators/store.validator.ts',
    kind: 'validation',
    caseName: 'error/store-errors'
  },
  {
    id: 'store.relations-required-setnull',
    message: 'The "store.relations.userId" cannot use onDelete "setNull" when required is true',
    source: 'src/validators/store.validator.ts',
    kind: 'validation',
    caseName: 'error/store-errors'
  },
  {
    id: 'store.relations-overlap-key',
    message: 'The "store.relations.id" local field cannot overlap store key fields',
    source: 'src/validators/store.validator.ts',
    kind: 'validation',
    caseName: 'error/store-errors'
  },
  {
    id: 'store.relations-embedas-same',
    message: 'The "store.relations.userId.embed.as" cannot be the same as a local relation field',
    source: 'src/validators/store.validator.ts',
    kind: 'validation',
    caseName: 'error/store-errors'
  },
  {
    id: 'store.relations-unknown-target',
    message: 'The store relation "rel-unknown-target.userId" targets unknown store "does-not-exist-store"',
    source: 'src/validators/store.validator.ts',
    kind: 'validation',
    caseName: 'error/store-errors'
  },
  {
    id: 'store.relations-composite-target',
    message: 'The store relation "rel-to-composite.parentId" targets composite key store "rel-composite-target" and must set "join.from" and "join.to"',
    source: 'src/validators/store.validator.ts',
    kind: 'validation',
    caseName: 'error/store-errors'
  },
  {
    id: 'store.relations-composite-length',
    message: 'The "store.relations.orderRef.join.from" and "store.relations.orderRef.join.to" must have the same length',
    source: 'src/validators/store.validator.ts',
    kind: 'validation',
    caseName: 'error/store-errors'
  },
  {
    id: 'store.relations-many-reverse',
    message: 'The store relation "rel-many-parent.children" requires store "rel-many-child-missing" to declare a type "one" relation to "rel-many-parent" with join.from [parentId]',
    source: 'src/validators/store.validator.ts',
    kind: 'validation',
    caseName: 'error/store-errors'
  },
  {
    id: 'store.relations-bad-seed-fk',
    message: 'The store "rel-bad-seed-fk" seed[0] relation "userId" references missing or soft-deleted "rel-target-parent" record',
    source: 'src/validators/store.validator.ts',
    kind: 'validation',
    caseName: 'error/store-errors'
  },
  {
    id: 'store.relations-empty-name',
    message: 'The "store.relations" property contains an empty field name',
    source: 'src/validators/store.validator.ts',
    kind: 'validation',
    caseName: 'error/store-relations-errors'
  },
  {
    id: 'store.relations-empty-shorthand',
    message: 'The "store.relations.userId" must be a non-empty string or an object',
    source: 'src/validators/store.validator.ts',
    kind: 'validation',
    caseName: 'error/store-relations-errors'
  },
  {
    id: 'store.relations-type-value',
    message: 'The "store.relations.userId.type" must be one of: one, many',
    source: 'src/validators/store.validator.ts',
    kind: 'validation',
    caseName: 'error/store-relations-errors'
  },
  {
    id: 'store.relations-many-forbidden-keys',
    message: 'The "store.relations.posts" with type "many" cannot include required, onDelete, or conflict',
    source: 'src/validators/store.validator.ts',
    kind: 'validation',
    caseName: 'error/store-relations-errors'
  },
  {
    id: 'store.relations-many-missing-join',
    message: 'The "store.relations.posts" with type "many" must include "join" with "from"',
    source: 'src/validators/store.validator.ts',
    kind: 'validation',
    caseName: 'error/store-relations-errors'
  },
  {
    id: 'store.relations-many-join-to',
    message: 'The "store.relations.posts.join" with type "many" cannot include "to"',
    source: 'src/validators/store.validator.ts',
    kind: 'validation',
    caseName: 'error/store-relations-errors'
  },
  {
    id: 'store.relations-many-join-from',
    message: 'The "store.relations.posts.join.from" must be a non-empty string or string array',
    source: 'src/validators/store.validator.ts',
    kind: 'validation',
    caseName: 'error/store-relations-errors'
  },
  {
    id: 'store.relations-join-not-object',
    message: 'The "store.relations.userId.join" must be an object',
    source: 'src/validators/store.validator.ts',
    kind: 'validation',
    caseName: 'error/store-relations-errors'
  },
  {
    id: 'store.relations-join-unknown-key',
    message: 'The "store.relations.userId.join" property contains unknown key "via"',
    source: 'src/validators/store.validator.ts',
    kind: 'validation',
    caseName: 'error/store-relations-errors'
  },
  {
    id: 'store.relations-join-from-invalid',
    message: 'The "store.relations.userId.join.from" must be a non-empty string or string array',
    source: 'src/validators/store.validator.ts',
    kind: 'validation',
    caseName: 'error/store-relations-errors'
  },
  {
    id: 'store.relations-join-to-invalid',
    message: 'The "store.relations.userId.join.to" must be a non-empty string or string array',
    source: 'src/validators/store.validator.ts',
    kind: 'validation',
    caseName: 'error/store-relations-errors'
  },
  {
    id: 'store.relations-required-type',
    message: 'The "store.relations.userId.required" must be a boolean',
    source: 'src/validators/store.validator.ts',
    kind: 'validation',
    caseName: 'error/store-relations-errors'
  },
  {
    id: 'store.relations-overlap-softdelete',
    message: 'The "store.relations.deletedAt" local field cannot overlap store.softDelete.field',
    source: 'src/validators/store.validator.ts',
    kind: 'validation',
    caseName: 'error/store-relations-errors'
  },
  {
    id: 'store.relations-overlap-softdelete-join',
    message: 'The "store.relations.userId" local field "deletedAt" cannot overlap store.softDelete.field',
    source: 'src/validators/store.validator.ts',
    kind: 'validation',
    caseName: 'error/store-relations-errors'
  },
  {
    id: 'store.relations-embed-empty',
    message: 'The "store.relations.userId.embed" must be a non-empty string or { "as": "..." }',
    source: 'src/validators/store.validator.ts',
    kind: 'validation',
    caseName: 'error/store-relations-errors'
  },
  {
    id: 'store.relations-embed-unknown-key',
    message: 'The "store.relations.userId.embed" property contains unknown key "foo"',
    source: 'src/validators/store.validator.ts',
    kind: 'validation',
    caseName: 'error/store-relations-errors'
  },
  {
    id: 'store.relations-embed-as-empty',
    message: 'The "store.relations.userId.embed.as" must be a non-empty string',
    source: 'src/validators/store.validator.ts',
    kind: 'validation',
    caseName: 'error/store-relations-errors'
  },
  {
    id: 'store.relations-on-delete-type',
    message: 'The "store.relations.userId.onDelete" must be one of: restrict, cascade, setNull, or an object with "action"',
    source: 'src/validators/store.validator.ts',
    kind: 'validation',
    caseName: 'error/store-relations-errors'
  },
  {
    id: 'store.relations-on-delete-unknown-key',
    message: 'The "store.relations.userId.onDelete" property contains unknown key "foo"',
    source: 'src/validators/store.validator.ts',
    kind: 'validation',
    caseName: 'error/store-relations-errors'
  },
  {
    id: 'store.relations-on-delete-action',
    message: 'The "store.relations.userId.onDelete.action" must be one of: restrict, cascade, setNull',
    source: 'src/validators/store.validator.ts',
    kind: 'validation',
    caseName: 'error/store-relations-errors'
  },
  {
    id: 'store.relations-conflict-type',
    message: 'The "store.relations.userId.conflict" property must be an object',
    source: 'src/validators/store.validator.ts',
    kind: 'validation',
    caseName: 'error/store-relations-errors'
  },
  {
    id: 'store.relations-conflict-unknown-key',
    message: 'The "store.relations.userId.conflict" property contains unknown key "foo"',
    source: 'src/validators/store.validator.ts',
    kind: 'validation',
    caseName: 'error/store-relations-errors'
  },
  {
    id: 'store.relations-conflict-response-empty',
    message: 'The "store.relations.userId.conflict.response" must be a non-empty string',
    source: 'src/validators/store.validator.ts',
    kind: 'validation',
    caseName: 'error/store-relations-errors'
  },
  {
    id: 'store.relations-on-delete-conflict-response',
    message: 'The "store.relations.userId.onDelete.conflict.response" must be a non-empty string',
    source: 'src/validators/store.validator.ts',
    kind: 'validation',
    caseName: 'error/store-relations-errors'
  },
  {
    id: 'store.relations-embed-conflict-key',
    message: 'The store relation "rel-embed-conflict-key.userId.embed" "id" conflicts with an existing field',
    source: 'src/validators/store.validator.ts',
    kind: 'validation',
    caseName: 'error/store-relations-errors'
  },
  {
    id: 'store.relations-embed-conflict-softdelete',
    message: 'The store relation "rel-embed-conflict-softdelete.userId.embed" "deletedAt" conflicts with an existing field',
    source: 'src/validators/store.validator.ts',
    kind: 'validation',
    caseName: 'error/store-relations-errors'
  },
  {
    id: 'store.relations-many-join-len',
    message: 'The store relation "rel-many-len-parent.children.join.from" length must match this store key (tenantId, id)',
    source: 'src/validators/store.validator.ts',
    kind: 'validation',
    caseName: 'error/store-relations-errors'
  },
  {
    id: 'store.relations-join-to-mismatch',
    message: 'The store relation "rel-join-to-mismatch.userId.join.to" must match target key [id]',
    source: 'src/validators/store.validator.ts',
    kind: 'validation',
    caseName: 'error/store-relations-errors'
  },
  {
    id: 'store.relations-join-len-vs-target',
    message: 'The store relation "rel-join-len-vs-target.refs" join.from/join.to length mismatch',
    source: 'src/validators/store.validator.ts',
    kind: 'validation',
    caseName: 'error/store-relations-errors'
  },
  {
    id: 'store.relations-seed-missing-required',
    message: 'The store "rel-seed-missing-required" seed[0] is missing required relation "userId"',
    source: 'src/validators/store.validator.ts',
    kind: 'validation',
    caseName: 'error/store-relations-errors'
  },
  {
    id: 'store.relations-seed-incomplete-fk',
    message: 'The store "rel-seed-incomplete-fk" seed[0] relation "orderRef" has incomplete foreign key values',
    source: 'src/validators/store.validator.ts',
    kind: 'validation',
    caseName: 'error/store-relations-errors'
  },
  {
    id: 'store.relations-seed-soft-deleted-fk',
    message: 'The store "rel-seed-soft-deleted-fk" seed[0] relation "userId" references missing or soft-deleted "rel-target-soft" record',
    source: 'src/validators/store.validator.ts',
    kind: 'validation',
    caseName: 'error/store-relations-errors'
  },
  {
    id: 'store.relations-missing-conflict-response',
    message: 'The store conflict response "missing-rel-fk" does not exist in responses',
    source: 'src/cli/commands/start/process-file.ts',
    kind: 'validation',
    caseName: 'error/store-relations-errors'
  },
  {
    id: 'store.relations-missing-restrict-conflict',
    message: 'The store conflict response "missing-restrict-conflict" does not exist in responses',
    source: 'src/cli/commands/start/process-file.ts',
    kind: 'validation',
    caseName: 'error/store-relations-errors'
  },
  {
    id: 'http.store.relations.invalid-fk',
    message: 'INVALID_USER',
    source: 'src/scripts/store-relations.script.ts',
    kind: 'http',
    caseName: 'runtime/store-relations'
  },
  {
    id: 'http.store.relations.restrict',
    message: 'Cannot delete: related records exist',
    source: 'src/scripts/store-relations.script.ts',
    kind: 'http',
    caseName: 'runtime/store-relations'
  },
  {
    id: 'http.store.relations.partial-fk',
    message: 'INCOMPLETE_ORDER_REF',
    source: 'src/scripts/store-relations.script.ts',
    kind: 'http',
    caseName: 'runtime/store-relations-matrix'
  },
  {
    id: 'http.store.relations.expand-depth',
    message: 'expand-depth-capped',
    source: 'src/scripts/store-relations.script.ts',
    kind: 'http',
    caseName: 'runtime/store-relations-matrix'
  },
  {
    id: 'http.store.relations.list-expand',
    message: 'list-filter-expand',
    source: 'src/scripts/store-relations.script.ts',
    kind: 'http',
    caseName: 'runtime/store-relations-matrix'
  },
  {
    id: 'http.store.relations.include-deleted-expand',
    message: 'includeDeleted-expand',
    source: 'src/scripts/store-relations.script.ts',
    kind: 'http',
    caseName: 'runtime/store-relations-matrix'
  },
  {
    id: 'http.store.relations.unique-fk-combo',
    message: 'UNIQUE_AND_FK',
    source: 'src/scripts/store-relations.script.ts',
    kind: 'http',
    caseName: 'runtime/store-relations-matrix'
  },
  {
    id: 'http.store.relations.request-blocks-store',
    message: 'request-before-fk',
    source: 'src/scripts/store-relations.script.ts',
    kind: 'http',
    caseName: 'runtime/store-relations-matrix'
  },
  {
    id: 'http.store.relations.persist-fk',
    message: 'persist-relations',
    source: 'src/scripts/store-relations.script.ts',
    kind: 'http',
    caseName: 'runtime/store-relations-persist'
  },
  {
    id: 'store.action-body-ignored',
    message: 'The "body" property is ignored when "action" is set',
    source: 'src/validators/action.validator.ts',
    kind: 'warning',
    caseName: 'success/27-store-matrix'
  },
  {
    id: 'store.action-delete-status-ignored',
    message: 'The "statusCode" is ignored for action "delete" (always responds with 204)',
    source: 'src/validators/action.validator.ts',
    kind: 'warning',
    caseName: 'success/27-store-matrix'
  },
  {
    id: 'store.conflict-response-missing',
    message: 'The store conflict response "duplicate-email" does not exist in responses',
    source: 'src/cli/commands/start/process-file.ts',
    kind: 'validation',
    caseName: 'error/store-errors'
  },
  {
    id: 'store.notFound-type',
    message: 'The "store.notFound" property must be an object',
    source: 'src/validators/store.validator.ts',
    kind: 'validation',
    caseName: 'error/store-errors'
  },
  {
    id: 'store.notFound-unknown-key',
    message: 'The "store.notFound" property contains unknown key "foo"',
    source: 'src/validators/store.validator.ts',
    kind: 'validation',
    caseName: 'error/store-errors'
  },
  {
    id: 'store.notFound-missing-response',
    message: 'The "store.notFound" object must include "response"',
    source: 'src/validators/store.validator.ts',
    kind: 'validation',
    caseName: 'error/store-errors'
  },
  {
    id: 'store.notFound-empty-response',
    message: 'The "store.notFound.response" must be a non-empty string',
    source: 'src/validators/store.validator.ts',
    kind: 'validation',
    caseName: 'error/store-errors'
  },
  {
    id: 'store.notFound-response-missing',
    message: 'The store notFound response "missing-item" does not exist in responses',
    source: 'src/cli/commands/start/process-file.ts',
    kind: 'validation',
    caseName: 'error/store-errors'
  },
  {
    id: 'store.reference-missing',
    message: 'The store "does-not-exist" is referenced but not defined',
    source: 'src/cli/commands/start/process-file.ts',
    kind: 'validation',
    caseName: 'error/store-errors'
  },
  {
    id: 'store.persist-type',
    message: 'The "store.persist" property must be a boolean or an object',
    source: 'src/validators/store.validator.ts',
    kind: 'validation',
    caseName: 'error/store-errors'
  },
  {
    id: 'store.persist-enabled',
    message: 'The "store.persist.enabled" must be a boolean',
    source: 'src/validators/store.validator.ts',
    kind: 'validation',
    caseName: 'error/store-errors'
  },
  {
    id: 'store.persist-file',
    message: 'The "store.persist.file" must be a non-empty string',
    source: 'src/validators/store.validator.ts',
    kind: 'validation',
    caseName: 'error/store-errors'
  },
  {
    id: 'store.persist.file-escape',
    message: 'The "store.persist.file" must be a relative path under the mocks directory',
    source: 'src/validators/store.validator.ts',
    kind: 'validation',
    caseName: 'error/store-errors'
  },
  {
    id: 'store.seed-missing-key',
    message: 'The "store.seed[0]" item is missing key field "id"',
    source: 'src/validators/store.validator.ts',
    kind: 'validation',
    caseName: 'error/store-errors'
  },
  {
    id: 'store.already-defined',
    message: 'The store "shared-dup" is already defined',
    source: 'src/cli/commands/start/process-file.ts',
    kind: 'validation',
    caseName: 'error/store-errors'
  },
  {
    id: 'store.list-type',
    message: 'The "store.list" property must be a boolean or an object',
    source: 'src/validators/store.validator.ts',
    kind: 'validation',
    caseName: 'error/store-errors'
  },
  {
    id: 'store.list-unknown-key',
    message: 'The "store.list" property contains unknown key "foo"',
    source: 'src/validators/store.validator.ts',
    kind: 'validation',
    caseName: 'error/store-errors'
  },
  {
    id: 'store.list-page-default',
    message: 'The "store.list.page.default" must be an integer >= 1',
    source: 'src/validators/store.validator.ts',
    kind: 'validation',
    caseName: 'error/store-errors'
  },
  {
    id: 'store.list-sort-fields',
    message: 'The "store.list.sort.fields" must be a non-empty array of strings',
    source: 'src/validators/store.validator.ts',
    kind: 'validation',
    caseName: 'error/store-errors'
  },
  {
    id: 'store.list-order-default',
    message: 'The "store.list.order.default" must be "asc" or "desc"',
    source: 'src/validators/store.validator.ts',
    kind: 'validation',
    caseName: 'error/store-errors'
  },
  {
    id: 'store.list-filter-type',
    message: 'The "store.list.filter" property must be an array or an object',
    source: 'src/validators/store.validator.ts',
    kind: 'validation',
    caseName: 'error/store-errors'
  },
  {
    id: 'store.list-filter-empty',
    message: 'The "store.list.filter" array must be a non-empty array of strings',
    source: 'src/validators/store.validator.ts',
    kind: 'validation',
    caseName: 'error/store-errors'
  },
  {
    id: 'store.list-filter-search-fields',
    message: 'The "store.list.filter.search.fields" must be a non-empty array of strings',
    source: 'src/validators/store.validator.ts',
    kind: 'validation',
    caseName: 'error/store-errors'
  },
  {
    id: 'store.list-filter-op',
    message: 'The "store.list.filter.fields[0].op" must be one of: eq, ne, gt, gte, lt, lte, in',
    source: 'src/validators/store.validator.ts',
    kind: 'validation',
    caseName: 'error/store-errors'
  },
  {
    id: 'store.list-filter-or-empty',
    message: 'The "store.list.filter.or" must be a non-empty array of strings or field objects',
    source: 'src/validators/store.validator.ts',
    kind: 'validation',
    caseName: 'error/store-errors'
  },
  {
    id: 'store.list-filter-or-field',
    message: 'The "store.list.filter.or[0].field" must be a non-empty string',
    source: 'src/validators/store.validator.ts',
    kind: 'validation',
    caseName: 'error/store-errors'
  },
  {
    id: 'store.list-cursor-type',
    message: 'The "store.list.cursor" property must be a boolean or an object',
    source: 'src/validators/store.validator.ts',
    kind: 'validation',
    caseName: 'error/store-errors'
  },
  {
    id: 'http.store.soft-delete.404',
    message: 'Not found',
    source: 'src/scripts/store.script.ts',
    kind: 'http',
    caseName: 'runtime/store-soft-delete'
  },
  {
    id: 'http.store.soft-delete.restore-conflict',
    message: 'DUPLICATE',
    source: 'src/scripts/store.script.ts',
    kind: 'http',
    caseName: 'runtime/store-soft-delete'
  },
  {
    id: 'http.store.404.not-found',
    message: 'Not found',
    source: 'src/scripts/store.script.ts',
    kind: 'http',
    caseName: 'runtime/store-mutable'
  },
  {
    id: 'http.store.persist.survives-restart',
    message: 'Persistida',
    source: 'src/scripts/store-persist.script.ts',
    kind: 'http',
    caseName: 'runtime/store-persist'
  },
  {
    id: 'http.store.matrix.put-unique-list',
    message: 'DUPLICATE_SKU',
    source: 'src/scripts/store.script.ts',
    kind: 'http',
    caseName: 'runtime/store-matrix'
  },
  {
    id: 'http.store.persist.matrix',
    message: 'alpha-2-updated',
    source: 'src/scripts/store-persist.script.ts',
    kind: 'http',
    caseName: 'runtime/store-persist-matrix'
  },
  {
    id: 'http.store.list.sort-page',
    message: 'X-Total-Count',
    source: 'src/scripts/store-list.script.ts',
    kind: 'http',
    caseName: 'runtime/store-list'
  },
  {
    id: 'http.store.list.bad-sort',
    message: 'Query "sort" field must be one of: id, name, price',
    source: 'src/scripts/store-list.script.ts',
    kind: 'http',
    caseName: 'runtime/store-list'
  },
  {
    id: 'http.store.list.links-next',
    message: 'rel="next"',
    source: 'src/scripts/store-list.script.ts',
    kind: 'http',
    caseName: 'runtime/store-list'
  },
  {
    id: 'http.store.list.filter-search',
    message: 'Charlie',
    source: 'src/scripts/store-list.script.ts',
    kind: 'http',
    caseName: 'runtime/store-list'
  },
  {
    id: 'http.store.list.filter-ops',
    message: 'Query "minPrice" must be a number',
    source: 'src/scripts/store-list.script.ts',
    kind: 'http',
    caseName: 'runtime/store-list'
  },
  {
    id: 'http.store.list.filter-empty',
    message: 'Query "name" must not be empty',
    source: 'src/scripts/store-list.script.ts',
    kind: 'http',
    caseName: 'runtime/store-list'
  },
  {
    id: 'http.store.list.mode-priority',
    message: 'mixed',
    source: 'src/scripts/store-list.script.ts',
    kind: 'http',
    caseName: 'runtime/store-list'
  },
  {
    id: 'http.store.list.multi-sort',
    message: 'price:desc,name:asc',
    source: 'src/scripts/store-list.script.ts',
    kind: 'http',
    caseName: 'runtime/store-list'
  },
  {
    id: 'http.store.list.cursor',
    message: 'starting_after',
    source: 'src/scripts/store-list.script.ts',
    kind: 'http',
    caseName: 'runtime/store-list'
  },
  {
    id: 'store.persist.corrupt-file',
    message: 'Invalid persisted store file',
    source: 'src/scripts/store-persist.script.ts',
    kind: 'runtime',
    caseName: 'error/store-persist-corrupt'
  },
  {
    id: 'store.persist.missing-key',
    message: 'missing key field "id"',
    source: 'src/scripts/store-persist.script.ts',
    kind: 'runtime',
    caseName: 'error/store-persist-corrupt'
  },
  {
    id: 'store.persist.duplicate-key',
    message: 'duplicate key',
    source: 'src/scripts/store-persist.script.ts',
    kind: 'runtime',
    caseName: 'error/store-persist-corrupt'
  },
  {
    id: 'store.persist.duplicate-unique',
    message: 'duplicate unique field "title"',
    source: 'src/scripts/store-persist.script.ts',
    kind: 'runtime',
    caseName: 'error/store-persist-corrupt'
  },
  {
    id: 'store.persist.write-failed',
    message: 'Failed to persist store "notes"',
    source: 'src/scripts/store.script.ts',
    kind: 'runtime',
    caseName: 'runtime/store-persist-write-failed'
  },
  {
    id: 'http.store.params-win-over-body',
    message: 'acme',
    source: 'src/scripts/store.script.ts',
    kind: 'http',
    caseName: 'runtime/store-matrix'
  },
  {
    id: 'http.store.default-conflict',
    message: 'Duplicate value(s)',
    source: 'src/scripts/store-conflict.script.ts',
    kind: 'http',
    caseName: 'runtime/store-matrix'
  },
  {
    id: 'http.store.static-match',
    message: 'static-match',
    source: 'src/scripts/match.script.ts',
    kind: 'http',
    caseName: 'runtime/store-matrix'
  },
  {
    id: 'http.store.action-header',
    message: 'X-Store-Action',
    source: 'src/cli/commands/start/start-mock.ts',
    kind: 'http',
    caseName: 'runtime/store-matrix'
  },
  {
    id: 'http.store.watch-skips-reset-store',
    message: 'after-reset',
    source: 'src/cli/commands/start/watch-mock.ts',
    kind: 'http',
    caseName: 'runtime/store-persist-matrix'
  },
  {
    id: 'http.store.saas-slug-taken',
    message: 'SLUG_TAKEN',
    source: 'mocks/29-store-saas.json',
    kind: 'http',
    caseName: 'runtime/store-saas'
  },
  {
    id: 'http.store.saas-board-match',
    message: 'static-match',
    source: 'mocks/29-store-saas.json',
    kind: 'http',
    caseName: 'runtime/store-saas'
  },
  {
    id: 'http.store.saas-persist-restart',
    message: 'Ship MVP',
    source: 'src/scripts/store-persist.script.ts',
    kind: 'http',
    caseName: 'runtime/store-saas'
  },
  {
    id: 'http.store.rbac-unauthorized',
    message: 'UNAUTHORIZED',
    source: 'mocks/30-store-rbac.json',
    kind: 'http',
    caseName: 'runtime/store-rbac'
  },
  {
    id: 'http.store.rbac-gone',
    message: 'DOCUMENT_GONE',
    source: 'mocks/30-store-rbac.json',
    kind: 'http',
    caseName: 'runtime/store-rbac'
  },
  {
    id: 'http.store.rbac-card-declined',
    message: 'CARD_DECLINED',
    source: 'mocks/30-store-rbac.json',
    kind: 'http',
    caseName: 'runtime/store-rbac'
  },
  {
    id: 'http.store.rbac-persist',
    message: 'launch-plan',
    source: 'src/scripts/store-persist.script.ts',
    kind: 'http',
    caseName: 'runtime/store-rbac'
  },

  // --- CLI ---
  {
    id: 'cli.port-invalid',
    message: 'Port must be a valid number',
    source: 'src/cli/interactive.ts',
    kind: 'cli',
    caseName: 'system/port-invalid'
  },
  {
    id: 'cli.port-out-of-range',
    message: 'Port must be between 1 and 65535',
    source: 'src/cli/interactive.ts',
    kind: 'cli',
    caseName: 'system/port-out-of-range'
  },
  {
    id: 'cli.proxy-flag-invalid',
    message: 'Proxy must be a valid http or https URL',
    source: 'src/cli/interactive.ts',
    kind: 'cli',
    caseName: 'system/proxy-flag-invalid'
  },
  {
    id: 'cli.port-in-use',
    message: 'is already in use. Please use a different port.',
    source: 'src/cli/commands/start/check-port.ts',
    kind: 'cli',
    caseName: 'system/port-in-use'
  },
  {
    id: 'cli.reset-store-ids-invalid',
    message: 'Reset store ids must be a non-empty comma-separated list',
    source: 'src/cli/interactive.ts',
    kind: 'cli',
    caseName: 'system/reset-store-invalid'
  },
  {
    id: 'cli.version',
    message: '1.18.1',
    source: 'src/cli/interactive.ts',
    kind: 'cli',
    caseName: 'system/cli-version-help'
  },
  {
    id: 'cli.help',
    message: 'Usage: mock-server [options] [command]',
    source: 'src/cli/interactive.ts',
    kind: 'cli',
    caseName: 'system/cli-version-help'
  },
  {
    id: 'cli.start-custom-path',
    message: 'custom-path',
    source: 'src/cli/commands/start/execute-mock.ts',
    kind: 'cli',
    caseName: 'system/start-custom-path'
  },
  {
    id: 'init.cli-create-mocks',
    message: 'The directory named mocks was created successfully',
    source: 'src/cli/commands/init/add-mocks-folder.ts',
    kind: 'init',
    caseName: 'system/init-cli'
  },
  {
    id: 'init.cli-mocks-already-exists',
    message: 'The directory named mocks already exists',
    source: 'src/cli/commands/init/add-mocks-folder.ts',
    kind: 'init',
    caseName: 'system/init-cli'
  },
  {
    id: 'init.cli-script-added',
    message: 'The script was added successfully',
    source: 'src/cli/commands/init/add-script.ts',
    kind: 'init',
    caseName: 'system/init-cli'
  },
  {
    id: 'init.with-mock-ready',
    message: 'Mock ready',
    source: 'src/cli/commands/add/add-mock.ts',
    kind: 'init',
    caseName: 'unit/init-with-mock'
  },
  {
    id: 'add.mock-ready',
    message: 'Mock ready',
    source: 'src/cli/commands/add/add-mock.ts',
    kind: 'init',
    caseName: 'unit/add-mock'
  },
  {
    id: 'add.mock-abort',
    message: 'Aborting',
    source: 'src/cli/commands/add/add-mock.ts',
    kind: 'init',
    caseName: 'unit/add-mock'
  },
  {
    id: 'add.write-enoent',
    message: 'ENOENT',
    source: 'src/cli/commands/add/add-mock.ts',
    kind: 'init',
    caseName: 'unit/cli-io-errors'
  },
  {
    id: 'init.script-invalid-json',
    message: 'JSON',
    source: 'src/cli/commands/init/add-script.ts',
    kind: 'init',
    caseName: 'unit/cli-io-errors'
  },
  {
    id: 'init.script-write-failed',
    message: 'EISDIR',
    source: 'src/cli/commands/init/add-script.ts',
    kind: 'init',
    caseName: 'unit/cli-io-errors'
  },
  {
    id: 'cli.unknown-command',
    message: "unknown command 'nope'",
    source: 'src/cli/interactive.ts',
    kind: 'cli',
    caseName: 'system/cli-commander-errors'
  },
  {
    id: 'cli.start-help',
    message: 'Usage: mock-server start [options]',
    source: 'src/cli/interactive.ts',
    kind: 'cli',
    caseName: 'system/cli-commander-errors'
  },

  // --- runtime ---
  {
    id: 'runtime.proxy-orphan',
    message: 'Proxy is set to true but no method, folder, root config, or --proxy target is configured',
    source: 'src/cli/commands/start/start-mock.ts',
    kind: 'runtime',
    caseName: 'runtime/proxy-orphan-502'
  },
  {
    id: 'runtime.proxy-request-failed',
    message: 'Proxy request failed',
    source: 'src/scripts/proxy.script.ts',
    kind: 'runtime',
    caseName: 'runtime/proxy-request-failed'
  },

  // --- defensive / watch / init ---
  {
    id: 'defensive.unsupported-http-method',
    message: 'Unsupported HTTP method: "OPTIONS"',
    source: 'src/models/api.model.ts',
    kind: 'defensive',
    caseName: 'unit/unsupported-http-method'
  },
  {
    id: 'defensive.fallback-missing',
    message: 'Fallback response "missing" was not found in the responses array',
    source: 'src/scripts/match.script.ts',
    kind: 'defensive',
    caseName: 'unit/fallback-response-missing'
  },
  {
    id: 'watch.restart-failed',
    message: 'Mock server could not be restarted due to an invalid mock configuration. Please fix the mocks and run the command again.',
    source: 'src/cli/commands/start/watch-mock.ts',
    kind: 'watch',
    caseName: 'runtime/watch-restart-failed'
  },
  {
    id: 'init.package-json-missing',
    message: 'The file "package.json" was not found',
    source: 'src/cli/commands/init/add-script.ts',
    kind: 'init',
    caseName: 'unit/package-json-missing'
  },
  {
    id: 'init.mocks-folder-mkdir-failed',
    message: 'ENOTDIR',
    source: 'src/cli/commands/init/add-mocks-folder.ts',
    kind: 'init',
    caseName: 'unit/mocks-folder-mkdir-failed'
  },

  // --- controlled HTTP application errors (mock responses asserted at runtime) ---
  {
    id: 'http.400.bad-request',
    message: '400 BAD_REQUEST',
    source: 'mocks/19-checkout-resilience.json',
    kind: 'http',
    caseName: 'runtime/checkout-resilience'
  },
  {
    id: 'http.401.unauthorized',
    message: '401 UNAUTHORIZED',
    source: 'mocks/20-multi-tenant-rbac.json',
    kind: 'http',
    caseName: 'runtime/multi-tenant-rbac'
  },
  {
    id: 'http.402.card-declined',
    message: '402 CARD_DECLINED',
    source: 'mocks/19-checkout-resilience.json',
    kind: 'http',
    caseName: 'runtime/checkout-resilience'
  },
  {
    id: 'http.402.insufficient-funds',
    message: '402 INSUFFICIENT_FUNDS',
    source: 'mocks/19-checkout-resilience.json',
    kind: 'http',
    caseName: 'runtime/checkout-resilience'
  },
  {
    id: 'http.403.org-forbidden',
    message: '403 ORG_FORBIDDEN',
    source: 'mocks/20-multi-tenant-rbac.json',
    kind: 'http',
    caseName: 'runtime/multi-tenant-rbac'
  },
  {
    id: 'http.403.insufficient-role',
    message: '403 INSUFFICIENT_ROLE',
    source: 'mocks/20-multi-tenant-rbac.json',
    kind: 'http',
    caseName: 'runtime/multi-tenant-rbac'
  },
  {
    id: 'http.404.product-not-found',
    message: '404 PRODUCT_NOT_FOUND',
    source: 'mocks/18-rest-resource-lifecycle.json',
    kind: 'http',
    caseName: 'runtime/rest-resource-lifecycle'
  },
  {
    id: 'http.404.project-hidden',
    message: '404 PROJECT_NOT_FOUND',
    source: 'mocks/20-multi-tenant-rbac.json',
    kind: 'http',
    caseName: 'runtime/multi-tenant-rbac'
  },
  {
    id: 'http.409.duplicate-sku',
    message: '409 DUPLICATE_SKU',
    source: 'mocks/18-rest-resource-lifecycle.json',
    kind: 'http',
    caseName: 'runtime/rest-resource-lifecycle'
  },
  {
    id: 'http.409.version-conflict',
    message: '409 VERSION_CONFLICT',
    source: 'mocks/18-rest-resource-lifecycle.json',
    kind: 'http',
    caseName: 'runtime/rest-resource-lifecycle'
  },
  {
    id: 'http.409.idempotency-mismatch',
    message: '409 IDEMPOTENCY_KEY_MISMATCH',
    source: 'mocks/19-checkout-resilience.json',
    kind: 'http',
    caseName: 'runtime/checkout-resilience'
  },
  {
    id: 'http.409.inventory-conflict',
    message: '409 INVENTORY_CONFLICT',
    source: 'mocks/19-checkout-resilience.json',
    kind: 'http',
    caseName: 'runtime/checkout-resilience'
  },
  {
    id: 'http.410.product-gone',
    message: '410 PRODUCT_GONE',
    source: 'mocks/18-rest-resource-lifecycle.json',
    kind: 'http',
    caseName: 'runtime/rest-resource-lifecycle'
  },
  {
    id: 'http.410.project-gone',
    message: '410 PROJECT_GONE',
    source: 'mocks/20-multi-tenant-rbac.json',
    kind: 'http',
    caseName: 'runtime/multi-tenant-rbac'
  },
  {
    id: 'http.422.validation-failed',
    message: '422 validation errors',
    source: 'mocks/18-rest-resource-lifecycle.json',
    kind: 'http',
    caseName: 'runtime/rest-resource-lifecycle'
  },
  {
    id: 'http.429.rate-limited',
    message: '429 RATE_LIMITED',
    source: 'mocks/19-checkout-resilience.json',
    kind: 'http',
    caseName: 'runtime/checkout-resilience'
  },
  {
    id: 'http.503.provider-unavailable',
    message: '503 PROVIDER_UNAVAILABLE',
    source: 'mocks/19-checkout-resilience.json',
    kind: 'http',
    caseName: 'runtime/checkout-resilience'
  },
  {
    id: 'http.401.ticket-unauthorized',
    message: '401 UNAUTHORIZED',
    source: 'mocks/21-match-matrix.json',
    kind: 'http',
    caseName: 'runtime/match-matrix'
  },
  {
    id: 'http.403.ticket-insufficient-role',
    message: '403 INSUFFICIENT_ROLE',
    source: 'mocks/21-match-matrix.json',
    kind: 'http',
    caseName: 'runtime/match-matrix'
  },
  {
    id: 'http.404.ticket-not-found',
    message: '404 TICKET_NOT_FOUND',
    source: 'mocks/21-match-matrix.json',
    kind: 'http',
    caseName: 'runtime/match-matrix'
  },
  {
    id: 'http.409.ticket-version-conflict',
    message: '409 VERSION_CONFLICT',
    source: 'mocks/21-match-matrix.json',
    kind: 'http',
    caseName: 'runtime/match-matrix'
  },
  {
    id: 'http.409.ticket-duplicate-title',
    message: '409 DUPLICATE_TITLE',
    source: 'mocks/21-match-matrix.json',
    kind: 'http',
    caseName: 'runtime/match-matrix'
  },
  {
    id: 'http.410.ticket-gone',
    message: '410 TICKET_GONE',
    source: 'mocks/21-match-matrix.json',
    kind: 'http',
    caseName: 'runtime/match-matrix'
  },
  {
    id: 'http.422.ticket-validation',
    message: '422 VALIDATION_FAILED',
    source: 'mocks/21-match-matrix.json',
    kind: 'http',
    caseName: 'runtime/match-matrix'
  },
  {
    id: 'http.429.ticket-rate-limited',
    message: '429 RATE_LIMITED',
    source: 'mocks/21-match-matrix.json',
    kind: 'http',
    caseName: 'runtime/match-matrix'
  },

  // --- request validation controlled HTTP outcomes ---
  {
    id: 'http.422.register-validation',
    message: 'Email inválido',
    source: 'mocks/22-request.json',
    kind: 'http',
    caseName: 'runtime/request-validation'
  },
  {
    id: 'http.409.register-duplicate',
    message: 'Email already exists',
    source: 'mocks/22-request.json',
    kind: 'http',
    caseName: 'runtime/request-validation'
  },
  {
    id: 'http.400.search-map-errors',
    message: 'query.q must have minLength 2',
    source: 'mocks/22-request.json',
    kind: 'http',
    caseName: 'runtime/request-validation'
  },
  {
    id: 'http.400.orders-nested',
    message: 'items.0.qty must be >= 1',
    source: 'mocks/22-request.json',
    kind: 'http',
    caseName: 'runtime/request-validation'
  },
  {
    id: 'http.400.profiles-details',
    message: 'userId must be a valid uuid',
    source: 'mocks/22-request.json',
    kind: 'http',
    caseName: 'runtime/request-validation'
  },
  {
    id: 'http.400.filters-fields',
    message: 'Filter validation failed',
    source: 'mocks/22-request.json',
    kind: 'http',
    caseName: 'runtime/request-validation'
  },
  {
    id: 'http.423.login-locked',
    message: 'ACCOUNT_LOCKED',
    source: 'mocks/23-request-matrix.json',
    kind: 'http',
    caseName: 'runtime/request-matrix'
  },
  {
    id: 'http.401.login-mfa',
    message: 'MFA_REQUIRED',
    source: 'mocks/23-request-matrix.json',
    kind: 'http',
    caseName: 'runtime/request-matrix'
  },
  {
    id: 'http.422.login-validation',
    message: 'Invalid request',
    source: 'mocks/23-request-matrix.json',
    kind: 'http',
    caseName: 'runtime/request-matrix'
  },
  {
    id: 'http.409.checkout-inventory',
    message: 'INVENTORY_CONFLICT',
    source: 'mocks/23-request-matrix.json',
    kind: 'http',
    caseName: 'runtime/request-matrix'
  },
  {
    id: 'http.400.checkout-validation',
    message: 'Checkout validation failed',
    source: 'mocks/23-request-matrix.json',
    kind: 'http',
    caseName: 'runtime/request-matrix'
  },
  {
    id: 'http.422.proxy-guard-validation',
    message: 'Invalid request',
    source: 'mocks/23-request-matrix.json',
    kind: 'http',
    caseName: 'runtime/request-matrix'
  },
  {
    id: 'http.409.saas-email-taken',
    message: 'EMAIL_TAKEN',
    source: 'mocks/24-request-saas.json',
    kind: 'http',
    caseName: 'runtime/request-saas'
  },
  {
    id: 'http.422.saas-signup-validation',
    message: 'Signup validation failed',
    source: 'mocks/24-request-saas.json',
    kind: 'http',
    caseName: 'runtime/request-saas'
  },
  {
    id: 'http.403.saas-invite-forbidden',
    message: 'INSUFFICIENT_ROLE',
    source: 'mocks/24-request-saas.json',
    kind: 'http',
    caseName: 'runtime/request-saas'
  },
  {
    id: 'http.404.saas-org-not-found',
    message: 'ORG_NOT_FOUND',
    source: 'mocks/24-request-saas.json',
    kind: 'http',
    caseName: 'runtime/request-saas'
  },
  {
    id: 'http.400.saas-report-query',
    message: 'Invalid report query',
    source: 'mocks/24-request-saas.json',
    kind: 'http',
    caseName: 'runtime/request-saas'
  },
  {
    id: 'http.201.request-match-proxy-live',
    message: 'live-post',
    source: 'mocks/23-request-matrix.json',
    kind: 'http',
    caseName: 'runtime/request-matrix'
  },
  {
    id: 'http.200.request-match-params-query-body',
    message: 'admin-web-close',
    source: 'mocks/23-request-matrix.json',
    kind: 'http',
    caseName: 'runtime/request-matrix'
  },
  {
    id: 'watch.request-config-invalid',
    message: 'The "request.body.email.format" must be one of: email, uuid, url, date',
    source: 'src/validators/request.validator.ts',
    kind: 'watch',
    caseName: 'runtime/watch-request-failed'
  },
  {
    id: 'watch.request-restart-failed',
    message: 'Mock server could not be restarted due to an invalid mock configuration. Please fix the mocks and run the command again.',
    source: 'src/cli/commands/start/watch-mock.ts',
    kind: 'watch',
    caseName: 'runtime/watch-request-failed'
  },
  {
    id: 'defensive.invalid-mock-configuration',
    message: 'Invalid mock configuration',
    source: 'src/cli/commands/start/files.ts',
    kind: 'defensive',
    caseName: 'unit/invalid-mock-configuration'
  },

  // --- mock.config.json ---
  {
    id: 'mock-config.prefix-root-forbidden',
    message: 'The "prefix" is only allowed inside "folders"',
    source: 'src/validators/mock-config.validator.ts',
    kind: 'validation',
    caseName: 'error/mock-config-errors'
  },
  {
    id: 'mock-config.delay-negative',
    message: 'The "delay" must be greater than or equal to 0',
    source: 'src/validators/mock-config.validator.ts',
    kind: 'validation',
    caseName: 'error/mock-config-errors'
  },
  {
    id: 'mock-config.delay-not-number',
    message: 'The "delay" "abc" is not a valid number',
    source: 'src/validators/mock-config.validator.ts',
    kind: 'validation',
    caseName: 'error/mock-config-errors'
  },
  {
    id: 'mock-config.proxy-true-forbidden',
    message: 'The "proxy" must be a URL string or an object with "target"',
    source: 'src/validators/mock-config.validator.ts',
    kind: 'validation',
    caseName: 'error/mock-config-errors'
  },
  {
    id: 'mock-config.headers-value-not-string',
    message: 'The "headers.X-Bad" must be a string',
    source: 'src/validators/mock-config.validator.ts',
    kind: 'validation',
    caseName: 'error/mock-config-errors'
  },
  {
    id: 'mock-config.headers-not-object',
    message: 'The "headers" must be an object',
    source: 'src/validators/mock-config.validator.ts',
    kind: 'validation',
    caseName: 'error/mock-config-errors'
  },
  {
    id: 'mock-config.strictDuplicates-not-boolean',
    message: 'The "strictDuplicates" must be a boolean',
    source: 'src/validators/mock-config.validator.ts',
    kind: 'validation',
    caseName: 'error/mock-config-errors'
  },
  {
    id: 'mock-config.port-out-of-range',
    message: 'The "port" must be between 1 and 65535',
    source: 'src/validators/mock-config.validator.ts',
    kind: 'validation',
    caseName: 'error/mock-config-errors'
  },
  {
    id: 'mock-config.port-not-number',
    message: 'The "port" must be a valid number',
    source: 'src/validators/mock-config.validator.ts',
    kind: 'validation',
    caseName: 'error/mock-config-errors'
  },
  {
    id: 'mock-config.folders-not-object',
    message: 'The "folders" must be an object',
    source: 'src/validators/mock-config.validator.ts',
    kind: 'validation',
    caseName: 'error/mock-config-errors'
  },
  {
    id: 'mock-config.folder-name-invalid',
    message: 'The folder name "bad/name" is invalid',
    source: 'src/validators/mock-config.validator.ts',
    kind: 'validation',
    caseName: 'error/mock-config-errors'
  },
  {
    id: 'mock-config.folder-not-object',
    message: 'The "folders.bad/name" must be an object',
    source: 'src/validators/mock-config.validator.ts',
    kind: 'validation',
    caseName: 'error/mock-config-errors'
  },
  {
    id: 'mock-config.prefix-empty',
    message: 'The "folders.broken.prefix" must be a non-empty path',
    source: 'src/validators/mock-config.validator.ts',
    kind: 'validation',
    caseName: 'error/mock-config-errors'
  },
  {
    id: 'mock-config.prefix-not-string',
    message: 'The "folders.broken.prefix" must be a string',
    source: 'src/validators/mock-config.validator.ts',
    kind: 'validation',
    caseName: 'error/mock-config-errors'
  },
  {
    id: 'mock-config.prefix-invalid-chars',
    message: 'Invalid "folders.bad-chars.prefix"',
    source: 'src/validators/mock-config.validator.ts',
    kind: 'validation',
    caseName: 'error/mock-config-errors'
  },
  {
    id: 'mock-config.prefix-route-params-forbidden',
    message: 'The "folders.with-params.prefix" cannot contain route parameters',
    source: 'src/validators/mock-config.validator.ts',
    kind: 'validation',
    caseName: 'error/mock-config-errors'
  },
  {
    id: 'mock-config.port-not-integer',
    message: 'The "port" must be an integer',
    source: 'src/validators/mock-config.validator.ts',
    kind: 'validation',
    caseName: 'error/mock-config-errors'
  },
  {
    id: 'mock-config.folder-delay-not-number',
    message: 'The "folders.broken.delay" "nope" is not a valid number',
    source: 'src/validators/mock-config.validator.ts',
    kind: 'validation',
    caseName: 'error/mock-config-errors'
  },
  {
    id: 'mock-config.folder-headers-not-object',
    message: 'The "folders.broken.headers" must be an object',
    source: 'src/validators/mock-config.validator.ts',
    kind: 'validation',
    caseName: 'error/mock-config-errors'
  },
  {
    id: 'mock-config.enabled-not-boolean',
    message: 'The "folders.broken.enabled" must be a boolean',
    source: 'src/validators/mock-config.validator.ts',
    kind: 'validation',
    caseName: 'error/mock-config-errors'
  },
  {
    id: 'mock-config.include-not-array',
    message: 'The "folders.broken.include" must be an array of strings',
    source: 'src/validators/mock-config.validator.ts',
    kind: 'validation',
    caseName: 'error/mock-config-errors'
  },
  {
    id: 'mock-config.exclude-empty-item',
    message: 'The "folders.broken.exclude[0]" must be a non-empty string',
    source: 'src/validators/mock-config.validator.ts',
    kind: 'validation',
    caseName: 'error/mock-config-errors'
  },
  {
    id: 'mock-config.include-item-not-string',
    message: 'The "folders.empty-include-item.include[0]" must be a non-empty string',
    source: 'src/validators/mock-config.validator.ts',
    kind: 'validation',
    caseName: 'error/mock-config-errors'
  },
  {
    id: 'mock-config.stripPrefix-not-boolean',
    message: 'The "folders.broken.stripPrefix" must be a boolean',
    source: 'src/validators/mock-config.validator.ts',
    kind: 'validation',
    caseName: 'error/mock-config-errors'
  },
  {
    id: 'mock-config.stripPrefix-requires-prefix',
    message: 'The "folders.needs-prefix.stripPrefix" requires "folders.needs-prefix.prefix"',
    source: 'src/validators/mock-config.validator.ts',
    kind: 'validation',
    caseName: 'error/mock-config-errors'
  },
  {
    id: 'mock-config.proxyUnmatched-invalid-url',
    message: 'The "folders.broken.proxyUnmatched" must be a valid http or https URL',
    source: 'src/validators/mock-config.validator.ts',
    kind: 'validation',
    caseName: 'error/mock-config-errors'
  },
  {
    id: 'mock-config.proxyUnmatched-requires-prefix',
    message: 'The "folders.needs-prefix.proxyUnmatched" requires "folders.needs-prefix.prefix"',
    source: 'src/validators/mock-config.validator.ts',
    kind: 'validation',
    caseName: 'error/mock-config-errors'
  },
  {
    id: 'mock-config.storeNamespace-invalid',
    message: 'The "folders.broken.storeNamespace" must be a non-empty string using letters, numbers, "-", "_", and "."',
    source: 'src/validators/mock-config.validator.ts',
    kind: 'validation',
    caseName: 'error/mock-config-errors'
  },
  {
    id: 'mock-config.proxy-target-invalid',
    message: 'The "proxy.target" must be a valid http or https URL',
    source: 'src/validators/mock-config.validator.ts',
    kind: 'validation',
    caseName: 'error/mock-config-errors'
  },
  {
    id: 'mock-config.not-object',
    message: 'The file must contain a valid JSON object',
    source: 'src/scripts/mock-config.script.ts',
    kind: 'validation',
    caseName: 'error/mock-config-errors'
  },
  {
    id: 'mock-config.syntax-error',
    message: 'JSON syntax error:',
    source: 'src/scripts/mock-config.script.ts',
    kind: 'validation',
    caseName: 'error/mock-config-errors'
  },
  {
    id: 'mock-config.folder-missing',
    message: 'The folder "missing" does not exist inside mocks',
    source: 'src/scripts/mock-config.script.ts',
    kind: 'validation',
    caseName: 'error/mock-config-errors'
  },
  {
    id: 'mock-config.strictDuplicates-route',
    message: 'Duplicate route [GET] /api/users/login',
    source: 'src/cli/commands/start/process-file.ts',
    kind: 'validation',
    caseName: 'error/mock-config-errors'
  },
  {
    id: 'http.mock-config.auth-login',
    message: 'tok_demo',
    source: 'tests/e2e/cases/runtime/mock-config-exhaustive.js',
    kind: 'http',
    caseName: 'runtime/mock-config-exhaustive'
  },
  {
    id: 'http.mock-config.cart-conflict',
    message: 'ITEM_ALREADY_IN_CART',
    source: 'tests/e2e/cases/runtime/mock-config-exhaustive.js',
    kind: 'http',
    caseName: 'runtime/mock-config-exhaustive'
  },
  {
    id: 'http.mock-config.payments-declined',
    message: 'CARD_DECLINED',
    source: 'tests/e2e/cases/runtime/mock-config-exhaustive.js',
    kind: 'http',
    caseName: 'runtime/mock-config-exhaustive'
  },
  {
    id: 'http.mock-config.stripPrefix-live',
    message: '/intents?mode=live',
    source: 'tests/e2e/cases/runtime/mock-config-exhaustive.js',
    kind: 'http',
    caseName: 'runtime/mock-config-exhaustive'
  },
  {
    id: 'http.mock-config.proxyUnmatched',
    message: '/methods?x=1',
    source: 'tests/e2e/cases/runtime/mock-config-exhaustive.js',
    kind: 'http',
    caseName: 'runtime/mock-config-exhaustive'
  }
];

module.exports = { ERROR_CATALOG };
