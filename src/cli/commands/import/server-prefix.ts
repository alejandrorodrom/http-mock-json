import { OpenAPI } from 'openapi-types';
import { normalizeEndpoint } from '../add/normalize-endpoint';

/**
 * Normalize a route prefix for mock.config.json folders (leading slash, no trailing slash).
 * Returns undefined when empty / root-only.
 */
export const normalizeRoutePrefix = (value: string | undefined): string | undefined => {
  if (value === undefined || value === null) {
    return undefined;
  }

  const trimmed = String(value).trim();
  if (trimmed.length === 0) {
    return undefined;
  }

  const withoutHost = (() => {
    try {
      if (/^https?:\/\//i.test(trimmed)) {
        return new URL(trimmed).pathname;
      }
      // Relative server URLs like "/api/v3"
      return new URL(trimmed, 'http://local.invalid').pathname;
    } catch {
      return trimmed;
    }
  })();

  const normalized = normalizeEndpoint(withoutHost.replace(/\{[^}]+\}/g, ''));
  if (normalized.length === 0) {
    return undefined;
  }

  return `/${ normalized }`;
};

const applyServerVariables = (
  url: string,
  variables: Record<string, { default?: string }> | undefined
): string => {
  return url.replace(/\{([a-zA-Z0-9_]+)\}/g, (_match, name: string) => {
    const fallback = variables?.[name]?.default;
    return fallback !== undefined ? String(fallback) : '';
  });
};

/**
 * Resolve the shared OpenAPI server path used as mock.config folder prefix.
 * Prefer explicit --prefix; otherwise servers[0] pathname when useServerPrefix is true.
 */
export const resolveOpenApiRoutePrefix = (
  document: OpenAPI.Document,
  options: { prefix?: string; useServerPrefix: boolean }
): { prefix?: string; warning?: string } => {
  if (options.prefix !== undefined) {
    const normalized = normalizeRoutePrefix(options.prefix);
    return { prefix: normalized };
  }

  if (!options.useServerPrefix) {
    return {};
  }

  const servers = (document as { servers?: Array<{ url?: string; variables?: Record<string, { default?: string }> }> }).servers;
  const first = servers?.[0];
  if (!first?.url || typeof first.url !== 'string') {
    return {};
  }

  if (/\{[^}]+\}/.test(first.url) && !first.variables) {
    return {
      warning:
        `servers[0].url "${ first.url }" has unresolved variables; server path prefix skipped`
    };
  }

  const expanded = applyServerVariables(first.url, first.variables);
  if (/\{[^}]+\}/.test(expanded)) {
    return {
      warning:
        `servers[0].url "${ first.url }" still has unresolved variables after defaults; server path prefix skipped`
    };
  }

  return { prefix: normalizeRoutePrefix(expanded) };
};
