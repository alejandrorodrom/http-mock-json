import { Server } from "node:net";
import { HttpVerbs } from "../constants/http-verbs";

export interface ExecuteMock {
  port: number,
  folderPath: string;
}

export interface StartMock {
  port: number,
  folderPath: string;
}

export interface WatchMock {
  server: Server;
  port: number;
  folderPath: string;
  mocks: string;
}

export interface PromptAddMock {
  name: string;
  endpoint: string;
  httpVerbs: HttpVerbs[];
  confirm: string;
}
