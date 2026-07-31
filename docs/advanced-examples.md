# Advanced examples

> Part of [Documentation](README.md). Related: [Examples](examples.md) · [README — Concepts](../README.md#concepts) · [Real-world](real-world.md) · [Store recipes](store-recipes.md).

Progressive, one-concept walkthroughs. Each example matches a fixture under [`mocks/`](../mocks/) so you can copy the file instead of typing JSON by hand.

For the full field tables, see [Mock file](../README.md#mock-file-reference) and [Body compatibility](../README.md#body-compatibility). Startup checks: [Validation](../README.md#validation-reference). For folder layouts and mutable CRUD, see [Mock config](../README.md#mock-config-reference) and [Store](../README.md#store-reference) (not duplicated here).

#### Example map

| # | Topic | Purpose | Fixture |
|---|-------|---------|---------|
| 1 | [Basic mock with multiple responses](#example-1-basic-mock-with-multiple-responses) | Same endpoint; `nameResponse` picks the active named response | [`01-basic-multiple-responses.json`](../mocks/01-basic-multiple-responses.json) |
| 2 | [Custom headers](#example-2-mock-with-custom-headers) | Attach headers (content type, CORS, auth challenges) | [`02-custom-headers.json`](../mocks/02-custom-headers.json) |
| 3 | [Null body / 204](#example-3-response-with-null-body-204-no-content) | `body: null` for deletes / no-content statuses | [`03-null-body.json`](../mocks/03-null-body.json) |
| 4 | [Params + multiple methods](#example-4-endpoint-with-parameters-and-multiple-methods) | Parameterized route + several HTTP methods | [`04-params-and-methods.json`](../mocks/04-params-and-methods.json) |
| 5 | [Match by route params](#example-5-match-by-route-params) | Branch with `match.params` (`:id`) | [`05-match-params.json`](../mocks/05-match-params.json) |
| 6 | [Match by query + delay](#example-6-match-by-query-params-and-delay) | Partial `match.query` and optional `delay` | [`06-match-query-delay.json`](../mocks/06-match-query-delay.json) |
| 7 | [Match by request body](#example-7-match-by-request-body) | Partial deep `match.body` | [`07-match-body.json`](../mocks/07-match-body.json) |
| 8 | [Match by call count](#example-8-match-by-call-count) | Select response from 1-based hit counter | [`40-match-call.json`](../mocks/40-match-call.json) |
| 9 | [Request validation](#example-9-request-validation) | `request` checks payload/query/headers before `match` | [`22-request.json`](../mocks/22-request.json) |
| 10 | [Proxy to a real backend](#example-10-proxy-to-a-real-backend) | Forward selected responses (or unmatched routes) upstream | [`09-proxy.json`](../mocks/09-proxy.json) |

---

#### Example 1: Basic mock with multiple responses

**Purpose:** Same endpoint, several named responses; `nameResponse` picks the active one.

**Fixture:** [`01-basic-multiple-responses.json`](../mocks/01-basic-multiple-responses.json)

```json
{
  "data/animals": {
    "GET": {
      "nameResponse": "AnimalsError",
      "responses": [
        {
          "name": "AnimalsList",
          "statusCode": "200",
          "body": {
            "animals": [
              { "id": 1, "name": "Lion" },
              { "id": 2, "name": "Tiger" }
            ]
          }
        },
        {
          "name": "AnimalsError",
          "statusCode": "404",
          "body": {
            "message": "No animals found"
          }
        }
      ]
    },
    "POST": {
      "nameResponse": "AnimalsError",
      "responses": [
        {
          "name": "AnimalsSave",
          "statusCode": "201",
          "body": {
            "id": 3,
            "name": "Eagle",
            "created": true
          }
        },
        {
          "name": "AnimalsError",
          "statusCode": "404",
          "body": {
            "message": "Could not save animal"
          }
        }
      ]
    }
  }
}
```

**Try:** `GET /data/animals` → `404` while `nameResponse` is `AnimalsError`. Change it to `AnimalsList` → `200` with the animals array.

**Next:** [Example 2](#example-2-mock-with-custom-headers) — response headers.

---

#### Example 2: Mock with custom headers

**Purpose:** Attach headers on a response (content type, CORS, auth challenges).

**Fixture:** [`02-custom-headers.json`](../mocks/02-custom-headers.json)

```json
{
  "api/users": {
    "GET": {
      "nameResponse": "UsersList",
      "responses": [
        {
          "name": "UsersList",
          "statusCode": 200,
          "headers": {
            "Content-Type": "application/json",
            "X-Custom-Header": "custom-value",
            "X-Total-Count": "2",
            "Cache-Control": "no-cache"
          },
          "body": {
            "users": [
              { "id": 1, "name": "John" },
              { "id": 2, "name": "Jane" }
            ]
          }
        },
        {
          "name": "unauthorized",
          "statusCode": 401,
          "headers": {
            "WWW-Authenticate": "Bearer realm=\"API\""
          },
          "body": {
            "message": "Authentication required"
          }
        }
      ]
    }
  }
}
```

**Try:** `GET /api/users` and inspect `X-Custom-Header` / `X-Total-Count`. Switch `nameResponse` to `unauthorized` for `401` + `WWW-Authenticate`.

**Next:** [Example 3](#example-3-response-with-null-body-204-no-content) — null bodies.

---

#### Example 3: Response with null body (204 No Content)

**Purpose:** Return `body: null` for deletes / no-content statuses.

**Fixture:** [`03-null-body.json`](../mocks/03-null-body.json)

```json
{
  "api/users/:id": {
    "DELETE": {
      "nameResponse": "deleted",
      "responses": [
        {
          "name": "deleted",
          "statusCode": "204",
          "body": null
        },
        {
          "name": "not-found",
          "statusCode": "404",
          "body": {
            "message": "User not found"
          }
        }
      ]
    }
  }
}
```

**Try:** `DELETE /api/users/1` → `204` empty body. Point `nameResponse` at `not-found` for a JSON `404`.

**Next:** [Example 4](#example-4-endpoint-with-parameters-and-multiple-methods) — params + methods.

---

#### Example 4: Endpoint with parameters and multiple methods

**Purpose:** One parameterized route with several HTTP methods, plus a second endpoint for response switching.

**Fixture:** [`04-params-and-methods.json`](../mocks/04-params-and-methods.json)

```json
{
  "data/animals/:id": {
    "GET": {
      "nameResponse": "AnimalsList",
      "responses": [
        {
          "name": "AnimalsList",
          "statusCode": "200",
          "body": {
            "id": 1,
            "name": "Lion",
            "habitat": "Savanna"
          }
        },
        {
          "name": "AnimalsError",
          "statusCode": "404",
          "body": {
            "message": "Animal not found"
          }
        }
      ]
    },
    "POST": {
      "nameResponse": "AnimalsSave",
      "responses": [
        {
          "name": "AnimalsSave",
          "statusCode": "201",
          "body": {
            "id": 1,
            "saved": true
          }
        },
        {
          "name": "AnimalsError",
          "statusCode": "404",
          "body": {
            "message": "Could not save"
          }
        }
      ]
    },
    "PUT": {
      "nameResponse": "updated",
      "responses": [
        {
          "name": "updated",
          "statusCode": "200",
          "body": {
            "id": 1,
            "name": "Lion Updated"
          }
        }
      ]
    },
    "PATCH": {
      "nameResponse": "patched",
      "responses": [
        {
          "name": "patched",
          "statusCode": "200",
          "body": {
            "id": 1,
            "habitat": "Zoo"
          }
        }
      ]
    },
    "DELETE": {
      "nameResponse": "deleted",
      "responses": [
        {
          "name": "deleted",
          "statusCode": "204",
          "body": null
        }
      ]
    }
  }
}
```

**Try:** `GET|POST|PUT|PATCH|DELETE /data/animals/1`. The fixture also includes `data/brands` and nested review params — open the file for those.

**Next:** [Example 5](#example-5-match-by-route-params) — automatic branching with `match`.

---

#### Example 5: Match by route params

**Purpose:** Pick a response from Express route params (`:id`). Values are compared as strings (`"1"` matches `1`).

**Fixture:** [`05-match-params.json`](../mocks/05-match-params.json)

```json
{
  "api/profiles/:id": {
    "GET": {
      "nameResponse": "not-found",
      "responses": [
        {
          "name": "found",
          "statusCode": 200,
          "match": {
            "params": {
              "id": "1"
            }
          },
          "body": {
            "id": 1,
            "name": "Juan Pérez"
          }
        },
        {
          "name": "admin",
          "statusCode": 200,
          "match": {
            "params": {
              "id": "99"
            }
          },
          "body": {
            "id": 99,
            "name": "Admin User",
            "role": "admin"
          }
        },
        {
          "name": "not-found",
          "statusCode": 404,
          "body": {
            "message": "User not found"
          }
        }
      ]
    }
  }
}
```

**Try:**

- `GET /api/profiles/1` → `found`
- `GET /api/profiles/99` → `admin`
- `GET /api/profiles/42` → `not-found` (fallback via `nameResponse`)

Responses with `match` are evaluated in order; first match wins. If none match, the server uses `nameResponse`.

**Next:** [Example 6](#example-6-match-by-query-params-and-delay) — query + delay.

---

#### Example 6: Match by query params and delay

**Purpose:** Partial `match.query` (all listed keys must match) and optional `delay` at method or response level.

**Fixture:** [`06-match-query-delay.json`](../mocks/06-match-query-delay.json)

```json
{
  "api/search": {
    "GET": {
      "nameResponse": "default",
      "delay": 100,
      "responses": [
        {
          "name": "active",
          "statusCode": 200,
          "delay": 300,
          "match": {
            "query": {
              "status": "active"
            }
          },
          "body": {
            "results": [{ "id": 1, "status": "active" }]
          }
        },
        {
          "name": "default",
          "statusCode": 200,
          "body": {
            "results": []
          }
        }
      ]
    }
  }
}
```

**Try:**

- `GET /api/search?status=active` → `active` after ~300ms
- `GET /api/search` → `default` after ~100ms (method-level delay)

The full fixture also covers paginated and `fast=true` (delay `0`) branches.

**Next:** [Example 7](#example-7-match-by-request-body) — body matching.

---

#### Example 7: Match by request body

**Purpose:** Partial deep `match.body` against JSON (or urlencoded form fields that coerce for number/boolean compares).

**Fixture:** [`07-match-body.json`](../mocks/07-match-body.json)

```json
{
  "api/login": {
    "POST": {
      "nameResponse": "invalid",
      "responses": [
        {
          "name": "success",
          "statusCode": 200,
          "match": {
            "body": {
              "email": "admin@example.com",
              "password": "secret"
            }
          },
          "body": {
            "token": "mock-jwt-token"
          }
        },
        {
          "name": "invalid",
          "statusCode": 401,
          "body": {
            "message": "Invalid credentials"
          }
        }
      ]
    }
  }
}
```

**Try:**

- `POST /api/login` with `{ "email": "admin@example.com", "password": "secret" }` → `success`
- Any other body → `invalid`

You can combine conditions on one response — all listed keys must match:

```json
{
  "match": {
    "params": { "id": "1" },
    "query": { "source": "web" },
    "body": { "role": "admin" }
  }
}
```

See [`08-match-combined.json`](../mocks/08-match-combined.json) for a full combined fixture, and [Example 8](#example-8-match-by-call-count) for `match.call`.

**Next:** [Example 8](#example-8-match-by-call-count) — call counters.

---

#### Example 8: Match by call count

**Purpose:** Select a response from how many times a counter has been hit (**1-based**). Counters live in memory and clear on server start / hot-reload.

**Fixture:** [`40-match-call.json`](../mocks/40-match-call.json)

Default counter key is `METHOD:route`. With `call.by`, the key becomes `METHOD:route:<field value>` (e.g. per email). Requests that fail `request` validation never reach `match`, so they do **not** advance the counter.

Field shapes for `match.call` (`index`, `by`, `loop`, `reset`) are documented in [Mock file](../README.md#mock-file-reference).

##### Shorthand — `"call": N`

`"call": 1` means `{ "index": 1 }`.

```json
{
  "api/flaky": {
    "GET": {
      "nameResponse": "ok",
      "responses": [
        {
          "name": "fail",
          "statusCode": 503,
          "match": { "call": 1 },
          "body": { "ok": false }
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

| Call # | Result |
|--------|--------|
| 1 | `fail` (`503`) |
| 2+ | `ok` (`200`, via `nameResponse`) |

##### Login lockout + reset

```json
{
  "api/auth/login": {
    "POST": {
      "nameResponse": "locked",
      "responses": [
        {
          "name": "wrong-1",
          "statusCode": 401,
          "match": {
            "call": 1,
            "body": { "password": "wrong" }
          },
          "body": {
            "error": "INVALID_CREDENTIALS",
            "attemptsLeft": 2
          }
        },
        {
          "name": "wrong-2",
          "statusCode": 401,
          "match": {
            "call": 2,
            "body": { "password": "wrong" }
          },
          "body": {
            "error": "INVALID_CREDENTIALS",
            "attemptsLeft": 1
          }
        },
        {
          "name": "success",
          "statusCode": 200,
          "match": {
            "call": { "reset": true },
            "body": { "password": "correct" }
          },
          "body": {
            "token": "mock-jwt-token"
          }
        },
        {
          "name": "locked",
          "statusCode": 423,
          "body": {
            "error": "ACCOUNT_LOCKED"
          }
        }
      ]
    }
  }
}
```

**Try:** wrong → wrong → locked; then `password: "correct"` → `success` and the counter resets so the next wrong is `wrong-1` again.

##### Per-user counters — `call.by`

```json
"match": {
  "call": {
    "index": 1,
    "by": { "body": "email" }
  },
  "body": { "password": "wrong" }
}
```

Alice and Bob keep separate attempt counts. Nested paths work: `"by": { "body": "user.email" }`. The fixture also shows `by.query` and `by.params`.

##### Loop — `call.loop`

When any response sets `"loop": true`, after the highest `index` the effective number wraps to `1` instead of sticking on `nameResponse`. See `api/flaky-loop` in the fixture.

**Next:** [Example 9](#example-9-request-validation) — validate before match.

---

#### Example 9: Request validation

**Purpose:** `request` checks `payload` / `query` / `headers` **before** `match` / `nameResponse`.

```
incoming request
  → request validation (payload / query / headers)
       FAIL → error.response (or generic 400) + stop
       PASS → match → nameResponse → delay → proxy / body / encoding
```

- `request` answers “is this valid?”
- `match` answers “which scenario?”

They do not conflict. Full rule tables (`type`, `format`, `as`, `error.*`, multipart/file) live in [Body compatibility](../README.md#body-compatibility).

**Fixture:** [`22-request.json`](../mocks/22-request.json)

```json
{
  "api/register": {
    "POST": {
      "nameResponse": "created",
      "request": {
        "payload": {
          "email": { "type": "string", "format": "email", "message": "Email inválido" },
          "password": { "type": "string", "minLength": 8, "maxLength": 64 },
          "age?": { "type": "number", "min": 18, "max": 120 },
          "active": "boolean",
          "role": { "type": "string", "enum": ["admin", "user"] },
          "website?": { "type": "string", "format": "url" },
          "address": {
            "type": "object",
            "properties": {
              "city": { "type": "string", "minLength": 2 },
              "zip?": { "type": "string", "pattern": "^\\d{5}$" }
            }
          }
        },
        "error": {
          "response": "validation-error",
          "format": "array",
          "detail": {
            "field": "{{path}}",
            "msg": "{{message}}"
          }
        }
      },
      "responses": [
        {
          "name": "created",
          "statusCode": 201,
          "body": { "id": 1, "ok": true }
        },
        {
          "name": "duplicate-email",
          "statusCode": 409,
          "match": { "body": { "email": "taken@example.com" } },
          "body": { "message": "Email already exists" }
        },
        {
          "name": "validation-error",
          "statusCode": 422,
          "body": { "message": "Invalid request", "errors": [] }
        }
      ]
    }
  }
}
```

**Try:**

- Invalid payload → `422 validation-error` (errors injected into `error.key`, default `"errors"`)
- Valid payload + `email: "taken@example.com"` → `409 duplicate-email` (`match` after `request` passes)
- Valid other email → `201 created`

The same fixture shows query-only validation (`api/search`), array items (`api/orders`), dot-path fields (`api/profiles`), and custom `error.format` / `error.key` (`api/filters`). For multipart / raw / `encoding`, copy [`42-request-multipart.json`](../mocks/42-request-multipart.json) or [`41-response-encoding.json`](../mocks/41-response-encoding.json).

**Next:** [Example 10](#example-10-proxy-to-a-real-backend) — forward to a live API.

---

#### Example 10: Proxy to a real backend

**Purpose:** After a response is selected, `proxy` forwards the original request upstream and returns that status / headers / body.

**Path rules:**

- Without `path`, the upstream URL uses the **mock endpoint path** + original query string.
- With `path`, only the path is rewritten; the query string is kept.

**Fixture:** [`09-proxy.json`](../mocks/09-proxy.json)

```json
{
  "users": {
    "GET": {
      "nameResponse": "mock",
      "proxy": "https://jsonplaceholder.typicode.com",
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
            "target": "https://jsonplaceholder.typicode.com",
            "path": "/users/1"
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
            "users": [
              { "id": 1, "name": "Mock User" }
            ]
          }
        }
      ]
    }
  }
}
```

Optional global proxy for `"proxy": true` and unmatched routes:

```bash
mock-server start --proxy https://jsonplaceholder.typicode.com
```

**Try:**

| Request | Result |
|---------|--------|
| `GET /users?role=admin` | Proxied to `…/users?role=admin` (`proxy: true` + method target) |
| `GET /users?source=billing` | Proxied to `…/users/1?source=billing` (path rewrite) |
| `GET /users` | Local `mock` JSON (no proxy) |

`proxy` values (from types): string URL, `{ "target", "path?" }`, or `true` (use method / folder / root / `--proxy` target). Do not combine `proxy` with `encoding` or `action` on the same response — see [Mock file](../README.md#mock-file-reference) / [Body compatibility](../README.md#body-compatibility).

Runtime orphan (`"proxy": true` with no target) → [`16-runtime-proxy-orphan.json`](../mocks/16-runtime-proxy-orphan.json). Upstream failure demos → [`17-proxy-request-failed.json`](../mocks/17-proxy-request-failed.json).

---

### Where to go next

| Topic | Doc |
|-------|-----|
| Folder organization (`mock.config.json`, prefixes, `storeNamespace`, `proxyUnmatched`) | [Mock config](../README.md#mock-config-reference) — sample tree: [`mocks/mock-config/`](../mocks/mock-config) |
| Mutable collections (`store` + `action`, list, persist, relations) | [Store](../README.md#store-reference) |
| Copy-worthy fixture index | [Examples](examples.md) |
| Product-style scenarios | [Real-world projects](real-world.md) |

