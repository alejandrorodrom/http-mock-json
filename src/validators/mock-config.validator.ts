import { MOCK_CONFIG_FOLDERS_PROPERTY } from '../constants/mock-config.constant';
import { VALID_ENDPOINT_REGEXP } from '../constants/validation.constant';
import { hasProperty, isArray, isObject, isValidNumber } from '../scripts/guards.script';
import { isHttpUrl } from '../scripts/http-url.script';
import { getKeys, iterateEntries } from '../scripts/objects.script';
import { MockConfig, MockConfigHeaders, MockFolderConfig } from '../types/mock-config.type';
import { LocalIssue } from '../types/validation.type';
import { validateDelay } from './delay.validator';
import { validateProxyValue } from './proxy.validator';

const FOLDER_NAME_REGEXP = /^[a-zA-Z0-9._-]+$/;
const STORE_NAMESPACE_REGEXP = /^[a-zA-Z0-9._-]+$/;

const normalizePrefixForValidation = (prefix: string): string => {
  return prefix.trim().replace(/^\/+|\/+$/g, '');
};

const validateConfigHeaders = (
  propertyPath: string,
  headers: unknown
): LocalIssue[] => {
  if (!isObject(headers)) {
    return [{
      endpoint: propertyPath,
      message: `The "${ propertyPath }" must be an object`
    }];
  }

  const errors: LocalIssue[] = [];

  for (const [key, value] of iterateEntries(headers as Record<string, unknown>)) {
    if (typeof value !== 'string') {
      errors.push({
        endpoint: propertyPath,
        message: `The "${ propertyPath }.${ key }" must be a string`
      });
    }
  }

  return errors;
};

const validateStringPatternList = (
  propertyPath: string,
  value: unknown
): LocalIssue[] => {
  if (!isArray(value)) {
    return [{
      endpoint: propertyPath,
      message: `The "${ propertyPath }" must be an array of strings`
    }];
  }

  const errors: LocalIssue[] = [];

  for (const [index, entry] of value.entries()) {
    if (typeof entry !== 'string' || entry.trim().length === 0) {
      errors.push({
        endpoint: propertyPath,
        message: `The "${ propertyPath }[${ index }]" must be a non-empty string`
      });
    }
  }

  return errors;
};

const validateFolderPrefix = (folderName: string, prefix: unknown): LocalIssue[] => {
  const propertyPath = `${ MOCK_CONFIG_FOLDERS_PROPERTY }.${ folderName }.prefix`;

  if (typeof prefix !== 'string') {
    return [{
      endpoint: propertyPath,
      message: `The "${ propertyPath }" must be a string`
    }];
  }

  const normalized = normalizePrefixForValidation(prefix);

  if (normalized.length === 0) {
    return [{
      endpoint: propertyPath,
      message: `The "${ propertyPath }" must be a non-empty path`
    }];
  }

  if (normalized.includes(':')) {
    return [{
      endpoint: propertyPath,
      message: `The "${ propertyPath }" cannot contain route parameters`
    }];
  }

  if (!VALID_ENDPOINT_REGEXP.test(normalized)) {
    return [{
      endpoint: propertyPath,
      message: `Invalid "${ propertyPath }". Allowed characters: letters, numbers, "-", "_", ".", "~", and "/".`
    }];
  }

  return [];
};

const validateFolderConfig = (
  folderName: string,
  folderConfig: unknown
): LocalIssue[] => {
  const propertyPath = `${ MOCK_CONFIG_FOLDERS_PROPERTY }.${ folderName }`;
  const errors: LocalIssue[] = [];

  if (!FOLDER_NAME_REGEXP.test(folderName)) {
    errors.push({
      endpoint: propertyPath,
      message: `The folder name "${ folderName }" is invalid. Use only letters, numbers, "-", "_", and "."`
    });
  }

  if (!isObject(folderConfig)) {
    errors.push({
      endpoint: propertyPath,
      message: `The "${ propertyPath }" must be an object`
    });
    return errors;
  }

  const config = folderConfig as MockFolderConfig;

  if (hasProperty(config, 'prefix')) {
    errors.push(...validateFolderPrefix(folderName, config.prefix));
  }

  if (hasProperty(config, 'delay')) {
    errors.push(...validateDelay(
      `${ propertyPath }.delay`,
      '',
      config.delay,
      `${ propertyPath }.delay`
    ));
  }

  if (hasProperty(config, 'proxy')) {
    errors.push(...validateProxyValue(
      `${ propertyPath }.proxy`,
      '',
      config.proxy,
      { allowTrue: false }
    ));
  }

  if (hasProperty(config, 'headers')) {
    errors.push(...validateConfigHeaders(`${ propertyPath }.headers`, config.headers));
  }

  if (hasProperty(config, 'enabled') && typeof config.enabled !== 'boolean') {
    errors.push({
      endpoint: `${ propertyPath }.enabled`,
      message: `The "${ propertyPath }.enabled" must be a boolean`
    });
  }

  if (hasProperty(config, 'include')) {
    errors.push(...validateStringPatternList(`${ propertyPath }.include`, config.include));
  }

  if (hasProperty(config, 'exclude')) {
    errors.push(...validateStringPatternList(`${ propertyPath }.exclude`, config.exclude));
  }

  if (hasProperty(config, 'stripPrefix')) {
    if (typeof config.stripPrefix !== 'boolean') {
      errors.push({
        endpoint: `${ propertyPath }.stripPrefix`,
        message: `The "${ propertyPath }.stripPrefix" must be a boolean`
      });
    } else if (config.stripPrefix === true && !hasProperty(config, 'prefix')) {
      errors.push({
        endpoint: `${ propertyPath }.stripPrefix`,
        message: `The "${ propertyPath }.stripPrefix" requires "${ propertyPath }.prefix"`
      });
    }
  }

  if (hasProperty(config, 'proxyUnmatched')) {
    if (typeof config.proxyUnmatched !== 'string' || !isHttpUrl(config.proxyUnmatched)) {
      errors.push({
        endpoint: `${ propertyPath }.proxyUnmatched`,
        message: `The "${ propertyPath }.proxyUnmatched" must be a valid http or https URL`
      });
    } else if (!hasProperty(config, 'prefix')) {
      errors.push({
        endpoint: `${ propertyPath }.proxyUnmatched`,
        message: `The "${ propertyPath }.proxyUnmatched" requires "${ propertyPath }.prefix"`
      });
    }
  }

  if (hasProperty(config, 'storeNamespace')) {
    if (
      typeof config.storeNamespace !== 'string'
      || config.storeNamespace.trim().length === 0
      || !STORE_NAMESPACE_REGEXP.test(config.storeNamespace.trim())
    ) {
      errors.push({
        endpoint: `${ propertyPath }.storeNamespace`,
        message: `The "${ propertyPath }.storeNamespace" must be a non-empty string using letters, numbers, "-", "_", and "."`
      });
    }
  }

  return errors;
};

export const validateMockConfig = (config: unknown): LocalIssue[] => {
  const errors: LocalIssue[] = [];

  if (!isObject(config)) {
    return [{
      message: 'The file must contain a valid JSON object'
    }];
  }

  const mockConfig = config as MockConfig;

  if (hasProperty(mockConfig, 'prefix')) {
    errors.push({
      endpoint: 'prefix',
      message: 'The "prefix" is only allowed inside "folders"'
    });
  }

  if (hasProperty(mockConfig, 'delay')) {
    errors.push(...validateDelay('delay', '', mockConfig.delay, 'delay'));
  }

  if (hasProperty(mockConfig, 'proxy')) {
    errors.push(...validateProxyValue('proxy', '', mockConfig.proxy, { allowTrue: false }));
  }

  if (hasProperty(mockConfig, 'headers')) {
    errors.push(...validateConfigHeaders('headers', mockConfig.headers));
  }

  if (hasProperty(mockConfig, 'strictDuplicates') && typeof mockConfig.strictDuplicates !== 'boolean') {
    errors.push({
      endpoint: 'strictDuplicates',
      message: 'The "strictDuplicates" must be a boolean'
    });
  }

  if (hasProperty(mockConfig, 'port')) {
    if (!isValidNumber(mockConfig.port)) {
      errors.push({
        endpoint: 'port',
        message: 'The "port" must be a valid number'
      });
    } else {
      const port = Number(mockConfig.port);
      if (!Number.isInteger(port)) {
        errors.push({
          endpoint: 'port',
          message: 'The "port" must be an integer'
        });
      } else if (port < 1 || port > 65535) {
        errors.push({
          endpoint: 'port',
          message: 'The "port" must be between 1 and 65535'
        });
      }
    }
  }

  if (!hasProperty(mockConfig, MOCK_CONFIG_FOLDERS_PROPERTY)) {
    return errors;
  }

  const folders = mockConfig.folders;

  if (!isObject(folders)) {
    errors.push({
      endpoint: MOCK_CONFIG_FOLDERS_PROPERTY,
      message: `The "${ MOCK_CONFIG_FOLDERS_PROPERTY }" must be an object`
    });
    return errors;
  }

  for (const [folderName, folderConfig] of iterateEntries(folders as Record<string, unknown>)) {
    errors.push(...validateFolderConfig(folderName, folderConfig));
  }

  return errors;
};

const normalizeHeaders = (headers: MockConfigHeaders | undefined): MockConfigHeaders | undefined => {
  if (!headers) {
    return undefined;
  }

  return { ...headers };
};

const normalizePatternList = (patterns: string[] | undefined): string[] | undefined => {
  if (!patterns) {
    return undefined;
  }

  return patterns.map(pattern => pattern.trim());
};

export const normalizeMockConfig = (config: MockConfig): MockConfig => {
  const folders = config.folders
    ? Object.fromEntries(
      getKeys(config.folders).map(folderName => {
        const folder = config.folders![folderName];
        const normalized: MockFolderConfig = {};

        if (folder.prefix !== undefined) {
          normalized.prefix = normalizePrefixForValidation(folder.prefix);
        }

        if (folder.delay !== undefined) {
          normalized.delay = Number(folder.delay);
        }

        if (folder.proxy !== undefined) {
          normalized.proxy = folder.proxy;
        }

        if (folder.headers !== undefined) {
          normalized.headers = normalizeHeaders(folder.headers);
        }

        if (folder.enabled !== undefined) {
          normalized.enabled = folder.enabled;
        }

        if (folder.include !== undefined) {
          normalized.include = normalizePatternList(folder.include);
        }

        if (folder.exclude !== undefined) {
          normalized.exclude = normalizePatternList(folder.exclude);
        }

        if (folder.stripPrefix !== undefined) {
          normalized.stripPrefix = folder.stripPrefix;
        }

        if (folder.proxyUnmatched !== undefined) {
          normalized.proxyUnmatched = folder.proxyUnmatched;
        }

        if (folder.storeNamespace !== undefined) {
          normalized.storeNamespace = folder.storeNamespace.trim();
        }

        return [folderName, normalized];
      })
    )
    : undefined;

  return {
    delay: config.delay !== undefined ? Number(config.delay) : undefined,
    proxy: config.proxy,
    headers: normalizeHeaders(config.headers),
    strictDuplicates: config.strictDuplicates,
    port: config.port !== undefined ? Number(config.port) : undefined,
    folders
  };
};
