import { JsonValue } from '../types/json.type';
import { MethodProxyValue, ProxyValue } from '../types/proxy.type';
import { ApiSource } from '../types/recordings.type';
import { MockRequest, RawMockRequest } from '../types/request.type';
import { ResponseEncoding } from '../types/response-encoding.type';
import { StoreAction } from '../types/store.type';

export interface MockMatchCallBy {
  body?: string;
  query?: string;
  params?: string;
}

export interface MockMatchCall {
  index?: number;
  by?: MockMatchCallBy;
  loop?: boolean;
  reset?: boolean;
}

export interface MockMatch {
  params?: Record<string, JsonValue>;
  query?: Record<string, JsonValue>;
  body?: JsonValue;
  headers?: Record<string, JsonValue>;
  multipart?: Record<string, JsonValue>;
  call?: number | MockMatchCall;
}

export interface MockResponseConfig {
  name: string;
  status: number;
  headers: Record<string, string>;
  body: JsonValue;
  encoding?: ResponseEncoding;
  delay?: number;
  match?: MockMatch;
  proxy?: ProxyValue;
  action?: StoreAction;
}

export interface MockHttp {
  route: string;
  method: string;
  nameResponse: string;
  delay?: number;
  proxy?: MethodProxyValue;
  request?: MockRequest;
  storeId?: string;
  stripPrefix?: string;
  source?: ApiSource;
  sourceFile?: string;
  responses: MockResponseConfig[];
}

export interface RawMockResponse {
  name: string;
  statusCode: string | number;
  headers?: Record<string, string>;
  body?: unknown;
  encoding?: ResponseEncoding;
  delay?: number;
  match?: MockMatch;
  proxy?: ProxyValue;
  action?: StoreAction;
}

export interface RawMockMethod {
  nameResponse: string;
  delay?: number;
  proxy?: MethodProxyValue;
  request?: RawMockRequest;
  responses: RawMockResponse[];
}
