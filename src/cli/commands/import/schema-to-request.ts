import { OpenAPIV3, OpenAPIV3_1 } from 'openapi-types';
import {
  FieldRule,
  FieldSchema,
  RawMockRequest,
  RequestAs,
  StringFieldFormat
} from '../../../types/request.type';

type JsonSchema = {
  type?: string | string[];
  enum?: unknown[];
  properties?: Record<string, JsonSchema>;
  required?: string[];
  items?: JsonSchema | JsonSchema[];
  allOf?: JsonSchema[];
  oneOf?: JsonSchema[];
  anyOf?: JsonSchema[];
  nullable?: boolean;
  minLength?: number;
  maxLength?: number;
  minimum?: number;
  maximum?: number;
  pattern?: string;
  format?: string;
  minItems?: number;
  maxItems?: number;
};

type MediaType = OpenAPIV3.MediaTypeObject | OpenAPIV3_1.MediaTypeObject;
type ParameterObject = OpenAPIV3.ParameterObject | OpenAPIV3_1.ParameterObject;
type RequestBodyObject = OpenAPIV3.RequestBodyObject | OpenAPIV3_1.RequestBodyObject;

const MAX_DEPTH = 6;

const STRING_FORMATS = new Set<StringFieldFormat>(['email', 'uuid', 'url', 'date']);

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
};

const primaryType = (schema: JsonSchema): string | undefined => {
  if (Array.isArray(schema.type)) {
    return schema.type.find((item) => item !== 'null');
  }

  return schema.type;
};

const mapFormat = (
  format: string | undefined,
  warnings: string[],
  label: string
): StringFieldFormat | undefined => {
  if (!format) {
    return undefined;
  }

  if (format === 'uri') {
    return 'url';
  }

  if (STRING_FORMATS.has(format as StringFieldFormat)) {
    return format as StringFieldFormat;
  }

  if (format === 'date-time') {
    warnings.push(`${ label }: format "date-time" mapped to "date"`);
    return 'date';
  }

  warnings.push(`${ label }: unsupported format "${ format }"; omitted`);
  return undefined;
};

const mergeAllOf = (parts: JsonSchema[]): JsonSchema => {
  const merged: JsonSchema = {
    type: 'object',
    properties: {},
    required: []
  };

  for (const part of parts) {
    if (part.properties) {
      merged.properties = { ...merged.properties, ...part.properties };
    }
    if (Array.isArray(part.required)) {
      merged.required = [...(merged.required ?? []), ...part.required];
    }
    if (part.type && !merged.type) {
      merged.type = part.type;
    }
  }

  return merged;
};

/**
 * Map a dereferenced JSON Schema / OpenAPI schema node to a FieldRule.
 * Returns null when the schema cannot be represented safely.
 */
export const schemaToFieldRule = (
  schema: unknown,
  warnings: string[],
  label: string,
  depth = 0,
  seen: WeakSet<object> = new WeakSet()
): FieldRule | null => {
  if (schema === null || schema === undefined || typeof schema !== 'object') {
    return null;
  }

  const node = schema as JsonSchema;

  if (seen.has(node)) {
    warnings.push(`${ label }: circular schema; skipped`);
    return null;
  }

  if (depth >= MAX_DEPTH) {
    warnings.push(`${ label }: schema depth limit (${ MAX_DEPTH }); skipped`);
    return null;
  }

  seen.add(node);

  if (Array.isArray(node.allOf) && node.allOf.length > 0) {
    return schemaToFieldRule(mergeAllOf(node.allOf), warnings, label, depth, seen);
  }

  if (Array.isArray(node.oneOf) && node.oneOf.length > 0) {
    warnings.push(`${ label }: oneOf — using first branch`);
    return schemaToFieldRule(node.oneOf[0], warnings, label, depth + 1, seen);
  }

  if (Array.isArray(node.anyOf) && node.anyOf.length > 0) {
    warnings.push(`${ label }: anyOf — using first branch`);
    return schemaToFieldRule(node.anyOf[0], warnings, label, depth + 1, seen);
  }

  const type = primaryType(node);

  if (type === 'integer' || type === 'number') {
    const rule: FieldRule = { type: 'number' };
    if (typeof node.minimum === 'number') {
      rule.min = node.minimum;
    }
    if (typeof node.maximum === 'number') {
      rule.max = node.maximum;
    }
    if (Array.isArray(node.enum) && node.enum.every((item) => typeof item === 'number')) {
      rule.enum = node.enum as number[];
    }
    return rule;
  }

  if (type === 'boolean') {
    return { type: 'boolean' };
  }

  if (type === 'string' || (!type && node.format === 'binary')) {
    if (node.format === 'binary' || node.format === 'byte') {
      return { type: 'file' };
    }

    const rule: FieldRule = { type: 'string' };
    if (typeof node.minLength === 'number') {
      rule.minLength = node.minLength;
    }
    if (typeof node.maxLength === 'number') {
      rule.maxLength = node.maxLength;
    }
    if (typeof node.pattern === 'string' && node.pattern.length > 0) {
      rule.pattern = node.pattern;
    }
    const format = mapFormat(node.format, warnings, label);
    if (format) {
      rule.format = format;
    }
    if (Array.isArray(node.enum) && node.enum.every((item) => typeof item === 'string')) {
      rule.enum = node.enum as string[];
    }
    return rule;
  }

  if (type === 'array') {
    const itemsSchema = Array.isArray(node.items) ? node.items[0] : node.items;
    const items = schemaToFieldRule(
      itemsSchema ?? { type: 'string' },
      warnings,
      `${ label }.items`,
      depth + 1,
      seen
    );
    const rule: FieldRule = {
      type: 'array',
      items: items ?? { type: 'string' }
    };
    if (typeof node.minItems === 'number') {
      rule.minItems = node.minItems;
    }
    if (typeof node.maxItems === 'number') {
      rule.maxItems = node.maxItems;
    }
    return rule;
  }

  if (type === 'object' || (!type && node.properties)) {
    const properties = node.properties ?? {};
    const required = new Set(node.required ?? []);
    const mapped: Record<string, FieldSchema> = {};

    for (const [key, prop] of Object.entries(properties)) {
      const child = schemaToFieldRule(
        prop,
        warnings,
        `${ label }.${ key }`,
        depth + 1,
        seen
      );
      if (!child) {
        continue;
      }
      const fieldKey = required.has(key) ? key : `${ key }?`;
      mapped[fieldKey] = child;
    }

    if (Object.keys(mapped).length === 0) {
      return { type: 'object' };
    }

    return { type: 'object', properties: mapped };
  }

  warnings.push(`${ label }: unsupported schema type "${ type ?? 'unknown' }"; skipped`);
  return null;
};

const objectSchemaToPayloadFields = (
  schema: unknown,
  warnings: string[],
  label: string
): Record<string, FieldSchema> | null => {
  const rule = schemaToFieldRule(schema, warnings, label);
  if (!rule || rule.type !== 'object' || !rule.properties) {
    if (rule && rule.type !== 'object') {
      warnings.push(
        `${ label }: non-object requestBody schema cannot become a field map; skipped`
      );
    }
    return null;
  }

  return rule.properties;
};

const pickRequestMedia = (
  content: Record<string, MediaType> | undefined
): { media: MediaType | undefined; as?: RequestAs; contentType?: string; warned: boolean } => {
  if (!content || Object.keys(content).length === 0) {
    return { media: undefined, warned: false };
  }

  if (content['application/json']) {
    return { media: content['application/json'], contentType: 'application/json', warned: false };
  }

  const jsonKey = Object.keys(content).find((key) =>
    key.toLowerCase().includes('json')
  );
  if (jsonKey) {
    return { media: content[jsonKey], contentType: jsonKey, warned: false };
  }

  const multipartKey = Object.keys(content).find((key) =>
    key.toLowerCase().startsWith('multipart/')
  );
  if (multipartKey) {
    return {
      media: content[multipartKey],
      as: 'multipart',
      contentType: multipartKey,
      warned: false
    };
  }

  const formKey = Object.keys(content).find((key) =>
    key.toLowerCase().includes('application/x-www-form-urlencoded')
  );
  if (formKey) {
    return {
      media: content[formKey],
      as: 'form',
      contentType: formKey,
      warned: false
    };
  }

  const firstKey = Object.keys(content)[0];
  return { media: content[firstKey], contentType: firstKey, warned: true };
};

const isParameterObject = (value: unknown): value is ParameterObject => {
  return isRecord(value) && typeof value.name === 'string' && typeof value.in === 'string';
};

const parameterToField = (
  parameter: ParameterObject,
  warnings: string[],
  label: string
): { key: string; schema: FieldSchema } | null => {
  if ('$ref' in parameter) {
    warnings.push(`${ label }: unresolved parameter $ref; skipped`);
    return null;
  }

  const schema = (parameter as ParameterObject & { schema?: unknown }).schema;
  if (!schema) {
    warnings.push(`${ label }: parameter "${ parameter.name }" has no schema; skipped`);
    return null;
  }

  const rule = schemaToFieldRule(schema, warnings, `${ label }.${ parameter.name }`);
  if (!rule) {
    return null;
  }

  const required = parameter.required === true;
  const key = required ? parameter.name : `${ parameter.name }?`;
  return { key, schema: rule };
};

/**
 * Merge path-level and operation parameters (operation wins on name+in).
 */
export const mergeParameters = (
  pathParameters: unknown[] | undefined,
  operationParameters: unknown[] | undefined
): ParameterObject[] => {
  const map = new Map<string, ParameterObject>();

  for (const parameter of [...(pathParameters ?? []), ...(operationParameters ?? [])]) {
    if (!isParameterObject(parameter)) {
      continue;
    }
    map.set(`${ parameter.in }:${ parameter.name }`, parameter);
  }

  return [...map.values()];
};

export type BuildOperationRequestResult = {
  request?: RawMockRequest;
  warnings: string[];
};

/**
 * Build RawMockRequest from OpenAPI requestBody + parameters (query/header).
 * Path/cookie parameters are not mapped into request.
 */
export const buildOperationRequest = (
  operation: {
    requestBody?: unknown;
    parameters?: unknown[];
  },
  pathParameters: unknown[] | undefined,
  context: { method: string; pathKey: string }
): BuildOperationRequestResult => {
  const warnings: string[] = [];
  const label = `${ context.method.toUpperCase() } ${ context.pathKey }`;
  const request: RawMockRequest = {};

  for (const parameter of [...(pathParameters ?? []), ...(operation.parameters ?? [])]) {
    if (isRecord(parameter) && '$ref' in parameter) {
      warnings.push(`${ label }: unresolved parameter $ref; skipped`);
    }
  }

  const parameters = mergeParameters(pathParameters, operation.parameters);

  for (const parameter of parameters) {
    if (parameter.in === 'path') {
      continue;
    }

    if (parameter.in === 'cookie') {
      warnings.push(`${ label }: cookie parameter "${ parameter.name }" is not supported; skipped`);
      continue;
    }

    if (parameter.in !== 'query' && parameter.in !== 'header') {
      warnings.push(
        `${ label }: parameter "${ parameter.name }" in "${ parameter.in }" skipped`
      );
      continue;
    }

    const field = parameterToField(parameter, warnings, label);
    if (!field) {
      continue;
    }

    if (parameter.in === 'query') {
      request.query = { ...(request.query ?? {}), [field.key]: field.schema };
    } else {
      request.headers = { ...(request.headers ?? {}), [field.key]: field.schema };
    }
  }

  const rawBody = operation.requestBody;
  if (rawBody && isRecord(rawBody) && !('$ref' in rawBody)) {
    const body = rawBody as RequestBodyObject;
    const { media, as, warned } = pickRequestMedia(
      body.content as Record<string, MediaType> | undefined
    );

    if (warned) {
      warnings.push(
        `${ label }: requestBody has no JSON/form/multipart content; using first media type`
      );
    }

    if (media?.schema) {
      const fields = objectSchemaToPayloadFields(
        media.schema,
        warnings,
        `${ label } requestBody`
      );
      if (fields && Object.keys(fields).length > 0) {
        request.payload = fields;
        if (as) {
          request.as = as;
        }
      }
    } else if (body.content && Object.keys(body.content).length > 0) {
      warnings.push(`${ label }: requestBody has no schema; payload skipped`);
    }
  } else if (rawBody && isRecord(rawBody) && '$ref' in rawBody) {
    warnings.push(`${ label }: unresolved requestBody $ref; skipped`);
  }

  if (!request.payload && !request.query && !request.headers) {
    return { warnings };
  }

  return { request, warnings };
};
