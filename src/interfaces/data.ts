export interface MockHttp {
  route: string;
  method: string;
  status: string;
  headers: object;
  response: object;
}

export interface ResponseHttp {
  name: string;
  statusCode: string;
  headers: object;
  body: object;
}
