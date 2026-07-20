import { JsonValue } from '../types/json.type';
import { MethodProxyValue, ProxyValue } from '../types/proxy.type';

export interface MockMatch {
  params?: Record<string, JsonValue>;
  query?: Record<string, JsonValue>;
  body?: JsonValue;
}

export interface MockResponseConfig {
  name: string;
  status: number;
  headers: Record<string, string>;
  body: JsonValue;
  delay?: number;
  match?: MockMatch;
  proxy?: ProxyValue;
}

export interface MockHttp {
  route: string;
  method: string;
  nameResponse: string;
  delay?: number;
  proxy?: MethodProxyValue;
  responses: MockResponseConfig[];
}

export interface RawMockResponse {
  name: string;
  statusCode: string | number;
  headers?: Record<string, string>;
  body: unknown;
  delay?: number;
  match?: MockMatch;
  proxy?: ProxyValue;
}

export interface RawMockMethod {
  nameResponse: string;
  delay?: number;
  proxy?: MethodProxyValue;
  responses: RawMockResponse[];
}
