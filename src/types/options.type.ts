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
export type AddOptions = {
  path: string;
  /** Alias for `--preset crud` (kept for compatibility). */
  crud?: boolean;
  /** Scaffold preset name (see ADD_PRESETS / --preset help). */
  preset?: string;
};
export type ImportOptions = {
  path: string;
  openapi: string;
  out?: string;
  splitTags?: boolean;
  overwrite?: boolean;
  /** Override OpenAPI servers[0] path (e.g. planetary or /api/v1). */
  prefix?: string;
  /** When false, ignore servers[0] path (--no-server-prefix). */
  serverPrefix?: boolean;
  /** When false, skip generating request from OpenAPI (--no-request). Default true. */
  request?: boolean;
};
