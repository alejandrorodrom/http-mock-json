import { RawMockMethod } from '../interfaces/data.interface';

export type RawMockEndpoint = Record<string, RawMockMethod>;

export type RawMockFile = Record<string, RawMockEndpoint>;
