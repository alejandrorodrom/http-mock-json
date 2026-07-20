import { Server } from "node:net";
import { HttpVerbs } from "../constants/http-verbs.constant";

export interface ExecuteMock {
  port: number,
  folderPath: string;
  proxy?: string;
}

export interface StartMock {
  port: number,
  folderPath: string;
  proxy?: string;
}

export interface WatchMock {
  server: Server;
  port: number;
  folderPath: string;
  mocks: string;
  proxy?: string;
}

export interface PromptAddMock {
  name: string;
  endpoint: string;
  httpVerbs: HttpVerbs[];
  confirm: string;
}
