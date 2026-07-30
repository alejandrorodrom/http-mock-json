# Advanced examples

### Example 1: Basic mock with multiple responses

This example shows how to create multiple responses for the same endpoint, allowing you to simulate different scenarios.

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
            "example": "data"
          }
        },
        {
          "name": "AnimalsError",
          "statusCode": "404",
          "body": {
            "example-error": "error"
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
            "example": "data"
          }
        },
        {
          "name": "AnimalsError",
          "statusCode": "404",
          "body": {
            "example-error": "error"
          }
        }
      ]
    }
  }
}
   ```

### Example 2: Mock with custom headers

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
            "X-Custom-Header": "custom-value"
          },
          "body": {
            "users": [
              {
                "id": 1,
                "name": "John"
              },
              {
                "id": 2,
                "name": "Jane"
              }
            ]
          }
        }
      ]
    }
  }
}
   ```

### Example 3: Response with null body (204 No Content)

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

### Example 4: Endpoint with parameters and multiple methods

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
            "example": "data"
          }
        },
        {
          "name": "AnimalsError",
          "statusCode": "404",
          "body": {
            "example-error": "error"
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
            "example": "data"
          }
        },
        {
          "name": "AnimalsError",
          "statusCode": "404",
          "body": {
            "example-error": "error"
          }
        }
      ]
    }
  },
  "data/brands": {
    "GET": {
      "nameResponse": "BrandsList3",
      "responses": [
        {
          "name": "BrandsList",
          "statusCode": "200",
          "body": {
            "example": "data1"
          }
        },
        {
          "name": "BrandsList2",
          "statusCode": "200",
          "body": {
            "example": "data2"
          }
        },
        {
          "name": "BrandsList3",
          "statusCode": "200",
          "body": {
            "example": "data3"
          }
        }
      ]
    }
  }
}
   ```

### Example 5: Match by route params

`match.params` matches against Express route parameters (e.g. `:id` in `/api/users/:id`).
Values are compared as strings (`"1"` matches `1`).

```json
{
  "api/users/:id": {
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

- `GET /api/users/1` → `found`
- `GET /api/users/99` → `not-found` (fallback via `nameResponse`)

### Example 6: Match by query params and delay

When a request arrives, responses with `match` are evaluated in order. The first match wins.
If nothing matches, the server falls back to `nameResponse`.

- Method-level `delay` applies to every response unless a response defines its own `delay`.
- `match.query` is a partial match: all listed keys must be present with the same value.

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

- `GET /api/search?status=active` → `active` (after 300ms)
- `GET /api/search` → `default` (after 100ms)

### Example 7: Match by request body

`match.body` does a partial deep match against the parsed request body (JSON **or** `application/x-www-form-urlencoded` — string form fields coerce for number/boolean compares).

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

- `POST /api/login` with `{ "email": "admin@example.com", "password": "secret" }` → `success`
- Any other body → `invalid` (fallback via `nameResponse`)

You can combine `params`, `query`, and `body` in the same response:

```json
{
  "match": {
    "params": { "id": "1" },
    "query": { "source": "web" },
    "body": { "role": "admin" }
  }
}
```

All listed conditions must match. See [Example 8](#example-8-match-by-call-count) to also match by call count.

### Example 8: Match by call count

`match.call` selects a response based on how many times a counter has been hit (**1-based**). Counters live in memory and clear when the server starts or hot-reloads.

**Counter key**

| Config | Key |
|--------|-----|
| Default | `METHOD:route` (shared by all clients) |
| With `call.by` | `METHOD:route:<field value>` (e.g. per email) |

Requests that fail `request` validation never reach `match`, so they do **not** advance the counter.

You can combine `call` with `params` / `query` / `body` (all listed conditions must match). First match wins.

#### 8.1 Shorthand — `"call": N`

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

Without `loop`, once you pass the highest `index`, later hits keep falling through to `nameResponse`.

#### 8.2 Object form — `index`, `by`, `loop`, `reset`

| Field | Type | Required | Behavior |
|-------|------|----------|----------|
| `index` | number (≥ 1) | ❌* | Match only when the effective call number equals this value |
| `by` | object | ❌ | Scope the counter: exactly one of `body`, `query`, `params` → field path |
| `loop` | boolean | ❌ | If `true` on any response of the method, wrap after `max(index)` back to `1` |
| `reset` | boolean | ❌* | If `true` and this response is selected, set that counter back to `0` |

\* A `call` object must include at least `index` and/or `"reset": true`. A reset-only `call` must also include `params` / `query` / `body` so it is not a catch-all. All `call.by` values in the same method must be identical.

```json
"match": {
  "call": {
    "index": 1,
    "by": { "body": "email" },
    "loop": true
  }
}
```

```json
"match": {
  "call": {
    "reset": true,
    "by": { "body": "email" }
  },
  "body": { "password": "correct" }
}
```

#### 8.3 Per-user counters — `call.by`

Use `by` so Alice and Bob do not share attempts:

```json
{
  "api/auth/login-by": {
    "POST": {
      "nameResponse": "locked",
      "responses": [
        {
          "name": "wrong-1",
          "statusCode": 401,
          "match": {
            "call": { "index": 1, "by": { "body": "email" } },
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
            "call": { "index": 2, "by": { "body": "email" } },
            "body": { "password": "wrong" }
          },
          "body": {
            "error": "INVALID_CREDENTIALS",
            "attemptsLeft": 1
          }
        },
        {
          "name": "locked",
          "statusCode": 423,
          "body": { "error": "ACCOUNT_LOCKED" }
        }
      ]
    }
  }
}
```

| Request | Result |
|---------|--------|
| Alice wrong (1st) | `wrong-1` |
| Bob wrong (1st) | `wrong-1` (Bob’s own counter) |
| Alice wrong (2nd) | `wrong-2` |
| Alice wrong (3rd+) | `locked` |

If `by` is configured and the field is missing/`null`/object, call-index matching is skipped for that request (other `match` fields / `nameResponse` still apply). Prefer the same `by` on every `call` of the method.

Nested paths work: `"by": { "body": "user.email" }`.

#### 8.4 Loop — `call.loop`

When any response sets `"loop": true`, after the highest `index` the effective number wraps to `1` instead of sticking on `nameResponse`:

```json
{
  "api/flaky-loop": {
    "GET": {
      "nameResponse": "ok",
      "responses": [
        {
          "name": "fail",
          "statusCode": 503,
          "match": { "call": { "index": 1, "loop": true } },
          "body": { "ok": false, "wave": 1 }
        },
        {
          "name": "ok",
          "statusCode": 200,
          "match": { "call": { "index": 2, "loop": true } },
          "body": { "ok": true, "wave": 2 }
        }
      ]
    }
  }
}
```

| Call # | Effective index | Result |
|--------|-----------------|--------|
| 1 | 1 | `fail` |
| 2 | 2 | `ok` |
| 3 | 1 | `fail` (wrapped) |
| 4 | 2 | `ok` (wrapped) |

`loop` is method-wide for that counter: one `true` is enough (you can repeat it on each indexed response for readability).

#### 8.5 Reset — `call.reset`

When a response with `"reset": true` is selected, that counter returns to `0`. The next hit is `index` 1 again — useful after a successful login:

```json
{
  "name": "success",
  "statusCode": 200,
  "match": {
    "call": { "reset": true },
    "body": { "password": "correct" }
  },
  "body": { "token": "mock-jwt-token" }
}
```

| Sequence | Result |
|----------|--------|
| wrong, wrong, wrong | `wrong-1` → `wrong-2` → `locked` |
| correct | `success` + counter reset |
| wrong | `wrong-1` again |

Combine with `by` so only that user’s counter resets: `"call": { "reset": true, "by": { "body": "email" } }`.

#### 8.6 Full login example (shorthand + reset)

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

- 1st / 2nd wrong password → `wrong-1` / `wrong-2`
- 3rd+ wrong → `locked` (`nameResponse`; no `loop`)
- Correct password anytime → `success` and counter reset
- Next wrong after success → `wrong-1` again

### Example 9: Request validation

`request` validates the incoming `payload` and/or `query` (and optional `headers`) **before** `match` / `nameResponse`.

Flow:

```
incoming request
  → request validation (payload / query / headers)
       FAIL → error.response (or generic 400) + stop
       PASS → match → nameResponse → delay → proxy/body/encoding
```

`request` and `match` do not conflict:
- `request` answers “is this valid?”
- `match` answers “which scenario?”

#### Request config keys

| Key | Required | Type | Default | Description |
|-----|----------|------|---------|-------------|
| `payload` | ❌* | object \| rule | - | Field map, or a single rule for raw/text bodies |
| `query` | ❌* | object | - | Field rules for query params |
| `headers` | ❌* | object | - | Field rules for HTTP headers |
| `as` | ❌ | string | auto | Force Content-Type mode: `json` / `form` / `multipart` / `raw` / `text` |
| `error.response` | ❌ | string | generic `400` | Response `name` used when validation fails |
| `error.format` | ❌ | `"array"` \| `"map"` | `"array"` | Shape of collected field errors |
| `error.detail` | ❌ | object \| string | built-in shape | Template for each error item |
| `error.key` | ❌ | string | `"errors"` | Body key where formatted errors are written |

\* At least one of `payload`, `query`, or `headers` is required when `request` is present.

#### Field shortcuts

```json
"name": "string"
```

is equivalent to:

```json
"name": { "type": "string" }
```

Optional fields use a trailing `?` on the key:

```json
"age?": { "type": "number", "min": 18 }
```

#### Field rules

| Rule | Applies to | Example | Description |
|------|------------|---------|-------------|
| `type` | all | `"string"` | `string`, `number`, `boolean`, `object`, `array`, `file` |
| required / `?` | all | `"email"` / `"age?"` | Presence. Keys without `?` are required |
| `minLength` / `maxLength` | `string` | `8` / `64` | String length bounds |
| `min` / `max` | `number` | `18` / `120` | Numeric range |
| `pattern` | `string` | `"^\\d{5}$"` | Regular expression |
| `format` | `string` | `"email"` | Built-in string formats (see below) |
| `enum` | `string` / `number` | `["admin", "user"]` | Allowed values |
| `minItems` / `maxItems` | `array` | `1` / `10` | Array size bounds |
| `properties` | `object` | `{ "city": "string" }` | Nested object fields |
| `items` | `array` | `{ "type": "object", ... }` | Schema for each array element |
| `message` | all | `"Email inválido"` | Custom error message for that field (optional) |

`format` values:

| Format | Validates |
|--------|-----------|
| `email` | Basic email shape |
| `uuid` | UUID string |
| `url` | `http://` or `https://` URL |
| `date` | ISO-like date (`YYYY-MM-DD`, optional time) |

#### Nested fields

**A) Nested object with `properties`:**

```json
"address": {
  "type": "object",
  "properties": {
    "city": { "type": "string", "minLength": 2 },
    "zip?": { "type": "string", "pattern": "^\\d{5}$" }
  }
}
```

**B) Dot path (equivalent for flat declarations):**

```json
"address.city": { "type": "string", "minLength": 2 },
"address.zip?": { "type": "string", "pattern": "^\\d{5}$" }
```

**C) Array of objects:**

```json
"items": {
  "type": "array",
  "minItems": 1,
  "maxItems": 10,
  "items": {
    "type": "object",
    "properties": {
      "sku": "string",
      "qty": { "type": "number", "min": 1 }
    }
  }
}
```

Error paths look like `address.city` or `items.0.qty`.

#### Query coercion

Query values arrive as strings. When `type` is:

| `type` | Coercion |
|--------|----------|
| `number` | `"1"` → `1` |
| `boolean` | `"true"` / `"false"` → boolean |
| other | no coercion |

If a query key is repeated and the field is not `array`, the first value is used.

Query error paths are prefixed with `query.` (e.g. `query.page`).

#### Failure behavior

| Config | Result when validation fails |
|--------|------------------------------|
| no `error.response` | Status `400`, body `{ "message": "Invalid request", "errors": ... }` |
| `"error": { "response": "validation-error" }` | That response’s status/headers/body, with errors written into `error.key` |

All field errors are accumulated in one response (not fail-fast on the first field).

#### Error formats

**`error.format: "array"` (default)** without custom `error.detail`:

```json
{
  "message": "Invalid request",
  "errors": [
    {
      "path": "email",
      "rule": "format",
      "expected": "email",
      "received": "x",
      "message": "email must be a valid email"
    }
  ]
}
```

**`error.format: "map"`:**

```json
{
  "message": "Invalid request",
  "errors": {
    "email": ["email must be a valid email"],
    "password": ["password must have minLength 8"]
  }
}
```

#### `error.detail` templates

Available placeholders: `{{path}}`, `{{rule}}`, `{{expected}}`, `{{received}}`, `{{message}}`.

Object template (typical with `array`):

```json
"detail": {
  "field": "{{path}}",
  "msg": "{{message}}"
}
```

String template (useful with `map`, or as array of strings):

```json
"detail": "{{message}}"
```

With `error.format: "map"`, only the message string is used per field (object templates are not applied item-by-item).

#### Default messages (when `message` is omitted)

| Rule | Default message |
|------|-----------------|
| required | `email is required` |
| type | `email must be string` |
| minLength / maxLength | `password must have minLength 8` |
| min / max | `age must be >= 18` |
| pattern | `code must match pattern ^\\d{5}$` |
| format | `email must be a valid email` |
| enum | `role must be one of: admin, user` |
| minItems / maxItems | `tags must have minItems 1` |

#### Full example

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
          "body": { "id": 1 }
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
  },
  "api/search": {
    "GET": {
      "nameResponse": "success",
      "request": {
        "query": {
          "q": { "type": "string", "minLength": 2 },
          "page?": { "type": "number", "min": 1 },
          "strict?": "boolean"
        },
        "error": {
          "format": "map"
        }
      },
      "responses": [
        { "name": "success", "statusCode": 200, "body": { "results": [] } }
      ]
    }
  },
  "api/profiles": {
    "POST": {
      "nameResponse": "created",
      "request": {
        "payload": {
          "userId": { "type": "string", "format": "uuid" },
          "address.city": { "type": "string", "minLength": 2 },
          "address.zip?": { "type": "string", "pattern": "^\\d{5}$" }
        },
        "error": {
          "key": "details",
          "detail": "{{message}}"
        }
      },
      "responses": [
        { "name": "created", "statusCode": 201, "body": { "id": "ok" } }
      ]
    }
  },
  "api/filters": {
    "POST": {
      "nameResponse": "success",
      "request": {
        "query": {
          "page?": { "type": "number", "min": 1 }
        },
        "payload": {
          "tags": {
            "type": "array",
            "minItems": 1,
            "maxItems": 5,
            "items": "string"
          }
        },
        "error": {
          "response": "bad-request",
          "format": "map",
          "detail": "{{path}}: {{message}}",
          "key": "fields"
        }
      },
      "responses": [
        { "name": "success", "statusCode": 200, "body": { "ok": true } },
        {
          "name": "bad-request",
          "statusCode": 400,
          "body": { "message": "Filter validation failed", "fields": {} }
        }
      ]
    }
  }
}
```

Behavior examples:
- Invalid register payload → `422 validation-error` with custom `error.detail` items
- Valid register + `email: "taken@example.com"` → `409 duplicate-email` (`match`, after `request` passes)
- Invalid search query → generic `400` with `errors` as a map
- Invalid profile payload → generic `400` with errors under `details`
- Invalid filters → `400 bad-request` with map under `fields`

See Example 9 above for a full `request` configuration you can paste into your project.

---

