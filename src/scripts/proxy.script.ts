import { Request, Response } from 'express';
import { MethodProxyValue, ProxyTarget, ProxyValue } from '../types/proxy.type';
import { ProxiedCapture } from '../types/recordings.type';
import { logError } from './log.script';

const REQUEST_HEADERS_TO_REPLACE = new Set(['host', 'content-length']);

const RESPONSE_HEADERS_TO_SKIP = new Set([
  'connection',
  'keep-alive',
  'transfer-encoding',
  'content-length',
  'content-encoding'
]);

export type ProxyRequestOptions = {
  stripPrefix?: string;
  onProxied?: (capture: ProxiedCapture) => void;
  onProxyError?: (detail: { url: string; method: string; error: string }) => void;
};

export const resolveProxy = (
  responseProxy: ProxyValue | undefined,
  methodProxy: MethodProxyValue | undefined,
  globalProxy: string | undefined
): ProxyTarget | null => {
  if (responseProxy === undefined) {
    return null;
  }

  if (responseProxy !== true) {
    return typeof responseProxy === 'string'
      ? { target: responseProxy }
      : responseProxy;
  }

  if (typeof methodProxy === 'string') {
    return { target: methodProxy };
  }

  if (methodProxy) {
    return methodProxy;
  }

  if (globalProxy) {
    return { target: globalProxy };
  }

  return null;
};

const buildProxyUrl = (
  proxy: ProxyTarget,
  req: Request,
  stripPrefix?: string
): string => {
  if (proxy.path) {
    const queryIndex = req.originalUrl.indexOf('?');
    const query = queryIndex >= 0 ? req.originalUrl.slice(queryIndex) : '';
    const path = proxy.path.startsWith('/') ? proxy.path : `/${ proxy.path }`;

    return new URL(`${ path }${ query }`, proxy.target).toString();
  }

  let pathWithQuery = req.originalUrl;

  if (stripPrefix) {
    const normalizedPrefix = stripPrefix.startsWith('/') ? stripPrefix : `/${ stripPrefix }`;
    const queryIndex = req.originalUrl.indexOf('?');
    const pathname = queryIndex >= 0 ? req.originalUrl.slice(0, queryIndex) : req.originalUrl;
    const query = queryIndex >= 0 ? req.originalUrl.slice(queryIndex) : '';

    if (pathname === normalizedPrefix || pathname.startsWith(`${ normalizedPrefix }/`)) {
      const rest = pathname.slice(normalizedPrefix.length) || '/';
      pathWithQuery = `${ rest }${ query }`;
    }
  }

  return new URL(pathWithQuery, proxy.target).toString();
};

const buildOutgoingHeaders = (req: Request): Record<string, string> => {
  const headers: Record<string, string> = {};

  for (const [key, value] of Object.entries(req.headers)) {
    if (value === undefined || REQUEST_HEADERS_TO_REPLACE.has(key.toLowerCase())) {
      continue;
    }

    headers[key] = Array.isArray(value) ? value.join(', ') : value;
  }

  return headers;
};

const buildOutgoingBody = (req: Request): BodyInit | undefined => {
  const method = req.method.toUpperCase();

  if (method === 'GET' || method === 'HEAD') {
    return undefined;
  }

  if (req.rawBody && req.rawBody.length > 0) {
    return new Uint8Array(req.rawBody);
  }

  if (req.body === undefined) {
    return undefined;
  }

  return typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
};

export const proxyRequest = async (
  proxy: ProxyTarget,
  req: Request,
  res: Response,
  options?: ProxyRequestOptions
): Promise<void> => {
  const url = buildProxyUrl(proxy, req, options?.stripPrefix);
  const headers = buildOutgoingHeaders(req);
  const body = buildOutgoingBody(req);

  try {
    const upstream = await fetch(url, {
      method: req.method,
      headers,
      body,
      redirect: 'manual'
    });

    const responseHeaders: Record<string, string> = {};
    upstream.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });

    const responseBody = Buffer.from(await upstream.arrayBuffer());

    res.status(upstream.status);

    for (const [key, value] of Object.entries(responseHeaders)) {
      if (RESPONSE_HEADERS_TO_SKIP.has(key.toLowerCase())) {
        continue;
      }

      res.setHeader(key, value);
    }

    res.send(responseBody);

    options?.onProxied?.({
      status: upstream.status,
      headers: responseHeaders,
      body: responseBody,
      url
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    options?.onProxyError?.({
      url,
      method: req.method.toUpperCase(),
      error: message
    });
    logError(
      `[proxy:error] ${ req.method.toUpperCase() } ${ req.originalUrl } → ${ url }\n  error: ${ message }\n  recorded: no`
    );
    res.status(502).json({
      message: 'Proxy request failed',
      error: message,
      target: url
    });
  }
};
