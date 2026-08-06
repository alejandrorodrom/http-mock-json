'use strict';

const fs = require('fs');
const path = require('path');
const { createWorkspace, startMockServer } = require('../../lib/server-harness');
const { request, expectStatus, expectEqual } = require('../../lib/http-assert');

const writeJson = (filePath, value) => {
  fs.writeFileSync(filePath, `${ JSON.stringify(value, null, 2) }\n`, 'utf8');
};

/** @type {Array<{
 *   id: string,
 *   path: string,
 *   kind: 'json' | 'binary' | 'redirect' | 'text',
 *   method?: string,
 *   json?: unknown,
 *   body?: string,
 *   headers?: Record<string, string>,
 *   multipart?: {
 *     fields?: Record<string, string>,
 *     file?: { name: string, filename: string, content: string, type?: string }
 *   },
 *   redirect?: 'manual',
 *   assertLive?: (body: unknown, res: { status: number, headers: Headers }) => string[]
 * }>}
 */
const CASES = [
  {
    id: 'jp/posts/1',
    path: '/jp/posts/1',
    kind: 'json',
    assertLive: (body) => (
      body && typeof body === 'object' && body.id === 1
        ? []
        : ['jsonplaceholder /posts/1 should return id=1']
    )
  },
  {
    id: 'jp/posts/1/comments',
    path: '/jp/posts/1/comments',
    kind: 'json',
    assertLive: (body) => (
      Array.isArray(body) && body.length > 0
        ? []
        : ['jsonplaceholder /posts/1/comments should return array']
    )
  },
  {
    id: 'jp/users/1',
    path: '/jp/users/1',
    kind: 'json',
    assertLive: (body) => (
      body && body.id === 1 && typeof body.email === 'string'
        ? []
        : ['jsonplaceholder /users/1 should return user']
    )
  },
  {
    id: 'jp/todos/1',
    path: '/jp/todos/1',
    kind: 'json',
    assertLive: (body) => (
      body && body.id === 1
        ? []
        : ['jsonplaceholder /todos/1 should return todo']
    )
  },
  {
    id: 'jp/comments?postId=1',
    path: '/jp/comments?postId=1',
    kind: 'json',
    assertLive: (body) => (
      Array.isArray(body) && body.every((item) => item.postId === 1)
        ? []
        : ['jsonplaceholder /comments?postId=1 should filter by postId']
    )
  },
  {
    id: 'jp/posts/999999',
    path: '/jp/posts/999999',
    kind: 'json',
    assertLive: (_body, res) => (
      res.status === 404
        ? []
        : [`jsonplaceholder missing post expected 404, got ${ res.status }`]
    )
  },
  {
    id: 'jp/posts-create',
    path: '/jp/posts',
    method: 'POST',
    kind: 'json',
    json: { title: 'hmj-record', body: 'from e2e', userId: 1 },
    assertLive: (body, res) => {
      const failures = [];
      if (res.status !== 201 && res.status !== 200) {
        failures.push(`jsonplaceholder POST /posts expected 200/201, got ${ res.status }`);
      }
      if (!body || body.title !== 'hmj-record') {
        failures.push('jsonplaceholder POST /posts should echo title');
      }
      return failures;
    }
  },
  {
    id: 'jp/posts/1-put',
    path: '/jp/posts/1',
    method: 'PUT',
    kind: 'json',
    json: { id: 1, title: 'hmj-put', body: 'updated', userId: 1 },
    assertLive: (body, res) => {
      const failures = [];
      if (res.status !== 200) {
        failures.push(`jsonplaceholder PUT /posts/1 expected 200, got ${ res.status }`);
      }
      if (!body || body.title !== 'hmj-put') {
        failures.push('jsonplaceholder PUT /posts/1 should echo title');
      }
      return failures;
    }
  },
  {
    id: 'jp/posts/1-patch',
    path: '/jp/posts/1',
    method: 'PATCH',
    kind: 'json',
    json: { title: 'hmj-patch' },
    assertLive: (body, res) => {
      const failures = [];
      if (res.status !== 200) {
        failures.push(`jsonplaceholder PATCH /posts/1 expected 200, got ${ res.status }`);
      }
      if (!body || body.title !== 'hmj-patch') {
        failures.push('jsonplaceholder PATCH /posts/1 should echo title');
      }
      return failures;
    }
  },
  {
    id: 'jp/posts/1-delete',
    path: '/jp/posts/1',
    method: 'DELETE',
    kind: 'json',
    assertLive: (_body, res) => (
      res.status === 200
        ? []
        : [`jsonplaceholder DELETE /posts/1 expected 200, got ${ res.status }`]
    )
  },

  {
    id: 'dj/products/1',
    path: '/dj/products/1',
    kind: 'json',
    assertLive: (body) => (
      body && body.id === 1 && typeof body.title === 'string'
        ? []
        : ['dummyjson /products/1 should return product']
    )
  },
  {
    id: 'dj/users/1',
    path: '/dj/users/1',
    kind: 'json',
    assertLive: (body) => (
      body && body.id === 1
        ? []
        : ['dummyjson /users/1 should return user']
    )
  },
  {
    id: 'dj/posts/1',
    path: '/dj/posts/1',
    kind: 'json',
    assertLive: (body) => (
      body && body.id === 1
        ? []
        : ['dummyjson /posts/1 should return post']
    )
  },
  {
    id: 'dj/todos/1',
    path: '/dj/todos/1',
    kind: 'json',
    assertLive: (body) => (
      body && body.id === 1
        ? []
        : ['dummyjson /todos/1 should return todo']
    )
  },
  {
    id: 'dj/image/150',
    path: '/dj/image/150',
    kind: 'binary',
    assertLive: (body, res) => {
      const failures = [];
      if (!(body instanceof Buffer) || body.length < 8) {
        failures.push('dummyjson /image/150 should return binary bytes');
      }
      const ct = res.headers.get('content-type') || '';
      if (!ct.includes('image/')) {
        failures.push(`dummyjson /image/150 content-type should be image/*, got ${ ct }`);
      }
      return failures;
    }
  },
  {
    id: 'dj/http/404',
    path: '/dj/http/404',
    kind: 'json',
    assertLive: (body, res) => {
      const failures = [];
      if (res.status !== 404) {
        failures.push(`dummyjson /http/404 expected 404, got ${ res.status }`);
      }
      if (!body || String(body.status) !== '404') {
        failures.push('dummyjson /http/404 body.status should be 404');
      }
      return failures;
    }
  },
  {
    id: 'dj/http/500/Server_Error',
    path: '/dj/http/500/Server_Error',
    kind: 'json',
    assertLive: (body, res) => {
      const failures = [];
      if (res.status !== 500) {
        failures.push(`dummyjson /http/500 expected 500, got ${ res.status }`);
      }
      if (!body || String(body.status) !== '500') {
        failures.push('dummyjson /http/500 body.status should be 500');
      }
      return failures;
    }
  },
  {
    id: 'dj/auth/login',
    path: '/dj/auth/login',
    method: 'POST',
    kind: 'json',
    json: { username: 'emilys', password: 'emilyspass', expiresInMins: 30 },
    assertLive: (body, res) => {
      const failures = [];
      if (res.status !== 200) {
        failures.push(`dummyjson login expected 200, got ${ res.status }`);
      }
      if (!body || (typeof body.accessToken !== 'string' && typeof body.token !== 'string')) {
        failures.push('dummyjson login should return accessToken or token');
      }
      return failures;
    }
  },
  {
    id: 'dj/products/1-put',
    path: '/dj/products/1',
    method: 'PUT',
    kind: 'json',
    json: { title: 'hmj-recorded-product' },
    assertLive: (body, res) => {
      const failures = [];
      if (res.status !== 200) {
        failures.push(`dummyjson PUT /products/1 expected 200, got ${ res.status }`);
      }
      if (!body || body.title !== 'hmj-recorded-product') {
        failures.push('dummyjson PUT /products/1 should echo title');
      }
      return failures;
    }
  },

  {
    id: 'hb/json',
    path: '/hb/json',
    kind: 'json',
    assertLive: (body) => (
      body && typeof body === 'object'
        ? []
        : ['httpbin /json should return JSON object']
    )
  },
  {
    id: 'hb/get?foo=bar',
    path: '/hb/get?foo=bar',
    kind: 'json',
    assertLive: (body) => (
      body && body.args && body.args.foo === 'bar'
        ? []
        : ['httpbin /get?foo=bar should echo query']
    )
  },
  {
    id: 'hb/headers',
    path: '/hb/headers',
    kind: 'json',
    assertLive: (body) => (
      body && body.headers && typeof body.headers === 'object'
        ? []
        : ['httpbin /headers should return headers object']
    )
  },
  {
    id: 'hb/status/200',
    path: '/hb/status/200',
    kind: 'json',
    assertLive: (_body, res) => (
      res.status === 200 ? [] : ['httpbin /status/200 should be 200']
    )
  },
  {
    id: 'hb/status/302',
    path: '/hb/status/302',
    kind: 'redirect',
    redirect: 'manual',
    assertLive: (_body, res) => {
      const failures = [];
      if (res.status !== 302) {
        failures.push(`httpbin /status/302 expected 302, got ${ res.status }`);
      }
      if (!res.headers.get('location')) {
        failures.push('httpbin /status/302 should include Location');
      }
      return failures;
    }
  },
  {
    id: 'hb/image/png',
    path: '/hb/image/png',
    kind: 'binary',
    assertLive: (body, res) => {
      const failures = [];
      if (!(body instanceof Buffer) || body.length < 8) {
        failures.push('httpbin /image/png should return binary');
      }
      if (body instanceof Buffer && body.subarray(0, 4).toString('hex') !== '89504e47') {
        failures.push('httpbin /image/png should start with PNG signature');
      }
      const ct = res.headers.get('content-type') || '';
      if (!ct.includes('image/png')) {
        failures.push(`httpbin /image/png content-type, got ${ ct }`);
      }
      return failures;
    }
  },
  {
    id: 'hb/status/404',
    path: '/hb/status/404',
    kind: 'json',
    assertLive: (_body, res) => (
      res.status === 404
        ? []
        : [`httpbin /status/404 expected 404, got ${ res.status }`]
    )
  },
  {
    id: 'hb/status/401',
    path: '/hb/status/401',
    kind: 'json',
    assertLive: (_body, res) => {
      const failures = [];
      if (res.status !== 401) {
        failures.push(`httpbin /status/401 expected 401, got ${ res.status }`);
      }
      if (!res.headers.get('www-authenticate')) {
        failures.push('httpbin /status/401 should include WWW-Authenticate');
      }
      return failures;
    }
  },
  {
    id: 'hb/status/500',
    path: '/hb/status/500',
    kind: 'json',
    assertLive: (_body, res) => (
      res.status === 500
        ? []
        : [`httpbin /status/500 expected 500, got ${ res.status }`]
    )
  },
  {
    id: 'hb/status/418',
    path: '/hb/status/418',
    kind: 'json',
    assertLive: (_body, res) => (
      res.status === 418
        ? []
        : [`httpbin /status/418 expected 418, got ${ res.status }`]
    )
  },
  {
    id: 'hb/post-json',
    path: '/hb/post',
    method: 'POST',
    kind: 'json',
    json: { hello: 'hmj-record', n: 7 },
    assertLive: (body) => (
      body && body.json && body.json.hello === 'hmj-record' && body.json.n === 7
        ? []
        : ['httpbin POST /post should echo JSON body']
    )
  },
  {
    id: 'hb/put-json',
    path: '/hb/put',
    method: 'PUT',
    kind: 'json',
    json: { op: 'hmj-put' },
    assertLive: (body) => (
      body && body.json && body.json.op === 'hmj-put'
        ? []
        : ['httpbin PUT /put should echo JSON body']
    )
  },
  {
    id: 'hb/patch-json',
    path: '/hb/patch',
    method: 'PATCH',
    kind: 'json',
    json: { op: 'hmj-patch' },
    assertLive: (body) => (
      body && body.json && body.json.op === 'hmj-patch'
        ? []
        : ['httpbin PATCH /patch should echo JSON body']
    )
  },
  {
    id: 'hb/delete',
    path: '/hb/delete',
    method: 'DELETE',
    kind: 'json',
    assertLive: (_body, res) => (
      res.status === 200
        ? []
        : [`httpbin DELETE /delete expected 200, got ${ res.status }`]
    )
  },
  {
    id: 'hb/post-urlencoded',
    path: '/hb/post',
    method: 'POST',
    kind: 'json',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'foo=bar&source=hmj',
    assertLive: (body) => (
      body && body.form && body.form.foo === 'bar' && body.form.source === 'hmj'
        ? []
        : ['httpbin POST urlencoded should echo form fields']
    )
  },
  {
    id: 'hb/post-multipart',
    path: '/hb/anything',
    method: 'POST',
    kind: 'json',
    multipart: {
      fields: { field: 'hmj-multipart' },
      file: {
        name: 'upload',
        filename: 'note.txt',
        content: 'hello-record',
        type: 'text/plain'
      }
    },
    assertLive: (body) => {
      const failures = [];
      if (!body || typeof body !== 'object') {
        return ['httpbin multipart /anything should return JSON'];
      }
      const form = body.form || {};
      const files = body.files || {};
      if (form.field !== 'hmj-multipart') {
        failures.push('httpbin multipart should echo form field');
      }
      if (files.upload === undefined && form.upload === undefined) {
        if (!JSON.stringify(body).includes('hello-record') && !JSON.stringify(body).includes('note.txt')) {
          failures.push('httpbin multipart should include uploaded file metadata or content');
        }
      }
      return failures;
    }
  },
  {
    id: 'hb/basic-auth',
    path: '/hb/basic-auth/user/passwd',
    kind: 'json',
    headers: {
      Authorization: `Basic ${ Buffer.from('user:passwd').toString('base64') }`
    },
    assertLive: (body, res) => {
      const failures = [];
      if (res.status !== 200) {
        failures.push(`httpbin basic-auth expected 200, got ${ res.status }`);
      }
      if (!body || body.authenticated !== true) {
        failures.push('httpbin basic-auth should return authenticated true');
      }
      return failures;
    }
  },
  {
    id: 'hb/basic-auth-fail',
    path: '/hb/basic-auth/user/passwd',
    kind: 'json',
    assertLive: (_body, res) => (
      res.status === 401
        ? []
        : [`httpbin basic-auth without creds expected 401, got ${ res.status }`]
    )
  },
  {
    id: 'hb/bearer',
    path: '/hb/bearer',
    kind: 'json',
    headers: { Authorization: 'Bearer hmj-record-token' },
    assertLive: (body, res) => {
      const failures = [];
      if (res.status !== 200) {
        failures.push(`httpbin bearer expected 200, got ${ res.status }`);
      }
      if (!body || body.authenticated !== true || body.token !== 'hmj-record-token') {
        failures.push('httpbin bearer should echo token');
      }
      return failures;
    }
  },
  {
    id: 'hb/cookies',
    path: '/hb/cookies',
    kind: 'json',
    headers: { Cookie: 'hmj=recorded' },
    assertLive: (body) => (
      body && body.cookies && body.cookies.hmj === 'recorded'
        ? []
        : ['httpbin /cookies should echo Cookie header']
    )
  },
  {
    id: 'hb/cookies-set',
    path: '/hb/cookies/set?hmj=1',
    kind: 'redirect',
    redirect: 'manual',
    assertLive: (_body, res) => {
      const failures = [];
      if (![200, 302, 301, 307, 308].includes(res.status)) {
        failures.push(`httpbin cookies/set unexpected status ${ res.status }`);
      }
      if (res.status >= 300 && res.status < 400 && !res.headers.get('location')) {
        failures.push('httpbin cookies/set redirect should include Location');
      }
      const setCookie = res.headers.get('set-cookie') || '';
      if (res.status === 200 && !setCookie && !res.headers.get('location')) {
        failures.push('httpbin cookies/set should set cookie or redirect');
      }
      return failures;
    }
  },
  {
    id: 'hb/html',
    path: '/hb/html',
    kind: 'text',
    assertLive: (body, res) => {
      const failures = [];
      if (res.status !== 200) {
        failures.push(`httpbin /html expected 200, got ${ res.status }`);
      }
      const ct = res.headers.get('content-type') || '';
      if (!ct.includes('text/html')) {
        failures.push(`httpbin /html content-type, got ${ ct }`);
      }
      if (typeof body !== 'string' || !body.toLowerCase().includes('html')) {
        failures.push('httpbin /html body should be HTML text');
      }
      return failures;
    }
  },
  {
    id: 'hb/xml',
    path: '/hb/xml',
    kind: 'text',
    assertLive: (body, res) => {
      const failures = [];
      if (res.status !== 200) {
        failures.push(`httpbin /xml expected 200, got ${ res.status }`);
      }
      const ct = res.headers.get('content-type') || '';
      if (!ct.includes('xml')) {
        failures.push(`httpbin /xml content-type, got ${ ct }`);
      }
      if (typeof body !== 'string' || !body.includes('<')) {
        failures.push('httpbin /xml body should be XML text');
      }
      return failures;
    }
  },
  {
    id: 'hb/robots',
    path: '/hb/robots.txt',
    kind: 'text',
    assertLive: (body, res) => {
      const failures = [];
      if (res.status !== 200) {
        failures.push(`httpbin /robots.txt expected 200, got ${ res.status }`);
      }
      if (typeof body !== 'string' || body.length < 1) {
        failures.push('httpbin /robots.txt should return text');
      }
      return failures;
    }
  },
  {
    id: 'hb/gzip',
    path: '/hb/gzip',
    kind: 'json',
    assertLive: (body, res) => {
      const failures = [];
      if (res.status !== 200) {
        failures.push(`httpbin /gzip expected 200, got ${ res.status }`);
      }
      if (!body || body.gzipped !== true) {
        failures.push('httpbin /gzip should return decompressed JSON with gzipped:true');
      }
      return failures;
    }
  },

  {
    id: 'ps/200/300',
    path: '/ps/200/300',
    kind: 'redirect',
    redirect: 'manual',
    assertLive: (_body, res) => {
      const failures = [];
      if (![200, 302, 301, 307, 308].includes(res.status)) {
        failures.push(`picsum /200/300 unexpected status ${ res.status }`);
      }
      if (res.status >= 300 && res.status < 400 && !res.headers.get('location')) {
        failures.push('picsum redirect should include Location');
      }
      return failures;
    }
  },
  {
    id: 'ps/id/1/200/300',
    path: '/ps/id/1/200/300',
    kind: 'binary',
    redirect: 'manual',
    assertLive: (body, res) => {
      if (res.status >= 300 && res.status < 400) {
        return res.headers.get('location')
          ? []
          : ['picsum id image redirect missing Location'];
      }
      if (res.status === 200) {
        return body instanceof Buffer ? [] : ['picsum id image 200 should be buffer'];
      }
      return [`picsum /id/1/200/300 unexpected status ${ res.status }`];
    }
  },
  {
    id: 'ps/id/999999999/200/300',
    path: '/ps/id/999999999/200/300',
    kind: 'json',
    redirect: 'manual',
    assertLive: (_body, res) => (
      [404, 400].includes(res.status)
        ? []
        : [`picsum missing id expected 404/400, got ${ res.status }`]
    )
  }
];

const toSnapshot = (item, res) => ({
  id: item.id,
  path: item.path,
  kind: item.kind,
  status: res.status,
  contentType: res.headers.get('content-type'),
  location: res.headers.get('location'),
  body: res.body instanceof Buffer
    ? { type: 'buffer', hex: res.body.toString('hex'), length: res.body.length }
    : { type: 'json', value: res.body }
});

const fetchCase = async (baseUrl, item) => {
  const as = item.kind === 'binary' ? 'buffer' : item.kind === 'text' ? 'text' : 'auto';
  /** @type {import('../../lib/http-assert') extends never ? any : Parameters<typeof request>[1]} */
  const options = {
    method: item.method || 'GET',
    as,
    redirect: item.redirect,
    headers: item.headers ? { ...item.headers } : undefined
  };

  if (item.multipart) {
    const form = new FormData();
    for (const [key, value] of Object.entries(item.multipart.fields || {})) {
      form.append(key, value);
    }
    if (item.multipart.file) {
      const file = item.multipart.file;
      form.append(
        file.name,
        new Blob([file.content], { type: file.type || 'text/plain' }),
        file.filename
      );
    }
    options.body = form;
  } else if (item.json !== undefined) {
    options.json = item.json;
  } else if (item.body !== undefined) {
    options.body = item.body;
  }

  return request(`${ baseUrl }${ item.path }`, options);
};

const isRedirectStatus = (status) => status >= 300 && status < 400;

const normalizeSnapshotBody = (snap) => {
  if (isRedirectStatus(snap.status)) {
    return { type: 'json', value: null };
  }

  if (snap.body.type === 'buffer') {
    if (snap.body.length === 0 || snap.body.hex === '6e756c6c') {
      return { type: 'json', value: null };
    }
    return snap.body;
  }

  const value = snap.body.value;
  if (value === null || value === undefined || value === '' || value === 'null') {
    return { type: 'json', value: null };
  }

  return snap.body;
};

const compareSnapshots = (live, replayed, label) => {
  const failures = [];
  failures.push(...expectStatus(replayed.status, live.status, `${ label } status`));

  if (live.location || replayed.location) {
    failures.push(...expectEqual(replayed.location, live.location, `${ label } location`));
  }

  if (isRedirectStatus(live.status)) {
    return failures;
  }

  const liveBody = normalizeSnapshotBody(live);
  const replayBody = normalizeSnapshotBody(replayed);

  if (liveBody.type === 'buffer') {
    if (replayBody.type !== 'buffer') {
      failures.push(`${ label }: replay body should be binary`);
    } else {
      failures.push(...expectEqual(replayBody.length, liveBody.length, `${ label } binary length`));
      failures.push(...expectEqual(replayBody.hex, liveBody.hex, `${ label } binary bytes`));
    }
  } else {
    failures.push(...expectEqual(replayBody.value, liveBody.value, `${ label } body`));
  }

  return failures;
};

module.exports = {
  name: 'runtime/record-replay-public-apis',
  description: 'HTTP: record JSONPlaceholder/DummyJSON/httpbin/Picsum and replay equal responses',
  async run() {
    const startedAt = Date.now();
    const failures = [];
    const { workspaceDir, cleanup } = createWorkspace(null, { emptyMocksDir: true });
    const mocksDir = path.join(workspaceDir, 'mocks');

    for (const folder of ['jsonplaceholder', 'dummyjson', 'httpbin', 'picsum']) {
      fs.mkdirSync(path.join(mocksDir, folder), { recursive: true });
    }

    writeJson(path.join(mocksDir, 'mock.config.json'), {
      folders: {
        jsonplaceholder: {
          prefix: '/jp',
          stripPrefix: true,
          proxyUnmatched: 'https://jsonplaceholder.typicode.com'
        },
        dummyjson: {
          prefix: '/dj',
          stripPrefix: true,
          proxyUnmatched: 'https://dummyjson.com'
        },
        httpbin: {
          prefix: '/hb',
          stripPrefix: true,
          proxyUnmatched: 'https://httpbin.org'
        },
        picsum: {
          prefix: '/ps',
          stripPrefix: true,
          proxyUnmatched: 'https://picsum.photos'
        }
      }
    });

    writeJson(path.join(mocksDir, 'jsonplaceholder', 'health.json'), {
      health: {
        GET: {
          nameResponse: 'ok',
          responses: [{ name: 'ok', statusCode: 200, body: { ok: true } }]
        }
      }
    });

    let recordServer;
    let replayServer;
    /** @type {Awaited<ReturnType<typeof snapshotOf>>[]} */
    const liveSnapshots = [];

    try {
      recordServer = await startMockServer({
        workspaceDir,
        cleanup,
        cleanupOnStop: false,
        record: true,
        timeoutMs: 90000
      });

      for (const item of CASES) {
        try {
          const live = await fetchCase(recordServer.baseUrl, item);

          if (item.assertLive) {
            failures.push(...item.assertLive(live.body, live).map((msg) => `[live ${ item.id }] ${ msg }`));
          }

          liveSnapshots.push(toSnapshot(item, live));
        } catch (error) {
          failures.push(
            `[live ${ item.id }] ${ error instanceof Error ? error.message : String(error) }`
          );
        }
      }

      await recordServer.stop();
      recordServer = null;

      for (const folder of ['jsonplaceholder', 'dummyjson', 'httpbin', 'picsum']) {
        const dir = path.join(mocksDir, folder, '.recordings');
        if (!fs.existsSync(dir)) {
          failures.push(`expected recordings dir for ${ folder }`);
          continue;
        }
        const jsonFiles = fs.readdirSync(dir).filter((name) => name.endsWith('.json'));
        if (jsonFiles.length === 0) {
          failures.push(`expected at least one recording JSON in ${ folder }/.recordings`);
        }
      }

      const binaryDirs = [
        path.join(mocksDir, 'dummyjson', '.recordings', 'files'),
        path.join(mocksDir, 'httpbin', '.recordings', 'files')
      ];
      const hasBinaryFile = binaryDirs.some(
        (dir) => fs.existsSync(dir) && fs.readdirSync(dir).length > 0
      );
      if (!hasBinaryFile) {
        failures.push('expected binary recordings under dummyjson or httpbin .recordings/files');
      }

      replayServer = await startMockServer({
        workspaceDir,
        cleanup,
        cleanupOnStop: false,
        recordingsOnly: true,
        timeoutMs: 90000
      });

      if (!replayServer.stdout.includes('── Recordings ──')) {
        failures.push('replay start should list Recordings section');
      }

      for (const live of liveSnapshots) {
        try {
          const item = CASES.find((entry) => entry.id === live.id);
          const replayRes = await fetchCase(replayServer.baseUrl, item);
          const replayed = toSnapshot(item, replayRes);
          failures.push(
            ...compareSnapshots(live, replayed, `replay ${ live.id }`).map(
              (msg) => `[${ msg }]`
            )
          );
        } catch (error) {
          failures.push(
            `[replay ${ live.id }] ${ error instanceof Error ? error.message : String(error) }`
          );
        }
      }

      await replayServer.stop();
      replayServer = null;
    } catch (error) {
      failures.push(error instanceof Error ? error.message : String(error));
    } finally {
      if (recordServer) {
        await recordServer.stop();
      }
      if (replayServer) {
        await replayServer.stop();
      }
      cleanup();
    }

    return {
      name: 'runtime/record-replay-public-apis',
      description: 'HTTP: record JSONPlaceholder/DummyJSON/httpbin/Picsum and replay equal responses',
      passed: failures.length === 0,
      failures,
      durationMs: Date.now() - startedAt,
      expectedOutcome: 'success'
    };
  }
};
