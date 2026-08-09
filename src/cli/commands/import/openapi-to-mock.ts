import { OpenAPIV3, OpenAPIV3_1 } from 'openapi-types';
import { VALID_ENDPOINT_REGEXP, VALID_HTTP_METHODS } from '../../../constants/validation.constant';
import { RawMockFile } from '../../../types/mock.type';
import { RawMockMethod, RawMockResponse } from '../../../interfaces/data.interface';
import { normalizeEndpoint } from '../add/normalize-endpoint';
import { OpenApiDocument } from './openapi-load';
import { buildSchemaExample } from './schema-example';
import { buildOperationRequest } from './schema-to-request';
import { resolveOpenApiRoutePrefix } from './server-prefix';

type HttpMethodLower = 'get' | 'post' | 'put' | 'patch' | 'delete';
type PathItem = OpenAPIV3.PathItemObject | OpenAPIV3_1.PathItemObject;
type Operation = OpenAPIV3.OperationObject | OpenAPIV3_1.OperationObject;
type ResponseObject = OpenAPIV3.ResponseObject | OpenAPIV3_1.ResponseObject;
type MediaType = OpenAPIV3.MediaTypeObject | OpenAPIV3_1.MediaTypeObject;

const SUPPORTED_METHODS: HttpMethodLower[] = ['get', 'post', 'put', 'patch', 'delete'];

export type ImportMockBundle = {
  /** Folder name when using mock.config prefix layout; otherwise unused. */
  folder?: string;
  fileName: string;
  mock: RawMockFile;
};

export type OpenApiToMockResult = {
  bundles: ImportMockBundle[];
  warnings: string[];
  endpointCount: number;
  skippedOperations: number;
  /** Shared route prefix from servers[0] / --prefix (e.g. "/planetary"). */
  routePrefix?: string;
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
};

const sanitizeFileName = (value: string): string => {
  const cleaned = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._~-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');

  return cleaned.length > 0 ? cleaned : 'untagged';
};

const openApiPathToEndpoint = (openApiPath: string): string => {
  const withParams = openApiPath.replace(/\{([a-zA-Z0-9_.-]+)\}/g, ':$1');
  return normalizeEndpoint(withParams);
};

const pickJsonMedia = (
  content: Record<string, MediaType> | undefined
): { media: MediaType | undefined; warned: boolean } => {
  if (!content || Object.keys(content).length === 0) {
    return { media: undefined, warned: false };
  }

  if (content['application/json']) {
    return { media: content['application/json'], warned: false };
  }

  const jsonKey = Object.keys(content).find((key) =>
    key.toLowerCase().includes('json')
  );

  if (jsonKey) {
    return { media: content[jsonKey], warned: false };
  }

  return { media: content[Object.keys(content)[0]], warned: true };
};

const exampleFromMedia = (media: MediaType | undefined): { body: unknown; empty: boolean } => {
  if (!media) {
    return { body: {}, empty: true };
  }

  if (media.example !== undefined) {
    return { body: media.example, empty: false };
  }

  if (media.examples && isRecord(media.examples)) {
    for (const example of Object.values(media.examples)) {
      if (isRecord(example) && 'value' in example) {
        return { body: (example as { value: unknown }).value, empty: false };
      }
    }
  }

  if (media.schema) {
    const body = buildSchemaExample(media.schema);
    const schemaType = (media.schema as { type?: string | string[] }).type;
    const emptyObject =
      body !== null
      && typeof body === 'object'
      && !Array.isArray(body)
      && Object.keys(body as object).length === 0
      && schemaType === undefined;

    return { body, empty: emptyObject };
  }

  return { body: {}, empty: true };
};

const parseStatusCode = (code: string): { statusCode: number; name: string } => {
  if (code.toLowerCase() === 'default') {
    return { statusCode: 400, name: 'error_default' };
  }

  const range = code.toUpperCase().match(/^([1-5])XX$/);
  if (range) {
    const statusCode = Number(range[1]) * 100;
    const prefix = statusCode >= 400 ? 'error' : 'success';
    return { statusCode, name: `${ prefix }_${ code.toLowerCase() }` };
  }

  const statusCode = Number.parseInt(code, 10);
  if (!Number.isFinite(statusCode)) {
    return { statusCode: 400, name: `error_${ sanitizeFileName(code) }` };
  }

  const prefix = statusCode >= 400 ? 'error' : 'success';
  return { statusCode, name: `${ prefix }_${ statusCode }` };
};

const operationToMethod = (
  operation: Operation,
  pathParameters: unknown[] | undefined,
  warnings: string[],
  pathKey: string,
  method: string,
  includeRequest: boolean
): RawMockMethod | null => {
  const responses = operation.responses ?? {};
  const entries = Object.entries(responses);

  if (entries.length === 0) {
    warnings.push(`${ method.toUpperCase() } ${ pathKey }: no responses documented; skipped`);
    return null;
  }

  const mockResponses: RawMockResponse[] = [];
  let defaultName: string | undefined;

  for (const [code, response] of entries) {
    if (!response || typeof response !== 'object' || Array.isArray(response)) {
      continue;
    }

    // After dereference, $ref should be gone; skip leftover refs defensively
    if ('$ref' in response) {
      warnings.push(`${ method.toUpperCase() } ${ pathKey } ${ code }: unresolved $ref; skipped`);
      continue;
    }

    const responseObject = response as ResponseObject;
    const { statusCode, name } = parseStatusCode(code);
    const { media, warned } = pickJsonMedia(
      responseObject.content as Record<string, MediaType> | undefined
    );

    if (warned) {
      warnings.push(
        `${ method.toUpperCase() } ${ pathKey } ${ code }: no application/json content; using empty body`
      );
    }

    const { body, empty } = exampleFromMedia(media);
    if (empty && !responseObject.content) {
      // no content at all (e.g. 204) — empty object is fine
    } else if (empty) {
      warnings.push(
        `${ method.toUpperCase() } ${ pathKey } ${ code }: no example/schema; using empty body`
      );
    }

    mockResponses.push({
      name,
      statusCode,
      body: body as RawMockResponse['body']
    });

    if (!defaultName && statusCode >= 200 && statusCode < 300) {
      defaultName = name;
    }
  }

  if (mockResponses.length === 0) {
    warnings.push(`${ method.toUpperCase() } ${ pathKey }: no usable responses; skipped`);
    return null;
  }

  const mockMethod: RawMockMethod = {
    nameResponse: defaultName ?? mockResponses[0].name,
    responses: mockResponses
  };

  if (includeRequest) {
    const built = buildOperationRequest(
      operation,
      pathParameters,
      { method, pathKey }
    );
    warnings.push(...built.warnings);
    if (built.request) {
      mockMethod.request = built.request;
    }
  }

  return mockMethod;
};

const titleFromDocument = (document: OpenApiDocument): string => {
  const info = (document as { info?: { title?: string } }).info;
  if (info?.title && info.title.trim().length > 0) {
    return sanitizeFileName(info.title);
  }
  return 'openapi';
};

/**
 * Convert a dereferenced OpenAPI 3 document into mock JSON bundles.
 *
 * When a shared server path prefix exists, bundles are meant for mock.config
 * folders (same prefix on every tag folder). Paths inside JSON stay relative
 * to that prefix (OpenAPI `paths` as-is).
 */
export const openApiToMock = (
  document: OpenApiDocument,
  options: {
    splitTags: boolean;
    out?: string;
    prefix?: string;
    useServerPrefix?: boolean;
    /** When false, skip generating request.payload/query/headers (--no-request). */
    includeRequest?: boolean;
  }
): OpenApiToMockResult => {
  const warnings: string[] = [];
  const paths = (document as OpenAPIV3.Document).paths ?? {};
  const includeRequest = options.includeRequest !== false;

  const prefixResult = resolveOpenApiRoutePrefix(document, {
    prefix: options.prefix,
    useServerPrefix: options.useServerPrefix !== false
  });
  if (prefixResult.warning) {
    warnings.push(prefixResult.warning);
  }
  const routePrefix = prefixResult.prefix;
  const useFolders = Boolean(routePrefix);

  type Acc = Map<string, RawMockFile>;
  const byTag: Acc = new Map();
  const single: RawMockFile = {};

  let endpointCount = 0;
  let skippedOperations = 0;
  const seenEndpointMethods = new Set<string>();

  for (const [rawPath, pathItem] of Object.entries(paths)) {
    if (!pathItem || typeof pathItem !== 'object') {
      continue;
    }

    const endpoint = openApiPathToEndpoint(rawPath);

    if (!VALID_ENDPOINT_REGEXP.test(endpoint)) {
      warnings.push(`Path "${ rawPath }" → "${ endpoint }" is not a valid mock endpoint; skipped`);
      skippedOperations += SUPPORTED_METHODS.filter(
        (method) => Boolean((pathItem as PathItem)[method])
      ).length;
      continue;
    }

    const item = pathItem as PathItem;
    const pathParameters = (item as { parameters?: unknown[] }).parameters;

    for (const method of SUPPORTED_METHODS) {
      const operation = item[method] as Operation | undefined;
      if (!operation) {
        continue;
      }

      const mockMethod = operationToMethod(
        operation,
        pathParameters,
        warnings,
        endpoint,
        method,
        includeRequest
      );
      if (!mockMethod) {
        skippedOperations += 1;
        continue;
      }

      const methodKey = method.toUpperCase();
      if (!VALID_HTTP_METHODS.includes(methodKey)) {
        skippedOperations += 1;
        continue;
      }

      const dedupeKey = `${ endpoint }::${ methodKey }`;
      if (seenEndpointMethods.has(dedupeKey)) {
        warnings.push(`Duplicate ${ methodKey } ${ endpoint }; keeping first occurrence`);
        skippedOperations += 1;
        continue;
      }
      seenEndpointMethods.add(dedupeKey);

      const tag = operation.tags?.[0]?.trim() || 'untagged';
      const target: RawMockFile = options.splitTags
        ? (byTag.get(sanitizeFileName(tag)) ?? (byTag.set(sanitizeFileName(tag), {}), byTag.get(sanitizeFileName(tag))!))
        : single;

      const existing = (target[endpoint] ?? {}) as Record<string, RawMockMethod>;
      existing[methodKey] = mockMethod;
      target[endpoint] = existing;
      endpointCount += 1;
    }

    // Unsupported methods on this path
    for (const key of Object.keys(item)) {
      const lower = key.toLowerCase();
      if (
        ['parameters', 'summary', 'description', 'servers', '$ref'].includes(lower)
      ) {
        continue;
      }
      if (
        ['get', 'post', 'put', 'patch', 'delete', 'options', 'head', 'trace'].includes(lower)
        && !SUPPORTED_METHODS.includes(lower as HttpMethodLower)
        && (item as Record<string, unknown>)[key]
      ) {
        warnings.push(`${ key.toUpperCase() } ${ endpoint }: HTTP method not supported; skipped`);
        skippedOperations += 1;
      }
    }
  }

  const bundles: ImportMockBundle[] = [];

  if (options.splitTags) {
    for (const [tag, mock] of byTag.entries()) {
      if (Object.keys(mock).length === 0) {
        continue;
      }
      bundles.push({
        folder: useFolders ? tag : undefined,
        fileName: tag,
        mock
      });
    }
  } else {
    const fileName = sanitizeFileName(options.out?.trim() || titleFromDocument(document));
    if (Object.keys(single).length > 0) {
      bundles.push({
        folder: useFolders ? fileName : undefined,
        fileName,
        mock: single
      });
    }
  }

  return { bundles, warnings, endpointCount, skippedOperations, routePrefix };
};
