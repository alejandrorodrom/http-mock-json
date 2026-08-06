import { RecordingsMode } from '../constants/recordings.constant';
import { JsonValue } from './json.type';

export type { RecordingsMode };

export type NormalizedRecordPath = {
  endpoint: string;
  params: Record<string, string>;
  segments: string[];
};

export type RecordClassifyResult =
  | { kind: 'json'; body: JsonValue }
  | { kind: 'text'; body: string; contentType: string }
  | { kind: 'binary'; contentType: string; extension: string };

export type RecordWriteStats = {
  wrote: number;
  skipped: number;
  proxyFailures: number;
};

export type RecordGroupMatch = {
  folderName: string | null;
  prefix: string | null;
  relativeEndpoint: string;
};

export type ProxiedCapture = {
  status: number;
  headers: Record<string, string>;
  body: Buffer;
  url: string;
};

export type RecordMatchMultipart = Record<
  string,
  string | {
    filename: string | null;
    mimeType: string | null;
    size: number;
  }
>;

export type RecordRequestContext = {
  method: string;
  originalUrl: string;
  pathname: string;
  query: Record<string, string>;
  body?: JsonValue;
  headers?: Record<string, string | string[] | undefined>;
  multipart?: {
    fields: Record<string, string>;
    files: Record<string, Array<{
      filename?: string;
      mimeType?: string;
      buffer: Buffer;
    }>>;
  };
};

export type ApiSource = 'mock' | 'recording';
