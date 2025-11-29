export interface MockHttp {
  route: string;
  method: string;
  status: string;
  headers: object;
  response: object;
}

export interface RawMockResponse {
  name: string;
  statusCode: string;
  headers?: object;
  body: any;
}

export interface RawMockMethod {
  nameResponse: string;
  responses: RawMockResponse[];
}
