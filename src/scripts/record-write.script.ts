import * as fs from 'fs';
import { dirname, join } from 'path';
import {
  RECORDINGS_DIR,
  RECORDINGS_FILES_DIR
} from '../constants/recordings.constant';
import { JsonValue } from '../types/json.type';
import { MockConfig } from '../types/mock-config.type';
import {
  ProxiedCapture,
  RecordRequestContext,
  RecordWriteStats
} from '../types/recordings.type';
import { isObject } from './guards.script';
import { classifyRecordBody, hashRecordBody } from './record-classify.script';
import { resolveRecordGroup } from './record-group.script';
import {
  buildMatch,
  matchNameSuffix,
  RecordedMatch,
  responseDedupeKey
} from './record-match.script';
import {
  canonicalQuery,
  normalizeRecordPath,
  safeRecordFileBase
} from './record-path.script';

type RawRecordedResponse = {
  name: string;
  statusCode: number;
  headers?: Record<string, string>;
  body?: JsonValue | string;
  encoding?: 'file';
  match?: RecordedMatch;
};

type RawRecordedMethod = {
  nameResponse: string;
  responses: RawRecordedResponse[];
};

type RawRecordedFile = Record<string, Partial<Record<string, RawRecordedMethod>>>;

const RESPONSE_HEADERS_TO_SKIP = new Set([
  'connection',
  'keep-alive',
  'transfer-encoding',
  'content-length',
  'content-encoding'
]);

const atomicWriteJson = (filePath: string, data: unknown): void => {
  fs.mkdirSync(dirname(filePath), { recursive: true });
  const tempPath = `${ filePath }.tmp`;
  fs.writeFileSync(tempPath, `${ JSON.stringify(data, null, 2) }\n`, 'utf-8');
  fs.renameSync(tempPath, filePath);
};

const atomicWriteBuffer = (filePath: string, body: Buffer): void => {
  fs.mkdirSync(dirname(filePath), { recursive: true });
  const tempPath = `${ filePath }.tmp`;
  fs.writeFileSync(tempPath, body);
  fs.renameSync(tempPath, filePath);
};

const filterHeaders = (headers: Record<string, string>): Record<string, string> => {
  const result: Record<string, string> = {};

  for (const [key, value] of Object.entries(headers)) {
    if (RESPONSE_HEADERS_TO_SKIP.has(key.toLowerCase())) {
      continue;
    }

    result[key] = value;
  }

  return result;
};

const readExistingFile = (filePath: string): RawRecordedFile => {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as unknown;
    return isObject(parsed) ? parsed as RawRecordedFile : {};
  } catch {
    return {};
  }
};

export const createRecordStats = (): RecordWriteStats => ({
  wrote: 0,
  skipped: 0,
  proxyFailures: 0
});

export const resolveRecordingJsonPath = (
  mocksDir: string,
  folderName: string | null,
  endpoint: string,
  method: string
): string => {
  const base = safeRecordFileBase(endpoint, method);
  const fileName = `${ base }.json`;

  if (folderName) {
    return join(mocksDir, folderName, RECORDINGS_DIR, fileName);
  }

  return join(mocksDir, RECORDINGS_DIR, fileName);
};

export const recordProxiedResponse = (
  mocksDir: string,
  config: MockConfig | null,
  request: RecordRequestContext,
  capture: ProxiedCapture,
  stats: RecordWriteStats
): void => {
  const classification = classifyRecordBody(
    capture.body,
    capture.headers['content-type'] ?? capture.headers['Content-Type'],
    capture.status
  );

  const group = resolveRecordGroup(request.pathname, config);
  const normalized = normalizeRecordPath(group.relativeEndpoint);
  const query = canonicalQuery(request.query);
  const headers = filterHeaders(capture.headers);
  const match = buildMatch(
    normalized.params,
    query,
    request.body,
    request.headers,
    request.multipart
  );
  const jsonPath = resolveRecordingJsonPath(
    mocksDir,
    group.folderName,
    normalized.endpoint,
    request.method
  );

  let responseBody: JsonValue | string = null;
  let encoding: 'file' | undefined;

  if (classification.kind === 'json') {
    responseBody = classification.body;
  } else if (classification.kind === 'text') {
    responseBody = classification.body;
    if (!headers['Content-Type'] && !headers['content-type']) {
      headers['Content-Type'] = classification.contentType;
    }
  } else {
    const hash = hashRecordBody(capture.body);
    const fileName = `${ hash }.${ classification.extension }`;
    const filesRoot = group.folderName
      ? join(mocksDir, group.folderName, RECORDINGS_DIR, RECORDINGS_FILES_DIR)
      : join(mocksDir, RECORDINGS_DIR, RECORDINGS_FILES_DIR);
    const absoluteFile = join(filesRoot, fileName);
    atomicWriteBuffer(absoluteFile, capture.body);

    const relativeBodyPath = group.folderName
      ? join(group.folderName, RECORDINGS_DIR, RECORDINGS_FILES_DIR, fileName)
      : join(RECORDINGS_DIR, RECORDINGS_FILES_DIR, fileName);

    responseBody = relativeBodyPath.replace(/\\/g, '/');
    encoding = 'file';

    if (!headers['Content-Type'] && !headers['content-type']) {
      headers['Content-Type'] = classification.contentType;
    }
  }

  const recorded: RawRecordedResponse = {
    name: match ? `recorded-${ matchNameSuffix(match) }` : 'recorded',
    statusCode: capture.status,
    headers: Object.keys(headers).length > 0 ? headers : undefined,
    body: responseBody,
    encoding,
    match
  };

  if (!recorded.name || recorded.name === 'recorded-') {
    recorded.name = 'recorded';
  }

  const fileData = readExistingFile(jsonPath);
  const endpointKey = normalized.endpoint || 'root';
  const methodKey = request.method.toUpperCase();
  const methodData = fileData[endpointKey]?.[methodKey] ?? {
    nameResponse: 'recorded',
    responses: []
  };

  const existingIndex = methodData.responses.findIndex(
    (item) => responseDedupeKey(item) === responseDedupeKey(recorded)
  );

  if (existingIndex >= 0) {
    const existingName = methodData.responses[existingIndex].name;
    recorded.name = existingName;
    methodData.responses[existingIndex] = recorded;
  } else {
    const usedNames = new Set(methodData.responses.map((item) => item.name));
    let name = recorded.name;
    let suffix = 2;
    while (usedNames.has(name)) {
      name = `${ recorded.name }-${ suffix }`;
      suffix += 1;
    }
    recorded.name = name;
    methodData.responses.push(recorded);
  }

  if (!recorded.match) {
    methodData.nameResponse = recorded.name;
  } else if (!methodData.responses.some((item) => item.name === methodData.nameResponse)) {
    methodData.nameResponse = recorded.name;
  }

  fileData[endpointKey] = {
    ...(fileData[endpointKey] ?? {}),
    [methodKey]: methodData
  };

  atomicWriteJson(jsonPath, fileData);
  stats.wrote += 1;
};
