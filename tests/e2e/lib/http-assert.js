'use strict';

/**
 * @param {string} url
 * @param {RequestInit & { json?: unknown }} [options]
 */
async function request(url, options = {}) {
  const { json, headers, ...rest } = options;
  const finalHeaders = { ...(headers || {}) };

  let body = rest.body;
  if (json !== undefined) {
    finalHeaders['Content-Type'] = finalHeaders['Content-Type'] || 'application/json';
    body = JSON.stringify(json);
  }

  const response = await fetch(url, {
    ...rest,
    headers: finalHeaders,
    body
  });

  const contentType = response.headers.get('content-type') || '';
  let payload = null;

  if (response.status !== 204) {
    const text = await response.text();
    if (text.length > 0) {
      payload = contentType.includes('application/json') ? JSON.parse(text) : text;
    }
  }

  return {
    status: response.status,
    headers: response.headers,
    body: payload
  };
}

/**
 * @param {unknown} actual
 * @param {unknown} expected
 * @param {string} label
 * @returns {string[]}
 */
function expectEqual(actual, expected, label) {
  const actualJson = JSON.stringify(actual);
  const expectedJson = JSON.stringify(expected);

  if (actualJson !== expectedJson) {
    return [`${ label }: expected ${ expectedJson }, received ${ actualJson }`];
  }

  return [];
}

/**
 * @param {number} actual
 * @param {number} expected
 * @param {string} label
 */
function expectStatus(actual, expected, label) {
  if (actual !== expected) {
    return [`${ label }: expected status ${ expected }, received ${ actual }`];
  }
  return [];
}

/**
 * @param {Headers} headers
 * @param {string} name
 * @param {string} expected
 * @param {string} label
 */
function expectHeader(headers, name, expected, label) {
  const actual = headers.get(name);
  if (actual !== expected) {
    return [`${ label }: expected header ${ name }=${ JSON.stringify(expected) }, received ${ JSON.stringify(actual) }`];
  }
  return [];
}

/**
 * @param {number} elapsedMs
 * @param {number} minMs
 * @param {string} label
 */
function expectMinDelay(elapsedMs, minMs, label) {
  if (elapsedMs < minMs) {
    return [`${ label }: expected delay >= ${ minMs }ms, elapsed ${ elapsedMs }ms`];
  }
  return [];
}

module.exports = {
  request,
  expectEqual,
  expectStatus,
  expectHeader,
  expectMinDelay
};
