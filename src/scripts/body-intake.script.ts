import { NextFunction, Request, Response } from 'express';
import { RAW_BODY_LIMIT } from '../constants/body.constant';

export const stashRawBody = (
  req: Request,
  _res: Response,
  buffer: Buffer
): void => {
  if (buffer.length > 0) {
    req.rawBody = buffer;
  }
};

const readStream = (req: Request, limit: number): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    let settled = false;

    const fail = (error: Error) => {
      if (!settled) {
        settled = true;
        reject(error);
      }
    };

    req.on('data', (chunk: Buffer) => {
      if (settled) {
        return;
      }

      size += chunk.length;

      if (size > limit) {
        fail(new Error(`Request body exceeds limit of ${ limit } bytes`));
        return;
      }

      chunks.push(chunk);
    });

    req.on('end', () => {
      if (!settled) {
        settled = true;
        resolve(Buffer.concat(chunks));
      }
    });

    req.on('error', fail);
  });
};

export const captureUnhandledRawBody = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const method = req.method.toUpperCase();

  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
    next();
    return;
  }

  if (req.rawBody) {
    next();
    return;
  }

  if (req.readableEnded || req.complete) {
    next();
    return;
  }

  try {
    const buffer = await readStream(req, RAW_BODY_LIMIT);

    if (buffer.length > 0) {
      req.rawBody = buffer;
    }

    next();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!res.headersSent) {
      res.status(413).json({ message });
    }
    req.destroy();
  }
};
