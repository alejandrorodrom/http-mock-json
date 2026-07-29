import Busboy from 'busboy';
import { Request } from 'express';
import {
  MULTIPART_MAX_FIELDS,
  MULTIPART_MAX_FILES,
  RAW_BODY_LIMIT
} from '../constants/body.constant';
import { MockResponseConfig } from '../interfaces/data.interface';
import { MockRequest, ParsedMultipartFile, RequestIssue } from '../types/request.type';

export type MultipartParseResult = {
  fields: Record<string, string>;
  files: Record<string, ParsedMultipartFile[]>;
};

export const needsMultipartParse = (value: {
  request?: MockRequest;
  responses: MockResponseConfig[];
}): boolean => {
  if (value.request?.as === 'multipart') {
    return true;
  }

  if (value.request?.payload?.some((field) => field.rule.type === 'file')) {
    return true;
  }

  return value.responses.some((response) => response.match?.multipart !== undefined);
};

export const multipartParseIssue = (message: string): RequestIssue => ({
  path: 'payload',
  rule: 'multipart',
  expected: 'multipart/form-data',
  received: null,
  message
});

export const parseMultipart = (req: Request): Promise<MultipartParseResult> => {
  return new Promise((resolve, reject) => {
    const contentType = req.headers['content-type'];

    if (!contentType || !contentType.includes('multipart/form-data')) {
      resolve({ fields: {}, files: {} });
      return;
    }

    const fields: Record<string, string> = {};
    const files: Record<string, ParsedMultipartFile[]> = {};
    let totalFileBytes = 0;
    let settled = false;

    const fail = (error: unknown) => {
      if (!settled) {
        settled = true;
        reject(error);
      }
    };

    const succeed = (result: MultipartParseResult) => {
      if (!settled) {
        settled = true;
        resolve(result);
      }
    };

    try {
      const busboy = Busboy({
        headers: req.headers,
        limits: {
          fileSize: RAW_BODY_LIMIT,
          files: MULTIPART_MAX_FILES,
          fields: MULTIPART_MAX_FIELDS
        }
      });

      busboy.on('field', (name, value) => {
        fields[name] = value;
      });

      busboy.on('file', (name, stream, info) => {
        const chunks: Buffer[] = [];
        let truncated = false;

        stream.on('data', (chunk: Buffer) => {
          chunks.push(chunk);
        });

        stream.on('limit', () => {
          truncated = true;
        });

        stream.on('end', () => {
          if (truncated) {
            fail(new Error(`Multipart file exceeds limit of ${ RAW_BODY_LIMIT } bytes`));
            return;
          }

          const buffer = Buffer.concat(chunks);
          totalFileBytes += buffer.length;

          if (totalFileBytes > RAW_BODY_LIMIT) {
            fail(new Error(`Multipart files exceed limit of ${ RAW_BODY_LIMIT } bytes`));
            return;
          }

          const file: ParsedMultipartFile = {
            fieldname: name,
            filename: info.filename || undefined,
            mimeType: info.mimeType || undefined,
            buffer
          };

          if (!files[name]) {
            files[name] = [];
          }

          files[name].push(file);
        });
      });

      busboy.on('error', fail);
      busboy.on('filesLimit', () => {
        fail(new Error('Multipart files limit exceeded'));
      });
      busboy.on('fieldsLimit', () => {
        fail(new Error('Multipart fields limit exceeded'));
      });
      busboy.on('finish', () => {
        succeed({ fields, files });
      });

      if (req.rawBody) {
        busboy.end(req.rawBody);
      } else if (req.readableEnded || req.complete) {
        busboy.end(Buffer.alloc(0));
      } else {
        req.pipe(busboy);
      }
    } catch (error) {
      fail(error);
    }
  });
};
