import fs from 'fs';
import path from 'path';
import { Response } from 'express';
import { MockResponseConfig } from '../interfaces/data.interface';
import { ResponseEncoding } from '../types/response-encoding.type';

const isInsideDir = (dir: string, target: string): boolean => {
  return target === dir || target.startsWith(`${ dir }${ path.sep }`);
};

const resolveSafeFilePath = (mocksDir: string, relativePath: string): string => {
  const resolvedMocks = path.resolve(mocksDir);
  const candidate = path.resolve(mocksDir, relativePath);

  if (!isInsideDir(resolvedMocks, candidate)) {
    throw new Error(`Response body file path escapes mocks directory: ${ relativePath }`);
  }

  if (!fs.existsSync(candidate)) {
    return candidate;
  }

  const realMocks = fs.realpathSync(resolvedMocks);
  const realFile = fs.realpathSync(candidate);

  if (!isInsideDir(realMocks, realFile)) {
    throw new Error(`Response body file path escapes mocks directory: ${ relativePath }`);
  }

  return realFile;
};

const sendEncodingError = (res: Response, message: string): void => {
  if (!res.headersSent) {
    res.status(500).type('json').json({ message });
  }
};

export const sendMockBody = (
  res: Response,
  response: MockResponseConfig,
  mocksDir: string
): void => {
  const encoding: ResponseEncoding | undefined = response.encoding;

  if (!encoding) {
    res.set(response.headers).status(response.status).json(response.body);
    return;
  }

  if (encoding === 'base64') {
    if (typeof response.body !== 'string') {
      sendEncodingError(res, 'encoding "base64" requires body to be a string');
      return;
    }

    res.set(response.headers).status(response.status).send(Buffer.from(response.body, 'base64'));
    return;
  }

  if (encoding === 'file') {
    if (typeof response.body !== 'string' || response.body.trim() === '') {
      sendEncodingError(res, 'encoding "file" requires body to be a non-empty path string');
      return;
    }

    try {
      const filePath = resolveSafeFilePath(mocksDir, response.body);
      res.set(response.headers).status(response.status).send(fs.readFileSync(filePath));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      sendEncodingError(res, message);
    }
    return;
  }

  sendEncodingError(res, `unsupported encoding: ${ encoding }`);
};
