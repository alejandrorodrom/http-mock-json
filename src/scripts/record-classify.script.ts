import { createHash } from 'crypto';
import { RecordClassifyResult } from '../types/recordings.type';
import { JsonValue } from '../types/json.type';

const EXTENSION_BY_MIME: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
  'application/pdf': 'pdf',
  'application/octet-stream': 'bin',
  'application/zip': 'zip',
  'audio/mpeg': 'mp3',
  'video/mp4': 'mp4'
};

const normalizeContentType = (contentType: string | undefined): string => {
  if (!contentType) {
    return '';
  }

  return contentType.split(';')[0].trim().toLowerCase();
};

const isJsonContentType = (contentType: string): boolean => {
  return contentType === 'application/json' || contentType.endsWith('+json');
};

const isBinaryContentType = (contentType: string): boolean => {
  return contentType.startsWith('image/')
    || contentType.startsWith('audio/')
    || contentType.startsWith('video/')
    || contentType === 'application/pdf'
    || contentType === 'application/octet-stream'
    || contentType === 'application/zip'
    || contentType === 'application/gzip'
    || contentType === 'application/wasm';
};

const looksLikeBinary = (body: Buffer): boolean => {
  const sample = body.subarray(0, Math.min(body.length, 800));
  return sample.includes(0);
};

const asText = (
  body: Buffer,
  contentType: string
): Extract<RecordClassifyResult, { kind: 'text' }> => ({
  kind: 'text',
  body: body.toString('utf8'),
  contentType: contentType || 'text/plain'
});

const asBinary = (
  contentType: string
): Extract<RecordClassifyResult, { kind: 'binary' }> => ({
  kind: 'binary',
  contentType: contentType || 'application/octet-stream',
  extension: EXTENSION_BY_MIME[contentType] ?? 'bin'
});

export const classifyRecordBody = (
  body: Buffer,
  contentTypeHeader: string | undefined,
  status: number
): RecordClassifyResult => {
  const contentType = normalizeContentType(contentTypeHeader);

  if (status === 204 || body.length === 0) {
    return { kind: 'json', body: null };
  }

  if (contentType.startsWith('text/') || contentType === 'application/xml' || contentType === 'text/xml' || contentType === 'application/csv') {
    return asText(body, contentType || 'text/plain');
  }

  if (isBinaryContentType(contentType)) {
    return asBinary(contentType);
  }

  if (isJsonContentType(contentType) || contentType === '') {
    try {
      const parsed = JSON.parse(body.toString('utf8')) as JsonValue;
      return { kind: 'json', body: parsed };
    } catch {
      if (isJsonContentType(contentType)) {
        return asText(body, contentType);
      }

      if (looksLikeBinary(body)) {
        return asBinary('application/octet-stream');
      }

      return asText(body, 'text/plain');
    }
  }

  if (looksLikeBinary(body)) {
    return asBinary(contentType || 'application/octet-stream');
  }

  return asText(body, contentType || 'text/plain');
};

export const hashRecordBody = (body: Buffer): string => {
  return createHash('sha1').update(body).digest('hex').slice(0, 16);
};
