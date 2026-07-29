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
  require('./success/17-proxy-request-failed'),
  require('./success/18-rest-resource-lifecycle'),
  require('./success/19-checkout-resilience'),
  require('./success/20-multi-tenant-rbac'),
  require('./success/21-match-matrix'),
  require('./success/22-request'),
  require('./success/23-request-matrix'),
  require('./success/24-request-saas'),
  require('./success/25-store'),
  require('./success/26-store-persist'),
  require('./success/27-store-matrix'),
  require('./success/28-store-persist-matrix'),
  require('./success/29-store-saas'),
  require('./success/30-store-rbac'),
  require('./success/31-store-list'),
  require('./success/32-store-commerce'),
  require('./success/33-store-helpdesk'),
  require('./success/34-store-hr'),
  require('./success/35-store-unique-composite'),
  require('./success/36-store-unique-redundant'),
  require('./success/37-store-soft-delete'),
  require('./success/38-store-relations'),
  require('./success/39-store-relations-matrix'),
  require('./success/40-match-call'),
  require('./success/41-response-encoding'),
  require('./success/42-request-multipart'),
  require('./success/43-request-body-matrix'),
  require('./success/44-profile-body-compat'),
  require('./success/45-ticket-attachments'),
  require('./success/46-expense-reports'),
  require('./success/47-request-match-combos'),
  require('./success/48-oauth-form-token')
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
  require('./error/proxy-errors'),
  require('./error/request-errors'),
  require('./error/store-errors'),
  require('./error/store-relations-errors'),
  require('./error/store-persist-corrupt'),
  require('./error/mock-config-errors')
];

const systemCases = [
  require('./system/mocks-dir-missing'),
  require('./system/no-files-found'),
  require('./system/port-invalid'),
  require('./system/port-out-of-range'),
  require('./system/proxy-flag-invalid'),
  require('./system/port-in-use'),
  require('./system/reset-store-invalid'),
  require('./system/cli-version-help'),
  require('./system/start-custom-path'),
  require('./system/init-cli'),
  require('./system/cli-commander-errors'),
  require('./system/add-cli-flags')
];

const runtimeCases = [
  require('./runtime/name-response-fallback'),
  require('./runtime/match-params'),
  require('./runtime/match-query-delay'),
  require('./runtime/match-body'),
  require('./runtime/match-combined'),
  require('./runtime/match-call'),
  require('./runtime/headers-and-null-body'),
  require('./runtime/all-http-methods'),
  require('./runtime/proxy-orphan-502'),
  require('./runtime/proxy-live'),
  require('./runtime/global-proxy-unmatched'),
  require('./runtime/proxy-request-failed'),
  require('./runtime/proxy-raw-body'),
  require('./runtime/response-encoding'),
  require('./runtime/request-multipart'),
  require('./runtime/request-body-matrix'),
  require('./runtime/request-match-combos'),
  require('./runtime/oauth-form-token'),
  require('./runtime/profile-body-compat'),
  require('./runtime/ticket-attachments'),
  require('./runtime/expense-reports'),
  require('./runtime/watch-restart-failed'),
  require('./runtime/rest-resource-lifecycle'),
  require('./runtime/checkout-resilience'),
  require('./runtime/multi-tenant-rbac'),
  require('./runtime/match-matrix'),
  require('./runtime/request-validation'),
  require('./runtime/request-matrix'),
  require('./runtime/request-saas'),
  require('./runtime/watch-request-failed'),
  require('./runtime/store-mutable'),
  require('./runtime/store-persist'),
  require('./runtime/store-matrix'),
  require('./runtime/store-persist-matrix'),
  require('./runtime/store-persist-write-failed'),
  require('./runtime/store-saas'),
  require('./runtime/store-rbac'),
  require('./runtime/store-list'),
  require('./runtime/store-commerce'),
  require('./runtime/store-helpdesk'),
  require('./runtime/store-hr'),
  require('./runtime/store-unique-composite'),
  require('./runtime/store-soft-delete'),
  require('./runtime/store-soft-delete-persist'),
  require('./runtime/store-relations'),
  require('./runtime/store-relations-matrix'),
  require('./runtime/store-relations-persist'),
  require('./runtime/mock-config-folders'),
  require('./runtime/mock-config-proxy-unmatched'),
  require('./runtime/mock-config-cascades'),
  require('./runtime/mock-config-exhaustive')
];

const unitCases = [
  require('./unit/unsupported-http-method'),
  require('./unit/fallback-response-missing'),
  require('./unit/match-call-counters'),
  require('./unit/package-json-missing'),
  require('./unit/mocks-folder-mkdir-failed'),
  require('./unit/invalid-mock-configuration'),
  require('./unit/store-response-clone'),
  require('./unit/mock-config-folders'),
  require('./unit/mock-config-invalid'),
  require('./unit/mock-config-filters'),
  require('./unit/mock-config-advanced'),
  require('./unit/add-mock'),
  require('./unit/add-crud-mock'),
  require('./unit/init-with-mock'),
  require('./unit/cli-io-errors')
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
