import { Request, Response } from 'express';
import { MethodProxyValue, ProxyTarget, ProxyValue } from '../types/proxy.type';

// Must be replaced for the upstream request; everything else is forwarded as-is.
const REQUEST_HEADERS_TO_REPLACE = new Set(['host', 'content-length']);

// Express sets these when writing the response body; forwarding them breaks the client response.
const RESPONSE_HEADERS_TO_SKIP = new Set([
  'connection',
  'keep-alive',
  'transfer-encoding',
  'content-length'
]);

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
  req: Request
): string => {
  if (!proxy.path) {
    return new URL(req.originalUrl, proxy.target).toString();
  }

  const queryIndex = req.originalUrl.indexOf('?');
  const query = queryIndex >= 0 ? req.originalUrl.slice(queryIndex) : '';
  const path = proxy.path.startsWith('/') ? proxy.path : `/${ proxy.path }`;

  return new URL(`${ path }${ query }`, proxy.target).toString();
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

const buildOutgoingBody = (req: Request): string | undefined => {
  const method = req.method.toUpperCase();

  if (method === 'GET' || method === 'HEAD' || req.body === undefined) {
    return undefined;
  }

  return typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
};

export const proxyRequest = async (
  proxy: ProxyTarget,
  req: Request,
  res: Response
): Promise<void> => {
  const url = buildProxyUrl(proxy, req);
  const headers = buildOutgoingHeaders(req);
  const body = buildOutgoingBody(req);

  try {
    const upstream = await fetch(url, {
      method: req.method,
      headers,
      body
    });

    res.status(upstream.status);

    upstream.headers.forEach((value, key) => {
      if (RESPONSE_HEADERS_TO_SKIP.has(key.toLowerCase())) {
        return;
      }

      res.setHeader(key, value);
    });

    res.send(Buffer.from(await upstream.arrayBuffer()));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(502).json({
      message: 'Proxy request failed',
      error: message,
      target: url
    });
  }
};
