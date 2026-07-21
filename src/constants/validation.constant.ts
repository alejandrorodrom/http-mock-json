export const VALID_HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

/**
 * IANA HTTP Status Code Registry (last updated 2025-09-15).
 * Includes registered codes only; excludes Unassigned ranges and obsoleted 510.
 * 104 is temporary (resumable upload) and remains registered until 2026-11-13.
 *
 * @see https://www.iana.org/assignments/http-status-codes/http-status-codes.xhtml
 */
export const VALID_STATUS_CODES = [
  // 1xx Informational
  100, 101, 102, 103, 104,
  // 2xx Success
  200, 201, 202, 203, 204, 205, 206, 207, 208, 226,
  // 3xx Redirection
  300, 301, 302, 303, 304, 305, 306, 307, 308,
  // 4xx Client Error
  400, 401, 402, 403, 404, 405, 406, 407, 408, 409, 410, 411, 412, 413, 414, 415,
  416, 417, 418, 421, 422, 423, 424, 425, 426, 428, 429, 431, 451,
  // 5xx Server Error
  500, 501, 502, 503, 504, 505, 506, 507, 508, 511
];

export const VALID_ENDPOINT_REGEXP = /^[a-zA-Z0-9._~-]+(?:\/[a-zA-Z0-9._~-]+|\/:[a-zA-Z0-9_]+)*$/;
