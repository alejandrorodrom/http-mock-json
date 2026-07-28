import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import { extname, join } from 'path';
import { MOCK_CONFIG_FILENAME } from '../constants/mock-config.constant';
import { MockConfig, MockFileDefaults, MockFolderConfig, ProxyUnmatchedMount } from '../types/mock-config.type';
import { StoreDefinition } from '../types/store.type';
import { LocalIssue } from '../types/validation.type';
import { getKeys } from './objects.script';
import { normalizeMockConfig, validateMockConfig } from '../validators/mock-config.validator';

export type LoadMockConfigResult = {
  config: MockConfig | null;
  errors: LocalIssue[];
};

export type DiscoverMockFilesResult = {
  files: string[];
  errors: LocalIssue[];
};

const isJsonMockFile = (fileName: string): boolean => {
  return extname(fileName) === '.json' && fileName !== MOCK_CONFIG_FILENAME;
};

const escapeRegex = (value: string): string => {
  return value.replace(/[.+^${}()|[\]\\]/g, '\\$&');
};

const patternToRegExp = (pattern: string): RegExp => {
  let source = '';

  for (const char of pattern) {
    if (char === '*') {
      source += '.*';
      continue;
    }

    if (char === '?') {
      source += '.';
      continue;
    }

    source += escapeRegex(char);
  }

  return new RegExp(`^${ source }$`);
};

export const matchesFilePatterns = (
  fileName: string,
  patterns: string[] | undefined
): boolean => {
  if (!patterns || patterns.length === 0) {
    return false;
  }

  return patterns.some(pattern => patternToRegExp(pattern).test(fileName));
};

export const isFolderFileIncluded = (
  fileName: string,
  folderConfig: MockFolderConfig
): boolean => {
  if (folderConfig.include && folderConfig.include.length > 0) {
    if (!matchesFilePatterns(fileName, folderConfig.include)) {
      return false;
    }
  }

  if (folderConfig.exclude && folderConfig.exclude.length > 0) {
    if (matchesFilePatterns(fileName, folderConfig.exclude)) {
      return false;
    }
  }

  return true;
};

export const joinRoutePrefix = (prefix: string | undefined, route: string): string => {
  const normalizedRoute = route.replace(/^\/+|\/+$/g, '');

  if (!prefix) {
    return normalizedRoute;
  }

  const normalizedPrefix = prefix.replace(/^\/+|\/+$/g, '');

  if (!normalizedPrefix) {
    return normalizedRoute;
  }

  if (!normalizedRoute) {
    return normalizedPrefix;
  }

  return `${ normalizedPrefix }/${ normalizedRoute }`;
};

export const mergeHeaders = (
  defaults: Record<string, string> | undefined,
  responseHeaders: Record<string, string> | undefined
): Record<string, string> => {
  return {
    ...(defaults ?? {}),
    ...(responseHeaders ?? {})
  };
};

export const applyStoreNamespace = (
  storeId: string,
  namespace: string | undefined
): string => {
  if (!namespace || storeId.includes(':')) {
    return storeId;
  }

  return `${ namespace }:${ storeId }`;
};

export const namespaceStoreDefinition = (
  definition: StoreDefinition,
  namespace: string | undefined
): StoreDefinition => {
  if (!namespace) {
    return definition;
  }

  return {
    ...definition,
    id: applyStoreNamespace(definition.id, namespace),
    relations: definition.relations.map(relation => ({
      ...relation,
      storeId: applyStoreNamespace(relation.storeId, namespace)
    }))
  };
};

export const resolveMockPort = (
  cliPort: number | undefined,
  config: MockConfig | null
): number => {
  return cliPort ?? config?.port ?? 3000;
};

export const getProxyUnmatchedMounts = (
  config: MockConfig | null
): ProxyUnmatchedMount[] => {
  if (!config?.folders) {
    return [];
  }

  const mounts: ProxyUnmatchedMount[] = [];

  for (const folderName of getKeys(config.folders)) {
    const folder = config.folders[folderName];

    if (folder.enabled === false || !folder.prefix || !folder.proxyUnmatched) {
      continue;
    }

    const normalizedPrefix = folder.prefix.replace(/^\/+|\/+$/g, '');

    mounts.push({
      prefix: `/${ normalizedPrefix }`,
      target: folder.proxyUnmatched,
      stripPrefix: folder.stripPrefix ? `/${ normalizedPrefix }` : undefined
    });
  }

  return mounts;
};

export const resolveFileDefaults = (
  relativeFile: string,
  config: MockConfig | null
): MockFileDefaults | undefined => {
  if (!config) {
    return undefined;
  }

  const separatorIndex = relativeFile.indexOf('/');

  if (separatorIndex === -1) {
    if (
      config.delay === undefined
      && config.proxy === undefined
      && config.headers === undefined
    ) {
      return undefined;
    }

    return {
      delay: config.delay,
      proxy: config.proxy,
      headers: config.headers
    };
  }

  const folderName = relativeFile.slice(0, separatorIndex);
  const folderConfig = config.folders?.[folderName];
  const headers = mergeHeaders(config.headers, folderConfig?.headers);
  const hasHeaders = Object.keys(headers).length > 0;
  const normalizedPrefix = folderConfig?.prefix
    ? folderConfig.prefix.replace(/^\/+|\/+$/g, '')
    : undefined;

  return {
    prefix: folderConfig?.prefix,
    delay: folderConfig?.delay ?? config.delay,
    proxy: folderConfig?.proxy ?? config.proxy,
    headers: hasHeaders ? headers : undefined,
    stripPrefix: folderConfig?.stripPrefix && normalizedPrefix
      ? `/${ normalizedPrefix }`
      : undefined,
    storeNamespace: folderConfig?.storeNamespace
  };
};

export const loadMockConfig = (mocksDir: string): LoadMockConfigResult => {
  const configPath = join(mocksDir, MOCK_CONFIG_FILENAME);

  if (!existsSync(configPath)) {
    return { config: null, errors: [] };
  }

  try {
    const fileContent = readFileSync(configPath, 'utf-8');
    const data = JSON.parse(fileContent) as unknown;
    const errors = validateMockConfig(data);

    if (errors.length > 0) {
      return { config: null, errors };
    }

    return {
      config: normalizeMockConfig(data as MockConfig),
      errors: []
    };
  } catch (error) {
    if (error instanceof SyntaxError) {
      return {
        config: null,
        errors: [{
          message: `JSON syntax error: ${ error.message }`
        }]
      };
    }

    return {
      config: null,
      errors: [{
        message: `Error processing file: ${ error instanceof Error ? error.message : String(error) }`
      }]
    };
  }
};

export const discoverMockFiles = (
  mocksDir: string,
  config: MockConfig | null
): DiscoverMockFilesResult => {
  const errors: LocalIssue[] = [];
  const files: string[] = [];

  const rootEntries = readdirSync(mocksDir);

  for (const entry of rootEntries) {
    const absolutePath = join(mocksDir, entry);

    if (!statSync(absolutePath).isFile()) {
      continue;
    }

    if (isJsonMockFile(entry)) {
      files.push(entry);
    }
  }

  if (!config?.folders) {
    return { files, errors };
  }

  for (const folderName of getKeys(config.folders)) {
    const folderConfig = config.folders[folderName];
    const folderPath = join(mocksDir, folderName);

    if (!existsSync(folderPath) || !statSync(folderPath).isDirectory()) {
      errors.push({
        endpoint: `folders.${ folderName }`,
        message: `The folder "${ folderName }" does not exist inside mocks`
      });
      continue;
    }

    if (folderConfig.enabled === false) {
      continue;
    }

    for (const entry of readdirSync(folderPath)) {
      const absolutePath = join(folderPath, entry);

      if (!statSync(absolutePath).isFile() || !isJsonMockFile(entry)) {
        continue;
      }

      if (!isFolderFileIncluded(entry, folderConfig)) {
        continue;
      }

      files.push(`${ folderName }/${ entry }`);
    }
  }

  return { files, errors };
};
