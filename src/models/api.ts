import { MockHttp } from '../interfaces/data';
import { HttpVerbs } from '../constants/http-verbs';

type httpVerbs = HttpVerbs.get | HttpVerbs.post | HttpVerbs.put | HttpVerbs.patch | HttpVerbs.delete;

export class Api {
  route: string;
  method: httpVerbs;
  status: number;
  response: object;

  constructor(data: MockHttp) {
    this.route = `/${data.route}`;
    this.method = this.getMethod(data.method);
    this.status = Number(data.status);
    this.response = data.response;
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
        return HttpVerbs.get;
      }
    }
  }
}
