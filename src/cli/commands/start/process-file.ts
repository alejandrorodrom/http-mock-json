import { join } from 'path';
import * as fs from 'fs';
import { Api } from '../../../models/api.model';
import { RawMockFile } from '../../../types/mock.type';
import { LocalIssue } from '../../../types/validation.type';
import { hasProperty, isArray, isEmpty, isObject } from '../../../scripts/guards.script';
import { addIssues } from '../../../scripts/issues.script';
import { getKeys, iterateEntries } from '../../../scripts/objects.script';
import { validateEndpoint } from '../../../validators/endpoint.validator';
import { validateMethod } from '../../../validators/method.validator';
import { validateResponse } from '../../../validators/response.validator';
import { validateStore } from '../../../validators/store.validator';
import { JsonValue } from '../../../types/json.type';
import { MockResponseConfig, RawMockMethod } from '../../../interfaces/data.interface';
import { STORE_PROPERTY } from '../../../constants/store.constant';
import { RawStoreConfig, StoreDefinition } from '../../../types/store.type';
import { isStoreReference } from '../../../scripts/store-normalize.script';
import { normalizeRequest } from '../../../scripts/request-norm.script';

const collectConflictResponseNames = (definition: StoreDefinition): string[] => {
  const names = new Set<string>();

  if (definition.keyConflict?.response) {
    names.add(definition.keyConflict.response);
  }

  if (definition.uniqueConflict?.response) {
    names.add(definition.uniqueConflict.response);
  }

  for (const field of definition.uniqueFields) {
    if (field.conflict?.response) {
      names.add(field.conflict.response);
    }
  }

  return [...names];
};

export const loadMockFile = (
  file: string,
  folderPath: string,
  errorsByFile: Record<string, LocalIssue[]>
): RawMockFile | null => {
  try {
    const filePath = join(folderPath, file);
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(fileContent) as RawMockFile;

    if (!isObject(data)) {
      addIssues(errorsByFile, file, [{
        message: 'The file must contain a valid JSON object'
      }]);
      return null;
    }

    if (isEmpty(getKeys(data))) {
      addIssues(errorsByFile, file, [{
        message: 'The file does not contain any endpoints'
      }]);
      return null;
    }

    return data;
  } catch (error) {
    if (error instanceof SyntaxError) {
      addIssues(errorsByFile, file, [{
        message: `JSON syntax error: ${ error.message }`
      }]);
    } else {
      addIssues(errorsByFile, file, [{
        message: `Error processing file: ${ error instanceof Error ? error.message : String(error) }`
      }]);
    }
    return null;
  }
};

export const collectStoresFromData = (
  file: string,
  data: RawMockFile,
  errorsByFile: Record<string, LocalIssue[]>,
  warningsByFile: Record<string, LocalIssue[]>,
  stores: Map<string, StoreDefinition>,
  mocksDir: string
): void => {
  for (const [route, endpointData] of iterateEntries(data)) {
    if (!isObject(endpointData) || !hasProperty(endpointData, STORE_PROPERTY)) {
      continue;
    }

    const rawStore = (endpointData as Record<string, unknown>)[STORE_PROPERTY];
    const { errors, warnings, definition, isReference } = validateStore(
      route,
      rawStore,
      mocksDir
    );
    addIssues(errorsByFile, file, errors);
    addIssues(warningsByFile, file, warnings);

    if (isReference || !definition) {
      continue;
    }

    if (stores.has(definition.id)) {
      addIssues(errorsByFile, file, [{
        endpoint: route,
        message: `The store "${ definition.id }" is already defined`
      }]);
      continue;
    }

    stores.set(definition.id, definition);
  }
};

export const processMockData = (
  file: string,
  data: RawMockFile,
  errorsByFile: Record<string, LocalIssue[]>,
  warningsByFile: Record<string, LocalIssue[]>,
  apis: Api[],
  stores: Map<string, StoreDefinition>
): void => {
  for (const [route, endpointData] of iterateEntries(data)) {
    const endpointResult = validateEndpoint(route, endpointData);

    addIssues(errorsByFile, file, endpointResult.errors);
    addIssues(warningsByFile, file, endpointResult.warnings);

    if (!isObject(endpointData) || isEmpty(getKeys(endpointData))) {
      continue;
    }

    let storeId: string | undefined;
    let storeDefinition: StoreDefinition | undefined;

    if (hasProperty(endpointData, STORE_PROPERTY)) {
      const rawStore = (endpointData as Record<string, unknown>)[STORE_PROPERTY];

      if (isObject(rawStore)) {
        const config = rawStore as RawStoreConfig;

        if (typeof config.id === 'string' && config.id.length > 0) {
          storeId = config.id;
          storeDefinition = stores.get(config.id);

          if (isStoreReference(config) && !storeDefinition) {
            addIssues(errorsByFile, file, [{
              endpoint: route,
              message: `The store "${ config.id }" is referenced but not defined`
            }]);
          }
        }
      }
    }

    for (const [method, methodData] of iterateEntries(endpointData as Record<string, unknown>)) {
      if (method === STORE_PROPERTY) {
        continue;
      }

      const typedMethod = methodData as RawMockMethod;
      const methodResult = validateMethod(route, method, typedMethod);

      addIssues(errorsByFile, file, methodResult.errors);
      addIssues(warningsByFile, file, methodResult.warnings);

      if (!isObject(typedMethod) || !typedMethod.responses) {
        continue;
      }

      if (!isArray(typedMethod.responses)) {
        continue;
      }

      let hasResponseErrors = false;
      const responseNames = new Set<string>();

      for (const response of typedMethod.responses) {
        const responseResult = validateResponse(
          route,
          method,
          response,
          storeId !== undefined,
          Boolean(storeDefinition?.softDelete)
        );

        addIssues(errorsByFile, file, responseResult.errors);
        addIssues(warningsByFile, file, responseResult.warnings);

        if (!isEmpty(responseResult.errors)) {
          hasResponseErrors = true;
        }

        if (typeof response.name === 'string') {
          responseNames.add(response.name);
        }
      }

      if (storeDefinition) {
        const mutatingActions = typedMethod.responses.some(response => {
          return response.action === 'create'
            || response.action === 'update'
            || response.action === 'patch';
        });

        if (mutatingActions) {
          for (const name of collectConflictResponseNames(storeDefinition)) {
            if (!responseNames.has(name)) {
              addIssues(errorsByFile, file, [{
                endpoint: route,
                method,
                message: `The store conflict response "${ name }" does not exist in responses`
              }]);
              hasResponseErrors = true;
            }
          }
        }
      }

      if (isEmpty(methodResult.errors) && !hasResponseErrors) {
        const responses: MockResponseConfig[] = typedMethod.responses.map(response => ({
          name: response.name,
          status: Number(response.statusCode),
          headers: response.headers ?? {},
          body: (hasProperty(response, 'body') ? response.body : null) as JsonValue,
          delay: response.delay !== undefined ? Number(response.delay) : undefined,
          match: response.match,
          proxy: response.proxy,
          action: response.action
        }));

        apis.push(
          new Api({
            route: route,
            method: method,
            nameResponse: typedMethod.nameResponse,
            delay: typedMethod.delay !== undefined ? Number(typedMethod.delay) : undefined,
            proxy: typedMethod.proxy,
            request: typedMethod.request
              ? normalizeRequest(typedMethod.request)
              : undefined,
            storeId,
            responses
          })
        );
      }
    }
  }
};
