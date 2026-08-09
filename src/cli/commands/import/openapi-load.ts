import fs from 'fs';
import path from 'path';
import SwaggerParser from '@apidevtools/swagger-parser';
import { OpenAPI } from 'openapi-types';
import { isHttpUrl } from '../../../scripts/http-url.script';

export type OpenApiDocument = OpenAPI.Document;

const resolveLocalSource = (source: string): string => {
  const absolute = path.isAbsolute(source) ? source : path.join(process.cwd(), source);

  if (!fs.existsSync(absolute)) {
    throw new Error(`OpenAPI file not found: ${ source }`);
  }

  if (!fs.statSync(absolute).isFile()) {
    throw new Error(`OpenAPI source is not a file: ${ source }`);
  }

  return absolute;
};

const assertOpenApi3 = (document: OpenAPI.Document): void => {
  const raw = document as Record<string, unknown>;

  if (typeof raw.swagger === 'string') {
    throw new Error(
      `Swagger ${ raw.swagger } is not supported. Convert the spec to OpenAPI 3.x first.`
    );
  }

  const version = typeof raw.openapi === 'string' ? raw.openapi : '';
  if (!/^3\.\d+/.test(version)) {
    throw new Error(
      'Only OpenAPI 3.x is supported. The document must include openapi: "3.x.x".'
    );
  }
};

/**
 * Fail fast on Swagger 2 for local files before invoking the full parser.
 */
export const assertSourceIsOpenApi3 = (source: string): void => {
  if (isHttpUrl(source)) {
    return;
  }

  const absolute = resolveLocalSource(source);
  const text = fs.readFileSync(absolute, 'utf8').trim();

  if (text.startsWith('{')) {
    try {
      const parsed = JSON.parse(text) as Record<string, unknown>;
      if (typeof parsed.swagger === 'string') {
        throw new Error(
          `Swagger ${ parsed.swagger } is not supported. Convert the spec to OpenAPI 3.x first.`
        );
      }
    } catch (error) {
      if (error instanceof Error && error.message.startsWith('Swagger ')) {
        throw error;
      }
      // Let the OpenAPI parser report JSON syntax errors.
    }
    return;
  }

  const swaggerMatch = text.match(/^swagger:\s*['"]?([^'"\n]+)/m);
  if (swaggerMatch) {
    throw new Error(
      `Swagger ${ swaggerMatch[1].trim() } is not supported. Convert the spec to OpenAPI 3.x first.`
    );
  }
};

/**
 * Load, validate, and fully dereference an OpenAPI 3.x document from a file or URL.
 */
export const loadOpenApiDocument = async (source: string): Promise<OpenApiDocument> => {
  if (!source || source.trim().length === 0) {
    throw new Error('OpenAPI source is required (--openapi <file|url>)');
  }

  const trimmed = source.trim();
  const target = isHttpUrl(trimmed) ? trimmed : resolveLocalSource(trimmed);

  let parsed: OpenAPI.Document;

  try {
    parsed = await SwaggerParser.parse(target) as OpenAPI.Document;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to load OpenAPI document: ${ message }`);
  }

  assertOpenApi3(parsed);

  try {
    await SwaggerParser.validate(parsed);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Invalid OpenAPI document: ${ message }`);
  }

  try {
    return await SwaggerParser.dereference(parsed) as OpenApiDocument;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to resolve OpenAPI $ref: ${ message }`);
  }
};
