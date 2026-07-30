# Body compatibility (request & response) 📦

**Live contract** (since **4.0.0**) for multi content-type request validation, tolerant intake (multipart / form / raw / text), grouped `error` options, and binary mock responses (`encoding`).

See also [Example 9](advanced-examples.md#example-9-request-validation) for classic JSON/`query` validation using the same `payload` + `error` keys.

### Goals

1. **Do not fail** when the frontend sends `multipart/form-data`, urlencoded, raw binary, or text — respond like the real API (usually JSON).
2. **Validate** those payloads with one clear shape: always `{ "type": "...", ... }` (and `format` when relevant).
3. **Respond** with images/PDFs/etc. via `encoding` + `body` (no separate `bodyFile` key).

### Request contract

```text
request?: {
  as?: "json" | "form" | "multipart" | "raw" | "text"   // omit = auto from Content-Type
  payload?: PayloadSchema
  query?: FieldMap
  headers?: FieldMap
  error?: {
    response?: string           // named response on validation failure
    format?: "array" | "map"    // default: "array"
    detail?: object | string
    key?: string                // default: "errors"
  }
}
```

**Minimal (JSON):**

```json
"request": {
  "payload": {
    "email": { "type": "string", "format": "email" },
    "password": { "type": "string", "minLength": 8 }
  },
  "error": {
    "response": "invalid"
  }
}
```

**Multipart profile upload:**

```json
"request": {
  "payload": {
    "name": { "type": "string", "minLength": 2 },
    "email": { "type": "string", "format": "email" },
    "age?": { "type": "number", "min": 18, "max": 120 },
    "avatar": { "type": "file", "format": ["png", "jpeg"] },
    "banner?": { "type": "file", "format": "image/*" },
    "cv?": {
      "type": "file",
      "format": "pdf",
      "maxSize": 5000000,
      "message": "CV must be a PDF up to 5MB"
    }
  },
  "error": {
    "response": "invalid",
    "format": "map"
  }
}
```

Frontend equivalent:

```js
const form = new FormData();
form.append('name', 'Ada');
form.append('email', 'ada@example.com');
form.append('avatar', pngFile);
await fetch('/api/profile', { method: 'POST', body: form });
```

**Force multipart (reject other Content-Types first):**

```json
"request": {
  "as": "multipart",
  "payload": {
    "title": { "type": "string" },
    "file": { "type": "file", "format": "png" }
  },
  "error": { "response": "invalid" }
}
```

**Raw body (e.g. `PUT` image):**

```json
"request": {
  "as": "raw",
  "payload": {
    "type": "file",
    "format": ["png", "jpeg"],
    "maxSize": 2000000
  },
  "error": { "response": "invalid" }
}
```

### Payload field rules (`type` / `format`)

**One shape for every field:** an object with `type`. Use `format` when you need a string format or a file kind. Do **not** use ambiguous shorthands like `"email": "email"` or `"avatar": ["png", "jpeg"]`.

Optional fields: trailing `?` on the key (`"age?"`, `"cv?"`).

#### Options by `type`

| Option | `string` | `number` | `boolean` | `object` | `array` | `file` |
|--------|----------|----------|-----------|----------|---------|--------|
| `format` | `email`, `uuid`, `url`, `date` | — | — | — | — | `png`, `jpeg`, `webp`, `pdf`, `image/*`, `file`, MIME, or list |
| `minLength` / `maxLength` | ✅ | — | — | — | — | — |
| `pattern` | ✅ | — | — | — | — | optional filename pattern |
| `min` / `max` | — | ✅ | — | — | — | — |
| `enum` | ✅ | ✅ | — | — | — | — |
| `properties` | — | — | — | ✅ | — | — |
| `items` | — | — | — | — | ✅ | — |
| `minItems` / `maxItems` | — | — | — | — | ✅ | multiple parts with same name |
| `maxSize` / `minSize` | — | — | — | — | — | ✅ (bytes) |
| `requireFilename` | — | — | — | — | — | ✅ optional |
| `message` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `messages` | ✅ per-rule map (optional) | same | same | same | same | same |

`format` aliases for files (resolved internally):

| User writes | Means |
|-------------|--------|
| `png` | `image/png` |
| `jpeg` / `jpg` | `image/jpeg` |
| `webp` | `image/webp` |
| `gif` | `image/gif` |
| `pdf` | `application/pdf` |
| `image/*` | any image |
| `file` / `*/*` | any file part |
| `image/png` | used as-is |

Examples:

```json
"email": { "type": "string", "format": "email" }
"age": { "type": "number", "min": 18 }
"active": { "type": "boolean" }
"avatar": { "type": "file", "format": ["png", "jpeg"], "maxSize": 2000000 }
"tags": {
  "type": "array",
  "minItems": 1,
  "items": { "type": "string" }
}
```

**Legacy type-only shortcut** (still allowed for non-file types, same as Example 9):

```json
"name": "string"
```

equals `{ "type": "string" }`. Formats and files **must** use the object form.

### Content-Type detection (`as`)

| `as` | Behavior |
|------|----------|
| *(omitted)* | **Auto:** detect from the incoming `Content-Type`, then validate `payload` |
| `"json"` | Require JSON; else validation error → `error.response` |
| `"form"` | Require `application/x-www-form-urlencoded` |
| `"multipart"` | Require `multipart/form-data` |
| `"raw"` | Require binary/raw (`image/*`, `application/pdf`, `octet-stream`, …) |
| `"text"` | Require `text/plain` |

Auto mapping:

| Incoming `Content-Type` | Mode |
|-------------------------|------|
| `application/json` / `+json` | json |
| `application/x-www-form-urlencoded` | form |
| `multipart/form-data` | multipart |
| `image/*`, `application/pdf`, `application/octet-stream`, … | raw |
| `text/plain` | text |
| no body (GET/HEAD) | skip payload; still validate `query` / `headers` |

Flow when `as` is set:

```text
1) Does the frontend Content-Type match `as`?
   NO  → validation error (default or error.response)
   YES → validate payload / query / headers
```

Without `as`: detect → validate payload for that mode.

**Intake rule:** if there is no `request`, or no file rules and no forced `as`, opaque bodies must **not** crash the server — select the mock response as usual (typical upload → JSON `201`).

### Error object

All optional; defaults always apply.

```json
"error": {
  "response": "invalid",
  "format": "map",
  "detail": "{{message}}",
  "key": "errors"
}
```

| Key | Default | Role |
|-----|---------|------|
| `response` | generic `400` | Named response to use on failure |
| `format` | `"array"` | `"array"` = list of issue objects; `"map"` = `{ field: [messages] }` |
| `detail` | built-in per format | Template(s) with `{{path}}`, `{{rule}}`, `{{expected}}`, `{{received}}`, `{{message}}` |
| `key` | `"errors"` | Property name where errors are injected into the response body |

Message resolution per failed rule:

```text
rule.messages[ruleName] → rule.message → library default
```

### Response `encoding`

**Response-only** (how to serialize `body`). Not used on `request`.

| `encoding` | `body` means | Output |
|------------|--------------|--------|
| *(omitted)* | JSON / primitive | `res.json(body)` |
| `"base64"` | base64 string | decoded bytes |
| `"file"` | relative path under mocks root | file bytes (paths with `..` rejected) |

```json
{
  "name": "avatar",
  "statusCode": 200,
  "headers": { "Content-Type": "image/png" },
  "encoding": "file",
  "body": "fixtures/avatar.png"
}
```

```json
{
  "name": "tiny",
  "statusCode": 200,
  "headers": { "Content-Type": "image/png" },
  "encoding": "base64",
  "body": "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
}
```

#### What you **can** do

| Goal | How |
|------|-----|
| Serve a local image/PDF/binary from the mocks folder | `"encoding": "file"`, `"body": "assets/avatar.png"` (+ usually `Content-Type`) |
| Serve bytes embedded in the mock JSON | `"encoding": "base64"`, `"body": "<base64>"` |
| Keep classic JSON mocks | Omit `encoding` (default `res.json`) |
| Choose binary vs proxy vs store by scenario | **Separate** responses (e.g. different `match` / `nameResponse`) — one mode per response |
| Validate upload then return JSON | `request` (multipart/file) + normal JSON `body` (no `encoding` required) |
| Proxy multipart/binary upstream unchanged | `proxy` on the response (uses `rawBody`; do **not** set `encoding` on that same response) |

#### What you **cannot** do (startup error)

One response = **one** output mode. Mixing them on the **same** response fails validation:

| Combination | Result |
|-------------|--------|
| `encoding` + `proxy` | ❌ config error |
| `encoding` + `action` | ❌ config error |
| `proxy` + `action` | ❌ config error (unchanged) |
| `encoding` not `file` / `base64` | ❌ config error |
| `encoding` set but `body` is not a string | ❌ config error |
| `encoding: "file"` with empty / whitespace `body` | ❌ config error |
| `request.body` / flat `invalidResponse` / … | ❌ config error (use `payload` / `error.*`) |

`encoding` is **not** ignored when `proxy` is present: the server refuses to start so dead config is not silent.

#### Runtime failures (`encoding: "file"` / `"base64"`)

These pass config validation but fail when the response is selected:

| Situation | HTTP | Behavior |
|-----------|------|----------|
| File path missing under mocks root | `500` | JSON `{ "message": "…" }` (e.g. ENOENT) — `Content-Type: application/json` |
| Path escapes mocks root (`../…`) | `500` | `Response body file path escapes mocks directory: …` |

#### Request side (related)

| Allowed | Not allowed / notes |
|---------|---------------------|
| `payload` + optional `as`, `query`, `headers`, `error` | Legacy `body`, `invalidResponse`, `errorFormat`, `errorDetail`, `errorDetailsKey` |
| `as: "json" \| "form" \| "multipart" \| "raw" \| "text"` | If `as` is set and Content-Type does not match → validation error → `error.response` (or generic `400`) |
| Whole-body rule object (`{ "type": "string", … }`) | Requires `as: "text"` or `as: "raw"` (or top-level `type: "file"`) |
| Field rules per type (see [Options by `type`](#payload-field-rules-type--format)) | File shorthand like `"avatar": ["png"]`; use `{ "type": "file", "format": … }` |
| Form / multipart coerce `number` / `boolean` from strings | — |
| `match.headers` / `match.multipart` after validation passes | Empty / non-object `match.headers` / `match.multipart` → startup error |

### Pipeline (body compatibility)

```text
incoming request
  → tolerant intake (rawBody when needed)
  → request? 
       → as? check Content-Type
       → parse (json | form | multipart | raw | text)
       → validate payload / query / headers
            FAIL → error.response (or generic 400)
            PASS → match → delay → proxy | action | encoding/body
```

Exactly one of `proxy` / `action` / static `body`(+optional `encoding`) runs for the selected response.
`request` = “is this valid?” · `match` = “which scenario?” (`match.headers` / `match.multipart` included). They do not replace each other.

### Migration from 3.x

| Removed (3.x) | Use in 4.0 |
|---------------|------------|
| `request.body` | `request.payload` |
| `invalidResponse` | `error.response` |
| `errorFormat` | `error.format` |
| `errorDetail` | `error.detail` |
| `errorDetailsKey` | `error.key` |

There is **no** dual-read / alias period: legacy keys are rejected at startup with a clear error.

Out of scope: record & replay, OpenAPI import, response multipart *builder*, GraphQL/XML.

---

### Example 10: Proxy to a real backend

Matching rules stay the same. After a response is selected, if it has `proxy`, the mock acts as an intermediary: it forwards the original request to the real backend and returns that response (status, headers, and body) to the frontend.

**Path rules:**

- If you do **not** set `path`, the proxied URL uses the **same path as the mock endpoint** (plus the original query string).
- If you set `path`, only the path is rewritten; the original query string is still preserved.

```json
{
  "users": {
    "GET": {
      "nameResponse": "mock",
      "proxy": "https://api.staging.com",
      "responses": [
        {
          "name": "live",
          "proxy": true,
          "match": {
            "query": {
              "role": "admin"
            }
          }
        },
        {
          "name": "rewrite",
          "proxy": {
            "target": "https://billing.internal.com",
            "path": "/v2/users"
          },
          "match": {
            "query": {
              "source": "billing"
            }
          }
        },
        {
          "name": "mock",
          "statusCode": 200,
          "body": {
            "users": []
          }
        }
      ]
    }
  }
}
```

Start with an optional global proxy:

```bash
mock-server start --proxy https://api.staging.com
```

Behavior:

- `GET /users?role=admin` → selected `live` → no `path` configured → proxied to `https://api.staging.com/users?role=admin` (same mock path `/users` + query)
- `GET /users?source=billing` → selected `rewrite` → `path` is `/v2/users` → proxied to `https://billing.internal.com/v2/users?source=billing` (path rewritten, query kept)
- `GET /users` → fallback `mock` → local JSON response (no proxy)
- Any route without a mock → if `--proxy` is set, forwarded to the global target with the original path + query

More path examples:

| Mock endpoint | Proxy config | Incoming request | Upstream URL |
|---------------|--------------|------------------|--------------|
| `users` | `"https://api.staging.com"` | `GET /users?role=admin` | `https://api.staging.com/users?role=admin` |
| `api/orders` | `{ "target": "https://api.staging.com" }` | `GET /api/orders?page=2` | `https://api.staging.com/api/orders?page=2` |
| `users` | `{ "target": "https://billing.internal.com", "path": "/v2/users" }` | `GET /users?source=billing` | `https://billing.internal.com/v2/users?source=billing` |
| `users/:id` | `{ "target": "https://api.staging.com", "path": "/v1/customers/1" }` | `GET /users/1` | `https://api.staging.com/v1/customers/1` |

Proxy values:

| Value | Meaning |
|-------|---------|
| `"https://api.com"` | Proxy to that host using the **mock endpoint path** + original query |
| `{ "target": "https://api.com" }` | Same as above (no rewrite) |
| `{ "target": "https://api.com", "path": "/v2/users" }` | Rewrite path to `/v2/users`; keep the original query |
| `true` | Use method-level `proxy`, or `--proxy` if method has none |

### Example 11: Folder organization (`mock.config.json`)

Optional mode (≥ `1.18.0`) for backends split into microservices (or large APIs). Group mocks into folders and declare shared settings in a single `mock.config.json` at the root of the mocks directory.

**Repo sample to copy:** [`mocks/mock-config/`](../mocks/mock-config) (food delivery: auth, orders, payments) — listed under [Examples in this repository](examples.md#examples-in-this-repository-).

Put `mock.config.json` at the root of the mocks directory you pass to `--path` (for example `api-mocks/mock.config.json` with folders like `api-mocks/auth/`).

Useful when you want to:

- Mirror each microservice (`users`, `orders`, `payments`) as a folder
- Apply a shared route prefix per service (`/api/users`, `/api/orders`)
- Set default `delay`, `proxy`, or `headers` per group without repeating them in every mock
- Enable/disable a folder, filter files with `include`/`exclude`, and optionally fail on duplicate routes
- Keep a large mock set readable and easy to navigate

Without `mock.config.json`, mocks work as before: flat JSON files in the mocks directory.

#### Basic layout (prefix, delay, headers, include/exclude, enabled)

```text
mocks/
  mock.config.json
  users/
    auth.json
    profile.json
    auth-draft.json
  users-v2/
    login.json
  health.json
```

`mocks/mock.config.json`:

```json
{
  "delay": 100,
  "headers": {
    "X-Mock-Env": "local"
  },
  "folders": {
    "users": {
      "prefix": "/api/users",
      "delay": 200,
      "headers": {
        "X-Service": "users"
      },
      "include": ["auth.json", "profile.json"],
      "exclude": ["*-draft.json"]
    },
    "users-v2": {
      "prefix": "/api/users",
      "enabled": false
    }
  }
}
```

`mocks/users/auth.json` (routes are relative to the folder prefix):

```json
{
  "login": {
    "POST": {
      "nameResponse": "ok",
      "responses": [
        {
          "name": "ok",
          "statusCode": 200,
          "headers": {
            "X-Request-Id": "req-1"
          },
          "body": {
            "token": "abc"
          }
        }
      ]
    }
  }
}
```

Behavior:

- `POST /api/users/login` → from `users/auth.json` (prefix + delay `200` + headers `X-Mock-Env`, `X-Service`, `X-Request-Id`)
- `users/auth-draft.json` skipped by `exclude`; `users-v2/` skipped by `enabled: false`
- Root `health.json` → `/health` with root delay `100`

#### Example: `strictDuplicates`

Fail startup if two files resolve to the same method + final route:

```json
{
  "strictDuplicates": true,
  "folders": {
    "users": { "prefix": "/api/users" },
    "auth": { "prefix": "/api/users" }
  }
}
```

If both folders define `POST login`, the server does not start and reports the duplicate `/api/users/login`.

#### Example: `port`

Default listen port from config (CLI `-p` / `--port` wins when provided):

```json
{
  "port": 3500,
  "folders": {
    "users": {
      "prefix": "/api/users"
    }
  }
}
```

```bash
mock-server start              # uses 3500 from config
mock-server start -p 4000      # uses 4000 (CLI overrides config)
```

Priority: **CLI `-p` > `mock.config.json` `port` > `3000`**.

#### Example: `delay` overrides

Latency resolves from most specific to least specific:

**response → method → folder → root → `0`**

```json
{
  "delay": 100,
  "folders": {
    "users": {
      "prefix": "/api/users",
      "delay": 200
    }
  }
}
```

`mocks/users/profile.json`:

```json
{
  "me": {
    "GET": {
      "nameResponse": "ok",
      "delay": 50,
      "responses": [
        {
          "name": "slow",
          "statusCode": 200,
          "delay": 500,
          "match": { "query": { "slow": "1" } },
          "body": { "ok": true, "slow": true }
        },
        {
          "name": "ok",
          "statusCode": 200,
          "body": { "ok": true }
        }
      ]
    }
  }
}
```

| Request | Delay used | Why |
|---------|------------|-----|
| `GET /api/users/me?slow=1` | **500** | response `delay` |
| `GET /api/users/me` | **50** | method `delay` (no response delay) |
| Root file with no method/response delay | **100** | root config `delay` |
| No delay anywhere | **0** | default |

If the method omitted `delay: 50`, `GET /api/users/me` would use folder **200**.

#### Example: `headers` merge / override

Headers are **merged**. Same key: more specific wins.

**`{ ...root, ...folder, ...response }`**

```json
{
  "headers": {
    "X-Mock-Env": "local",
    "X-Owner": "root"
  },
  "folders": {
    "users": {
      "prefix": "/api/users",
      "headers": {
        "X-Service": "users",
        "X-Owner": "folder"
      }
    }
  }
}
```

`mocks/users/profile.json`:

```json
{
  "me": {
    "GET": {
      "nameResponse": "ok",
      "responses": [
        {
          "name": "ok",
          "statusCode": 200,
          "headers": {
            "X-Request-Id": "req-1",
            "X-Owner": "response"
          },
          "body": { "ok": true }
        }
      ]
    }
  }
}
```

Final headers on `GET /api/users/me`:

| Header | Value | From |
|--------|-------|------|
| `X-Mock-Env` | `local` | root |
| `X-Service` | `users` | folder |
| `X-Request-Id` | `req-1` | response |
| `X-Owner` | **`response`** | response overrides folder (which had overridden root) |

A root-only mock file (no folder) gets only root headers (+ its own response headers).

#### Example: `proxy` overrides (`proxy: true`)

When a response sets `"proxy": true`, the target is resolved as:

**method `proxy` → folder `proxy` → root config `proxy` → CLI `--proxy`**

```json
{
  "proxy": "http://localhost:4000",
  "folders": {
    "users": {
      "prefix": "/api/users",
      "proxy": "http://localhost:3001"
    }
  }
}
```

With a method-level target (`mocks/users/profile.json`):

```json
{
  "me": {
    "GET": {
      "nameResponse": "mock",
      "proxy": "http://localhost:3002",
      "responses": [
        {
          "name": "via-method",
          "proxy": true,
          "match": { "query": { "via": "method" } }
        },
        {
          "name": "mock",
          "statusCode": 200,
          "body": { "source": "local" }
        }
      ]
    }
  }
}
```

`GET /api/users/me?via=method` → upstream **`http://localhost:3002`** (method wins).

Without method `proxy`, the same `"proxy": true` uses folder **`3001`**.  
Without method and folder `proxy`, it uses root config **`4000`**.  
Without any of those:

```bash
mock-server start --proxy https://api.staging.com
```

…uses the CLI target. If nothing defines a target → **502** (orphan `proxy: true`).

| Priority | Source | Example target |
|----------|--------|----------------|
| 1 | Method `proxy` | `http://localhost:3002` |
| 2 | Folder `proxy` | `http://localhost:3001` |
| 3 | Root config `proxy` | `http://localhost:4000` |
| 4 | CLI `--proxy` | `https://api.staging.com` |

Notes:

- A response can set `"proxy": "http://..."` or `{ "target", "path?" }` directly — that **skips** the cascade (explicit target on the response).
- Folder **`proxyUnmatched`** is separate: it only applies to requests under that prefix with **no mock route**. It does not replace CLI `--proxy` for paths outside the prefix.
- Global CLI `--proxy` still catch-alls remaining unmatched routes (see [Global `--proxy`](advanced-examples.md#example-global---proxy-for-unmocked-routes)).

#### Example: `stripPrefix` (gateway → microservice path)

Front calls `/api/users/:id`, but the real users service expects `/:id`:

```json
{
  "folders": {
    "users": {
      "prefix": "/api/users",
      "proxy": "http://localhost:3001",
      "stripPrefix": true
    }
  }
}
```

`mocks/users/profile.json`:

```json
{
  ":id": {
    "GET": {
      "nameResponse": "live",
      "responses": [
        {
          "name": "live",
          "proxy": true
        }
      ]
    }
  }
}
```

Behavior:

- Incoming `GET /api/users/42`
- Upstream request goes to `http://localhost:3001/42` (prefix stripped)
- If `stripPrefix` were `false`, upstream would receive `/api/users/42`

#### Example: `proxyUnmatched` (partial mock + live API)

Mock only some routes; forward the rest of that service to a real backend:

```json
{
  "folders": {
    "users": {
      "prefix": "/api/users",
      "stripPrefix": true,
      "proxyUnmatched": "http://localhost:3001"
    }
  }
}
```

`mocks/users/auth.json` only mocks login:

```json
{
  "login": {
    "POST": {
      "nameResponse": "ok",
      "responses": [
        {
          "name": "ok",
          "statusCode": 200,
          "body": {
            "token": "mock"
          }
        }
      ]
    }
  }
}
```

Behavior:

- `POST /api/users/login` → local mock
- `GET /api/users/settings` (no mock) → proxied to `http://localhost:3001/settings` (`stripPrefix` on)
- Routes outside `/api/users` are not handled by this catch-all (use CLI `--proxy` for a global fallback)

#### Example: `storeNamespace` (avoid store id collisions)

Two folders both want a store named `session`:

```json
{
  "folders": {
    "users": {
      "prefix": "/api/users",
      "storeNamespace": "users"
    },
    "orders": {
      "prefix": "/api/orders",
      "storeNamespace": "orders"
    }
  }
}
```

In `mocks/users/session.json` you still write a local id:

```json
{
  "session": {
    "store": {
      "id": "session",
      "key": "id",
      "seed": []
    },
    "GET": {
      "nameResponse": "ok",
      "responses": [
        {
          "name": "ok",
          "statusCode": 200,
          "action": "list",
          "body": []
        }
      ]
    }
  }
}
```

At load time the store becomes `users:session` (and `orders:session` in the other folder). References in the same folder keep using `"id": "session"`. Cross-folder relations use the full id (`"store": "users:session"`).

With `storeNamespace`, `--reset-store` must use the **runtime** id:

```bash
mock-server start --reset-store users:session
# or clear everything:
mock-server start --reset-store
```

**Options reference:**

| Option | Level | Default | Purpose |
|--------|-------|---------|---------|
| `folders` | root | — | Declares which subfolders under `mocks/` to load and their settings |
| `prefix` | folder | — | Route prefix for every endpoint in that folder (`/api/users` + `login` → `/api/users/login`). Cannot contain route parameters (`:id`) |
| `delay` | root / folder | — | Default latency (ms). Folder overrides root; method/response can override both |
| `proxy` | root / folder | — | Default proxy target (URL or `{ target, path? }`). Folder overrides root; method can override |
| `headers` | root / folder | — | Default response headers. Merged as `{ ...root, ...folder, ...response }` (response wins on conflicts) |
| `enabled` | folder | `true` | Set `false` to skip the folder without deleting it (skipped folders are ignored by `strictDuplicates`) |
| `include` | folder | all `.json` | Basename patterns (`*`, `?`); if set, only matching files in the folder are loaded |
| `exclude` | folder | none | Basename patterns to skip after `include` (e.g. `*-draft.json`) |
| `strictDuplicates` | root | `false` | When `true`, startup fails if the same HTTP method + final route is registered twice |
| `stripPrefix` | folder | `false` | When proxying, remove the folder `prefix` from the upstream path (requires `prefix`) |
| `proxyUnmatched` | folder | — | Catch-all proxy URL for requests under this folder `prefix` that have no mock (requires `prefix`) |
| `storeNamespace` | folder | — | Prefixes store ids in that folder (`session` → `users:session`). Ids that already contain `:` are left as-is |
| `port` | root | `3000` | Default listen port. CLI `-p` / `--port` overrides this value |

Rules:

- Opt-in: only activates when `mock.config.json` exists at the root of the mocks directory (`--path`)
- Only folders declared in `folders` are loaded; undeclared folders are ignored
- JSON files in the root of that directory still load and receive root `delay` / `proxy` / `headers` defaults
- One folder level only (e.g. `auth/*.json` under the mocks directory)
- **Priority cheat-sheet** (see examples above for full walkthroughs):
  - `port`: CLI `-p` → config `port` → `3000`
  - `delay`: response → method → folder → root → `0`
  - `proxy` when response is `true`: method → folder → root config → CLI `--proxy`
  - `headers`: merge `{ ...root, ...folder, ...response }` (same key → more specific wins)
- Create folders manually; `mock-server add` / `init` still write to the root of `mocks/`

### Example 12: Mutable store

Opt-in collections that mutate while the server runs. Declare `store` on the endpoint and mark responses with `action`.

See the full guide (capability map, schema, persist, conflicts, recipes, examples A–I):  
**[Mutable store](store.md#mutable-store-)** · **[Capability map](store.md#capability-map-build-complex-mocks)**

---

