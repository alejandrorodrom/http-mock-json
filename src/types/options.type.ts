import { StoreResetOption } from './store.type';

export type StartOptions = {
  port: number;
  path: string;
  proxy?: string;
  resetStore?: StoreResetOption;
};
export type InitOptions = { path: string, mock: boolean, script: boolean };
export type AddOptions = { path: string };
