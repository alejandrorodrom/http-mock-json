'use strict';

/**
 * Registry of all e2e case scripts.
 * The e2e runner loads each module and calls `.run()`.
 */

const successCases = [
  require('./success/01-basic-multiple-responses'),
  require('./success/02-custom-headers'),
  require('./success/03-null-body'),
  require('./success/04-params-and-methods'),
  require('./success/05-match-params'),
  require('./success/06-match-query-delay'),
  require('./success/07-match-body'),
  require('./success/08-match-combined'),
  require('./success/09-proxy'),
  require('./success/10-status-codes-standard'),
  require('./success/11-status-codes-warnings'),
  require('./success/12-body-types'),
  require('./success/13-endpoint-chars'),
  require('./success/14-http-methods-case'),
  require('./success/15-auth-scenarios'),
  require('./success/16-runtime-proxy-orphan'),
  require('./success/17-proxy-request-failed')
];

const errorCases = [
  require('./error/file-empty-endpoints'),
  require('./error/file-not-object'),
  require('./error/file-syntax-error'),
  require('./error/endpoint-errors'),
  require('./error/method-errors'),
  require('./error/method-responses-not-array'),
  require('./error/response-errors'),
  require('./error/match-errors'),
  require('./error/proxy-errors')
];

const systemCases = [
  require('./system/mocks-dir-missing'),
  require('./system/no-files-found'),
  require('./system/port-invalid'),
  require('./system/port-out-of-range'),
  require('./system/proxy-flag-invalid'),
  require('./system/port-in-use')
];

const runtimeCases = [
  require('./runtime/name-response-fallback'),
  require('./runtime/match-params'),
  require('./runtime/match-query-delay'),
  require('./runtime/match-body'),
  require('./runtime/match-combined'),
  require('./runtime/headers-and-null-body'),
  require('./runtime/all-http-methods'),
  require('./runtime/proxy-orphan-502'),
  require('./runtime/proxy-live'),
  require('./runtime/global-proxy-unmatched'),
  require('./runtime/proxy-request-failed'),
  require('./runtime/watch-restart-failed')
];

const unitCases = [
  require('./unit/unsupported-http-method'),
  require('./unit/fallback-response-missing'),
  require('./unit/package-json-missing'),
  require('./unit/mocks-folder-mkdir-failed')
];

/** @type {{ name: string, description: string, run: () => Promise<import('../lib/reporter').CaseResult> }[]} */
const useCases = [
  ...successCases,
  ...errorCases,
  ...systemCases,
  ...runtimeCases,
  ...unitCases
];

module.exports = {
  useCases,
  successCases,
  errorCases,
  systemCases,
  runtimeCases,
  unitCases
};
