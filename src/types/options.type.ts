import { RecordingsMode } from './recordings.type';
import { StoreResetOption } from './store.type';

export type StartOptions = {
  port?: number;
  path: string;
  proxy?: string;
  resetStore?: StoreResetOption;
  record?: boolean;
  excludeRecordings?: boolean;
  recordingsOnly?: boolean;
  recordingsMode?: RecordingsMode;
};
export type InitOptions = { path: string, mock: boolean, script: boolean };
export type AddOptions = { path: string; crud?: boolean };
