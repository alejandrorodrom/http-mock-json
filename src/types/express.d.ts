import 'express-serve-static-core';
import { ParsedMultipartFile } from './request.type';

declare module 'express-serve-static-core' {
  interface Request {
    rawBody?: Buffer;
    multipart?: {
      fields: Record<string, string>;
      files: Record<string, ParsedMultipartFile[]>;
    };
  }
}
