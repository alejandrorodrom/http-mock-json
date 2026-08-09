type JsonSchema = {
  type?: string | string[];
  example?: unknown;
  default?: unknown;
  enum?: unknown[];
  properties?: Record<string, JsonSchema>;
  required?: string[];
  items?: JsonSchema | JsonSchema[];
  allOf?: JsonSchema[];
  oneOf?: JsonSchema[];
  anyOf?: JsonSchema[];
  nullable?: boolean;
};

const MAX_DEPTH = 6;

const primaryType = (schema: JsonSchema): string | undefined => {
  if (Array.isArray(schema.type)) {
    return schema.type.find((item) => item !== 'null');
  }

  return schema.type;
};

/**
 * Build a minimal JSON example from an OpenAPI/JSON Schema object.
 */
export const buildSchemaExample = (
  schema: unknown,
  depth = 0,
  seen: WeakSet<object> = new WeakSet()
): unknown => {
  if (schema === null || schema === undefined || typeof schema !== 'object') {
    return {};
  }

  const node = schema as JsonSchema;

  if (seen.has(node)) {
    return {};
  }

  if ('example' in node && node.example !== undefined) {
    return node.example;
  }

  if ('default' in node && node.default !== undefined) {
    return node.default;
  }

  if (Array.isArray(node.enum) && node.enum.length > 0) {
    return node.enum[0];
  }

  if (depth >= MAX_DEPTH) {
    return {};
  }

  seen.add(node);

  if (Array.isArray(node.allOf) && node.allOf.length > 0) {
    const merged: Record<string, unknown> = {};
    for (const part of node.allOf) {
      const value = buildSchemaExample(part, depth + 1, seen);
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        Object.assign(merged, value);
      }
    }
    return Object.keys(merged).length > 0 ? merged : {};
  }

  const alt = node.oneOf?.[0] ?? node.anyOf?.[0];
  if (alt) {
    return buildSchemaExample(alt, depth + 1, seen);
  }

  const type = primaryType(node);

  if (type === 'object' || (!type && node.properties)) {
    const properties = node.properties ?? {};
    const required = new Set(node.required ?? Object.keys(properties));
    const result: Record<string, unknown> = {};

    for (const [key, prop] of Object.entries(properties)) {
      if (!required.has(key) && Object.keys(properties).length > 8) {
        continue;
      }
      result[key] = buildSchemaExample(prop, depth + 1, seen);
    }

    return result;
  }

  if (type === 'array') {
    const items = Array.isArray(node.items) ? node.items[0] : node.items;
    return [buildSchemaExample(items ?? {}, depth + 1, seen)];
  }

  if (type === 'string') {
    return 'string';
  }

  if (type === 'number' || type === 'integer') {
    return 0;
  }

  if (type === 'boolean') {
    return true;
  }

  if (type === 'null' || node.nullable) {
    return null;
  }

  return {};
};
