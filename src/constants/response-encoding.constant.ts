import { ResponseEncoding } from '../types/response-encoding.type';

export const RESPONSE_ENCODINGS: ResponseEncoding[] = ['file', 'base64'];

export const RESPONSE_ENCODING_SET = new Set<string>(RESPONSE_ENCODINGS);
