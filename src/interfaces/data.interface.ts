import { JsonValue } from '../types/json.type';

export interface MockHttp {
  route: string;
  method: string;
  status: string;
  headers: Record<string, string>;
  response: JsonValue;
}

export interface RawMockResponse {
  name: string;
  statusCode: string;
  headers?: Record<string, string>;
  body: unknown;
}

export interface RawMockMethod {
  nameResponse: string;
  responses: RawMockResponse[];
}
