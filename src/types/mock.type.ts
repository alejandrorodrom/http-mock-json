import { RawMockMethod } from '../interfaces/data.interface';
import { RawStoreConfig } from './store.type';

export type RawMockEndpoint = Record<string, RawMockMethod | RawStoreConfig>;

export type RawMockFile = Record<string, RawMockEndpoint>;
