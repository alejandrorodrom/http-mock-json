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
  {
    id: 'file.processing-error',
    message: 'Error processing file: methodData.responses is not iterable',
    source: 'src/cli/commands/start/process-file.ts',
    kind: 'validation',
    caseName: 'error/method-responses-not-array'
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
    message: 'The "match" property must include "params", "query" and/or "body"',
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

  // --- runtime ---
  {
    id: 'runtime.proxy-orphan',
    message: 'Proxy is set to true but no method-level proxy or --proxy target is configured',
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
  }
];

module.exports = { ERROR_CATALOG };
