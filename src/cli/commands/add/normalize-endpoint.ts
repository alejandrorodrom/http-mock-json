/**
 * Strip leading/trailing slashes for stable route keys.
 */
export const normalizeEndpoint = (endpoint: string): string => {
  return endpoint.replace(/^\/+|\/+$/g, '');
};
