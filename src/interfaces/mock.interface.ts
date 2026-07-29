import { Server } from "node:net";
import { HttpVerbs } from "../constants/http-verbs.constant";
import { MockConfig } from "../types/mock-config.type";
import { StoreResetOption } from "../types/store.type";
import { LocalIssue } from "../types/validation.type";

export interface ExecuteMock {
  port?: number,
  folderPath: string;
  proxy?: string;
  resetStore?: StoreResetOption;
}

export interface StartMock {
  port: number,
  folderPath: string;
  proxy?: string;
  resetStore?: StoreResetOption;
  loadedConfig?: {
    config: MockConfig | null;
    errors: LocalIssue[];
  };
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
  httpVerbs?: HttpVerbs[];
  confirm: boolean;
}
