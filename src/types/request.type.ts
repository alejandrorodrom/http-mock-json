export type FieldType = 'string' | 'number' | 'boolean' | 'object' | 'array';

export type FieldFormat = 'email' | 'uuid' | 'url' | 'date';

export type ErrorFormat = 'array' | 'map';

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
  message?: string;
  properties?: Record<string, FieldSchema>;
  items?: FieldSchema;
}

export interface RawMockRequest {
  body?: Record<string, FieldSchema>;
  query?: Record<string, FieldSchema>;
  invalidResponse?: string;
  errorFormat?: ErrorFormat;
  errorDetail?: Record<string, string> | string;
  errorDetailsKey?: string;
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
  message?: string;
  properties?: Field[];
  items?: Rule;
}

export interface Field {
  path: string;
  required: boolean;
  rule: Rule;
}

export interface MockRequest {
  body?: Field[];
  query?: Field[];
  invalidResponse?: string;
  errorFormat: ErrorFormat;
  errorDetail?: Record<string, string> | string;
  errorDetailsKey: string;
}

export interface RequestIssue {
  path: string;
  rule: string;
  expected: unknown;
  received: unknown;
  message: string;
}
