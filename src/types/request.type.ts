export type FieldType = 'string' | 'number' | 'boolean' | 'object' | 'array' | 'file';

export type StringFieldFormat = 'email' | 'uuid' | 'url' | 'date';

export type FileFormat = string | string[];

export type FieldFormat = StringFieldFormat | FileFormat;

export type ErrorFormat = 'array' | 'map';

export type RequestAs = 'json' | 'form' | 'multipart' | 'raw' | 'text';

export type FieldSchema = FieldType | FieldRule;

export interface FieldRule {
  type: FieldType;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: string;
  format?: FieldFormat;
  enum?: Array<string | number>;
  minItems?: number;
  maxItems?: number;
  maxSize?: number;
  minSize?: number;
  requireFilename?: boolean;
  message?: string;
  messages?: Record<string, string>;
  properties?: Record<string, FieldSchema>;
  items?: FieldSchema;
}

export interface RawRequestError {
  response?: string;
  format?: ErrorFormat;
  detail?: Record<string, string> | string;
  key?: string;
}

export interface RawMockRequest {
  as?: RequestAs;
  payload?: Record<string, FieldSchema> | FieldRule | FileFormat;
  query?: Record<string, FieldSchema>;
  headers?: Record<string, FieldSchema>;
  error?: RawRequestError;
}

export interface Rule {
  type: FieldType;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  format?: FieldFormat;
  enum?: Array<string | number>;
  minItems?: number;
  maxItems?: number;
  maxSize?: number;
  minSize?: number;
  requireFilename?: boolean;
  message?: string;
  messages?: Record<string, string>;
  properties?: Field[];
  items?: Rule;
}

export interface Field {
  path: string;
  required: boolean;
  rule: Rule;
}

export interface MockRequestError {
  response?: string;
  format: ErrorFormat;
  detail?: Record<string, string> | string;
  key: string;
}

export interface MockRequest {
  as?: RequestAs;
  payload?: Field[];
  rawPayload?: Rule;
  query?: Field[];
  headers?: Field[];
  error: MockRequestError;
}

export interface RequestIssue {
  path: string;
  rule: string;
  expected: unknown;
  received: unknown;
  message: string;
}

export interface ParsedMultipartFile {
  fieldname: string;
  filename?: string;
  mimeType?: string;
  buffer: Buffer;
}
