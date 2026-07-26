import { Server } from "node:net";
import { HttpVerbs } from "../constants/http-verbs.constant";
import { StoreResetOption } from "../types/store.type";

export interface ExecuteMock {
  port: number,
  folderPath: string;
  proxy?: string;
  resetStore?: StoreResetOption;
}

export interface StartMock {
  port: number,
  folderPath: string;
  proxy?: string;
  resetStore?: StoreResetOption;
}

export interface StartMockResult {
  server: Server;
  persistWatchIgnored: (watchPath: string) => boolean;
}

export interface WatchMock {
  server: Server;
  port: number;
  folderPath: string;
  mocks: string;
  proxy?: string;
  persistWatchIgnored: (watchPath: string) => boolean;
}

export interface PromptAddMock {
  name: string;
  endpoint: string;
  httpVerbs: HttpVerbs[];
  confirm: string;
}
