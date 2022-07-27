export interface MockHttp {
  route: string;
  method: string;
  status: string;
  response: object;
}

export interface ResponseHttp {
  name: string;
  statusCode: string;
  body: object;
}
