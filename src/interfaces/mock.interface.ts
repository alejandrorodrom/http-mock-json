import { Server } from "node:net";
import { HttpVerbs } from "../constants/http-verbs.constant";
import { MockConfig } from "../types/mock-config.type";
import { RecordWriteStats, RecordingsMode } from "../types/recordings.type";
import { StoreResetOption } from "../types/store.type";
import { LocalIssue } from "../types/validation.type";

export interface ExecuteMock {
  port?: number,
  folderPath: string;
  proxy?: string;
  resetStore?: StoreResetOption;
  record?: boolean;
  recordingsMode?: RecordingsMode;
}

export interface StartMock {
  port: number,
  folderPath: string;
  proxy?: string;
  resetStore?: StoreResetOption;
  record?: boolean;
  recordingsMode?: RecordingsMode;
  loadedConfig?: {
    config: MockConfig | null;
    errors: LocalIssue[];
  };
}

export interface StartMockResult {
  server: Server;
  persistWatchIgnored: (watchPath: string) => boolean;
  recordStats?: RecordWriteStats;
}

export interface WatchMock {
  server: Server;
  port: number;
  folderPath: string;
  mocks: string;
  proxy?: string;
  record?: boolean;
  recordingsMode?: RecordingsMode;
  persistWatchIgnored: (watchPath: string) => boolean;
}

export interface PromptAddMock {
  name: string;
  endpoint: string;
  httpVerbs?: HttpVerbs[];
  confirm: boolean;
}
