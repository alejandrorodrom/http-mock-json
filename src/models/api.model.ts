import { MockHttp, MockResponseConfig } from '../interfaces/data.interface';
import { HttpVerbs } from '../constants/http-verbs.constant';
import { MethodProxyValue } from '../types/proxy.type';

type httpVerbs = HttpVerbs.get | HttpVerbs.post | HttpVerbs.put | HttpVerbs.patch | HttpVerbs.delete;

export class Api {
  route: string;
  method: httpVerbs;
  nameResponse: string;
  delay?: number;
  proxy?: MethodProxyValue;
  responses: MockResponseConfig[];

  constructor(data: MockHttp) {
    this.route = `/${data.route}`;
    this.method = this.getMethod(data.method.toUpperCase());
    this.nameResponse = data.nameResponse;
    this.delay = data.delay;
    this.proxy = data.proxy;
    this.responses = data.responses;
  }

  private getMethod = (method: string): httpVerbs => {
    switch (method) {
      case 'GET': {
        return HttpVerbs.get;
      }
      case 'POST': {
        return HttpVerbs.post;
      }
      case 'PUT': {
        return HttpVerbs.put;
      }
      case 'PATCH': {
        return HttpVerbs.patch;
      }
      case 'DELETE': {
        return HttpVerbs.delete;
      }
      default: {
        throw new Error(`Unsupported HTTP method: "${method}"`);
      }
    }
  }
}
