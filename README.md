<p align="center">
  <img src="assets/title.png" alt="http-mock-json" width="800" />
</p>

![npm version](https://img.shields.io/npm/v/http-mock-json?style=flat-square)
![npm downloads](https://img.shields.io/npm/dm/http-mock-json?style=flat-square)
![license](https://img.shields.io/npm/l/http-mock-json?style=flat-square)
![GitHub stars](https://img.shields.io/github/stars/alejandrorodrom/http-mock-json?style=flat-square)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat-square&logo=typescript&logoColor=white)
![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen?style=flat-square)

> Mock your real API in JSON — status codes, errors, validation, latency, and mutable data — so the frontend can develop and test without waiting on a backend.

Define the same endpoints your app will call. Switch success and failure scenarios, validate request shapes, persist collections, or proxy selected routes to a live server. One mock server stands in for the backend until it is ready (or when it is down).

## Table of Contents

- [Features](#features)
- [Quick Start](#quick-start)
- [Installation and use](#installation-and-use-)
- [Commands](#commands-)
- [Validation System](#validation-system-)
- [Advanced examples](#advanced-examples)
- [Real-world projects](#real-world-projects-)
- [Mutable store](#mutable-store-)
  - [Capability map (build complex mocks)](#capability-map-build-complex-mocks)
  - [How it works](#how-it-works)
  - [Actions](#actions)
  - [Schema](#schema-definition-vs-reference)
  - [List sort and pagination](#list-sort-and-pagination-storelist)
    - [Filters / search](#filters--search)
  - [Key generation on create](#key-generation-on-create)
  - [Conflicts](#conflicts-409)
  - [Not found](#not-found-404)
  - [Soft delete](#soft-delete)
  - [Relations](#relations)
  - [Persist and restart](#persist-and-restart-behavior)
  - [Runtime HTTP statuses](#runtime-http-statuses)
  - [Out of scope](#out-of-scope)
  - [Example A — Simple](#example-a--simple-notes-crud)
  - [Example B — Complex](#example-b--complex-multi-tenant-users)
  - [Example C — Todo app](#example-c--real-project-todo--notes-app)
  - [Example D — SaaS projects](#example-d--real-project-saas-projects-board)
  - [Example E — E-commerce catalog](#example-e--real-project-e-commerce-catalog)
  - [Example F — Helpdesk](#example-f--real-project-multi-tenant-helpdesk)
  - [Example G — HR directory](#example-g--real-project-hr-employee-directory)
  - [Example H — Blog CMS](#example-h--real-project-blog-cms-with-authors)
  - [Example I — Multi-tenant orders](#example-i--real-project-multi-tenant-orders)
  - [Example J — Auth lockout](#example-j--real-project-auth-lockout--sessions)
- [Troubleshooting](#troubleshooting-)
- [License](#license-)

## Features

**Key Features:**

- **Zero Configuration** - Get started in seconds with interactive setup
- **Automatic Validation** - Comprehensive validation system prevents errors before they happen
- **Hot Reload** - Watch mode automatically restarts server on file changes
- **Multiple Responses** - Simulate different scenarios (success, error, etc.) for the same endpoint
- **Request Matching** - Select responses by route params, query params, request body and/or call count (`match.call` number or `{ index, by, loop, reset }`)
- **Request Validation** - Validate request `body`/`query` shape with rules (`type`, `minLength`, `format`, nested objects, etc.)
- **Mutable Store** - Opt-in mutable collections (`store` + `action`) with `seed`, `template`, unique/key conflicts, customizable `notFound` (`404`), optional soft delete (`softDelete` + `restore` + `includeDeleted`), cross-store `relations` (FK + `expand` + `onDelete`), disk `persist`, `--reset-store`, and `store.list` (sort/multi-sort, page/offset/cursor, filters with `eq`/`ne`/`gt`/`gte`/`lt`/`lte`/`in` + nested + `or` + search, response templates). Start with the [capability map](#capability-map-build-complex-mocks) to compose complex APIs from the docs.
- **Response Delay** - Simulate latency per method or per response
- **Type Safe** - Built with TypeScript for better developer experience
- **RESTful Support** - Full support for GET, POST, PUT, PATCH, DELETE methods
- **JSON Based** - Simple JSON files, no complex configuration needed
- **Custom Headers** - Support for custom HTTP headers in responses
- **Parameter Support** - Dynamic routes with parameters (e.g., `/users/:id`)
- **Proxy** - Forward selected responses (or unmatched routes) to a real backend

## Quick Start

```bash
# Install
npm install http-mock-json --save-dev

# Initialize
mock-server init

# Start server
mock-server start
```

That's it! Your mock server is running on `http://localhost:3000` 🎉


---

## Installation and use 🔧

1. Install library.
   ```
   npm install http-mock-json --save-dev
   ```

2. Run the initialization command.
   ```
   mock-server init
   ```

   This command will:
    - Create a directory for your mock JSON files in your project root (or in the specified path)
    - Add a `mock:start` script to your `package.json` (enabled by default)
    - Optionally create your first mock file (enabled by default)

3. If you chose to create a mock (default behavior), you'll be prompted interactively:

   **Step 1:** Enter the name for your JSON file
   ```
   ? What is the name of the json file ? animals
   ```

   **Step 2:** Enter your API endpoint
   ```
   ? What is the endpoint ? data/animals
   ```
   > You can use parameters in endpoints like `data/animals/:id`

   **Step 3:** Select the HTTP methods you want to mock
   ```
   ? Select the http verbs you use
   ❯ ◯ GET
     ◯ POST
     ◯ PUT
     ◯ PATCH
     ◯ DELETE
   ```
   > Use arrow keys to navigate, space to select, and 'a' to toggle all

   **Step 4:** Confirm the creation
   ```
   ? Confirm? (Y/n) Y
   ```

4. A mock file will be created with a basic structure containing:
    - Your specified endpoint
    - Selected HTTP methods (GET, POST, etc.)
    - Two default responses: `success` (200) and `error` (404)
    - Empty body objects ready to be filled

   ### Mock structure

   | Key          | Required | Type           | Example                                  | Description                                                                |
   |--------------|----------|----------------|------------------------------------------|----------------------------------------------------------------------------|
   | endpoint     | ✅       | string         | `data/animals`, `data/animal/:parameter` | API route. Allowed characters: letters, numbers, "-", "_", ".", "~", "/", and parameters like ":id" |
   | store        | ❌       | object         | `{ "id": "users", "seed": [] }`          | Opt-in collection for this endpoint. Shared across routes by `store.id` (one full definition; others reference) |
   | store.id     | ✅*      | string         | `"users"`                                | Required when `store` is present. Reference form is `{ "id": "users" }` only |
   | store.key    | ❌       | string/array/object | `"id"`, `["tenantId","id"]`         | Primary key (default `"id"`). Composite keys + optional `conflict.response` |
   | store.seed   | ❌       | array          | `[{ "id": 1 }]`                          | Initial items (`[]` allowed). Used when there is no persist snapshot (or after `--reset-store`) |
   | store.template | ❌     | object         | `{ "active": true }`                     | Base object merged on `create` / `update` (not on `patch`). Key placeholders ignored unless client sends them |
   | store.unique | ❌       | array/object   | `["email"]` or `{ "fields": ["email", { "fields": ["tenantId","email"] }], "conflict": {...} }` | Unique fields (simple or composite) + customizable `409` conflict response |
   | store.persist| ❌       | boolean/object | `true` or `{ "enabled": true, "file": "state.json" }` | Persist to disk under the mock files root (default `.store/<id>.json`). Custom `file` must be relative (no `..`) |
   | store.list   | ❌       | boolean/object | `true` / `{ page, pageSize, offset, limit, cursor, sort, order, filter }` | Opt-in list engine for `action: "list"`: multi-sort, page/offset/cursor, filters (`eq`/`ne`/`gt`/`gte`/`lt`/`lte`/`in`, nested, `or`) + search. Response `body`/`headers` use placeholders (`{{items}}`, `{{next}}`, `{{nextCursor}}`, …) |
   | store.softDelete | ❌   | boolean/object | `true` or `{ "field": "deletedAt" }`     | Soft delete: `action: "delete"` sets the field (ISO); `list`/`get` hide items unless `?includeDeleted=true`; `action: "restore"` clears it |
   | store.relations | ❌  | object         | `{ "userId": "users" }` / `{ "orderRef": { "join": { "from", "to" } } }` / `{ "posts": { "type": "many", "join": { "from": "userId" } } }` | FK (`one`) + reverse embed (`many`); `join.from`/`join.to`; `?expand=` incl. nested (max depth 3) |
   | store.notFound | ❌    | object         | `{ "response": "missing-user" }`         | Named `404` response for missing / soft-deleted items (`get` / `update` / `patch` / `delete` / `restore`). Placeholders: `{{key}}`, `{{message}}`, each key field |
   | HTTP Method  | ✅       | string         | `GET`, `POST`, `PUT`, `PATCH`, `DELETE`  | HTTP verb (must be uppercase)                                              |
   | nameResponse | ✅       | string         | `success`, `error`, `error-401`          | Fallback response when no `match` applies (must exist in responses array) |
   | request      | ❌       | object         | `{ "body": { "email": "string" } }`      | Validate incoming `body` and/or `query` before selecting a response        |
   | request.body | ❌       | object         | `{ "email": { "type": "string", "format": "email" } }` | Field rules for JSON body (`?` suffix = optional)                 |
   | request.query| ❌       | object         | `{ "page?": { "type": "number", "min": 1 } }` | Field rules for query params (basic number/boolean coercion)         |
   | request.invalidResponse | ❌ | string | `"validation-error"`                     | Response `name` used when validation fails (default: generic `400`)        |
   | request.errorFormat | ❌ | `"array"` \| `"map"` | `"map"`                             | Shape of collected field errors (`array` default, or `{ field: ["..."] }`) |
   | request.errorDetail | ❌ | object/string | `{ "field": "{{path}}", "msg": "{{message}}" }` | Template for each error item (`{{path}}`, `{{rule}}`, `{{expected}}`, `{{received}}`, `{{message}}`) |
   | request.errorDetailsKey | ❌ | string | `"errors"`                               | Body key where formatted errors are written (default `errors`)             |
   | delay        | ❌       | number         | `300`                                    | Default latency in ms for all responses of this method (overridable per response) |
   | proxy        | ❌       | string/object  | `"https://api.staging.com"`              | Default proxy target for responses with `"proxy": true`                    |
   | responses    | ✅       | array          |                                          | A mock can have multiple responses (array), each identified with a `name`. |
   | name         | ✅       | string         |                                          | Response name (unique within the responses array)                          |
   | statusCode   | ✅*      | string/number  | `200`, `"200"`, `404`, `"404"`          | Required unless the response uses `proxy`                                  |
   | headers      | ❌       | object         | `{ "Content-Type": "application/json" }`  | Headers in json format (optional)                                          |
   | body         | ✅*      | any            |                                          | Required unless the response uses `proxy` or `action`                      |
   | action       | ❌       | string         | `"list"`, `"get"`, `"create"`, `"update"`, `"patch"`, `"delete"`, `"restore"` | Run a store operation instead of a fixed `body` (requires `store`; incompatible with `proxy`). `body` ignored except for `list` templates. `delete` always `204`. `restore` requires `store.softDelete` |
   | match        | ❌       | object         | `{ "params": { "id": "1" } }`            | Request matching rules (`params`, `query`, `body` and/or `call`). First match wins |
   | match.params | ❌       | object         | `{ "id": "1" }`                          | Partial match against route params (e.g. `/users/:id`)                     |
   | match.query  | ❌       | object         | `{ "page": "1" }`                        | Partial match against request query params                                 |
   | match.body   | ❌       | any            | `{ "email": "a@b.com" }`                 | Partial match against request body                                         |
   | match.call   | ❌       | number \| object | `1` or `{ "index": 1, "by": { "body": "email" }, "loop": true, "reset": true }` | Match by N-th hit (1-based). Number shorthand = `{ "index": N }`. See [Example 8](#example-8-match-by-call-count) |
   | match.call.index | ❌   | number         | `1`, `2`                                 | 1-based call index to match                                                |
   | match.call.by | ❌      | object         | `{ "body": "email" }`                    | Scope the counter by one field from `body`, `query`, or `params` (nested paths allowed, e.g. `"user.email"`) |
   | match.call.loop | ❌    | boolean        | `true`                                   | After the highest `index`, wrap back to `1` (instead of staying on `nameResponse`) |
   | match.call.reset | ❌   | boolean        | `true`                                   | When this response is selected, reset that counter to `0` (next hit is `index` 1 again) |
   | delay        | ❌       | number         | `500`                                    | Latency in ms for this response (overrides method-level `delay`)           |
   | proxy        | ❌       | string/object/true | `true`, `"https://api.com"`, `{ "target": "...", "path": "/v2/users" }` | Forward the original request to a real backend |

5. Edit the mock file to add your response data.

   Open the created JSON file (e.g., `animals.json`) and fill in the `body` objects with your mock data:

   ```json
   {
     "data/animals": {
       "GET": {
         "nameResponse": "success",
         "responses": [
           {
             "name": "success",
             "statusCode": "200",
             "body": {
               "animals": [
                 { "id": 1, "name": "Lion" },
                 { "id": 2, "name": "Tiger" }
               ]
             }
           },
           {
             "name": "error",
             "statusCode": "404",
             "body": {
               "message": "No animals found"
             }
           }
         ]
       }
     }
   }
   ```

   **Tip:** Change the `nameResponse` value to switch which response is returned by default. For example, set
   `"nameResponse": "error"` to return the error response.

6. Execute the start command
   ```
   mock-server start
   ```

   The server will automatically validate:
   1. **Port availability first** - Checks if the port is available before processing any files
   2. **All mock files** - Validates all mock files for errors
   
   If there are validation errors, the server will not start and will display detailed error messages. If there are warnings (like non-standard status codes), they will be shown but won't prevent the server from starting.

   **Watch Mode**: The server automatically watches for changes in your mock files and restarts when you save changes.
   If errors are introduced during watch mode, the server will display the errors and wait for you to fix them.

---

## Commands ⚙️

1. `init`

   Create the folder that will contain the mocks.

    ```
    mock-server init
    ```

   | Flag        | Default | Description                                               |
   |-------------|---------|-----------------------------------------------------------|
   | -p --path   | `root`  | Indicates the location of the mocks in a specific folder. |
   | -m --mock   | `true`  | Create a first mock.                                      |
   | -s --script | `true`  | Add script to start the mock in the package.json file.    |

   **Example:**
   ```
   mock-server init --path apps/folder1 --mock false --script false
   ```

2. `start`

   Start mock server.

    ```
    mock-server start
    ```

   | Flag        | Default | Description                                                                 |
   |-------------|---------|-----------------------------------------------------------------------------|
   | -p --port   | `3000`  | Indicates the port where the mock will be executed                          |
   | -f --path   | `root`  | Indicates the location of the mocks in a specific folder.                   |
   | --proxy     | -       | Global proxy target (`http`/`https`). Used by `"proxy": true` and unmatched routes |
   | --reset-store | -     | Delete persisted store files **before the initial start** (all stores, or comma-separated ids). Not re-applied on watch reloads |

   **Example:**
   ```
   mock-server start --port 3001 --path apps/folder1 --proxy https://api.staging.com
   mock-server start --reset-store
   mock-server start --reset-store notes,users
   ```

3. `add`

   Create a mock.

    ```
    mock-server add
    ```

   | Flag      | Default | Description                                               |
   |-----------|---------|-----------------------------------------------------------|
   | -p --path | `root`  | Indicates the location of the mocks in a specific folder. |

   **Example:**
    ```
    mock-server add --path apps/folder1
    ```

---

## Validation System ✅

The server includes a comprehensive validation system that checks your mock files before starting:

### Automatic Validation

When you run `mock-server start`, the system automatically validates in this order:

1. **Port availability** (validated first, before loading mocks): Checks if the specified port is available using an efficient socket connection method. If the port is in use, the server fails immediately without loading or validating mocks, saving time and resources.

2. **Endpoint format**: Ensures endpoints use valid characters and proper structure
3. **HTTP methods**: Validates that only valid HTTP methods are used (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`)
4. **Response structure**: Checks that all required fields are present (`name`, `statusCode`, `body`)
5. **Response matching**: Verifies that `nameResponse` references exist in the responses array
6. **Optional match/delay/proxy**: Validates `match`, non-negative `delay`, and `proxy` URL shapes
7. **Optional request validation**: Validates `request.body` / `request.query` rule shapes, formats, and `invalidResponse` references
8. **Optional store / action**: Validates `store` schema, unique/key/seed rules, `action` values, and conflict response names
9. **JSON structure**: Ensures files contain valid JSON objects

### Error Handling

- **Errors**: Critical issues that prevent the server from starting (missing required fields, invalid structure, etc.)
- **Warnings**: Non-critical issues that don't prevent startup (non-standard status codes, etc.)

If errors are found, the server will display detailed messages showing:

- The file where the error occurred
- The endpoint and method (if applicable)
- A clear description of the issue

### Watch Mode Behavior

When files change during watch mode:

- The server attempts to restart automatically
- If validation errors are found, the restart is prevented
- Clear error messages are displayed
- The server waits for you to fix the issues before restarting
- Persist snapshots (`.store/` and custom `persist.file` paths) are ignored by the watcher so store writes do not trigger a restart
- `--reset-store` is **not** re-applied on watch reloads (only the initial `start`)

---

## Recommendations 📋

* Review the advanced examples and the [mutable store guide](#mutable-store-) if you need mutable CRUD.
* A single json file can contain many mocks.
* There can be many json files each with their respective mocks.
* The server validates your mocks automatically - fix any errors before the server can start.
* Prefer `request` for input shape and `store.unique` / conflict responses for business uniqueness (`409`).

---

## Advanced examples

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

`match.body` does a partial deep match against the JSON request body.

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

`request` validates the incoming `body` and/or `query` **before** `match` / `nameResponse`.

Flow:

```
incoming request
  → request validation (body / query)
       FAIL → invalidResponse (or generic 400) + stop
       PASS → match → nameResponse → delay → proxy/body
```

`request` and `match` do not conflict:
- `request` answers “is this valid?”
- `match` answers “which scenario?”

#### Request config keys

| Key | Required | Type | Default | Description |
|-----|----------|------|---------|-------------|
| `body` | ❌* | object | - | Field rules for the JSON body |
| `query` | ❌* | object | - | Field rules for query params |
| `invalidResponse` | ❌ | string | generic `400` | Response `name` used when validation fails |
| `errorFormat` | ❌ | `"array"` \| `"map"` | `"array"` | Shape of collected field errors |
| `errorDetail` | ❌ | object \| string | built-in shape | Template for each error item |
| `errorDetailsKey` | ❌ | string | `"errors"` | Body key where formatted errors are written |

\* At least one of `body` or `query` is required when `request` is present.

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
| `type` | all | `"string"` | `string`, `number`, `boolean`, `object`, `array` |
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
| no `invalidResponse` | Status `400`, body `{ "message": "Invalid request", "errors": ... }` |
| `"invalidResponse": "validation-error"` | That response’s status/headers/body, with errors written into `errorDetailsKey` |

All field errors are accumulated in one response (not fail-fast on the first field).

#### Error formats

**`errorFormat: "array"` (default)** without custom `errorDetail`:

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

**`errorFormat: "map"`:**

```json
{
  "message": "Invalid request",
  "errors": {
    "email": ["email must be a valid email"],
    "password": ["password must have minLength 8"]
  }
}
```

#### `errorDetail` templates

Available placeholders: `{{path}}`, `{{rule}}`, `{{expected}}`, `{{received}}`, `{{message}}`.

Object template (typical with `array`):

```json
"errorDetail": {
  "field": "{{path}}",
  "msg": "{{message}}"
}
```

String template (useful with `map`, or as array of strings):

```json
"errorDetail": "{{message}}"
```

With `errorFormat: "map"`, only the message string is used per field (object templates are not applied item-by-item).

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
        "body": {
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
        "invalidResponse": "validation-error",
        "errorFormat": "array",
        "errorDetail": {
          "field": "{{path}}",
          "msg": "{{message}}"
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
        "errorFormat": "map"
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
        "body": {
          "userId": { "type": "string", "format": "uuid" },
          "address.city": { "type": "string", "minLength": 2 },
          "address.zip?": { "type": "string", "pattern": "^\\d{5}$" }
        },
        "errorDetailsKey": "details",
        "errorDetail": "{{message}}"
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
        "body": {
          "tags": {
            "type": "array",
            "minItems": 1,
            "maxItems": 5,
            "items": "string"
          }
        },
        "invalidResponse": "bad-request",
        "errorFormat": "map",
        "errorDetail": "{{path}}: {{message}}",
        "errorDetailsKey": "fields"
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
- Invalid register body → `422 validation-error` with custom `errorDetail` items
- Valid register + `email: "taken@example.com"` → `409 duplicate-email` (`match`, after `request` passes)
- Invalid search query → generic `400` with `errors` as a map
- Invalid profile body → generic `400` with errors under `details`
- Invalid filters → `400 bad-request` with map under `fields`

See Example 9 above for a full `request` configuration you can paste into your project.

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

### Example 11: Mutable store

Opt-in collections that mutate while the server runs. Declare `store` on the endpoint and mark responses with `action`.

See the full guide (capability map, schema, persist, conflicts, recipes, examples A–I):  
**[Mutable store](#mutable-store-)** · **[Capability map](#capability-map-build-complex-mocks)**

---

## Mutable store 🗄️

Opt-in feature (≥ `1.11.0`; advanced list filters ≥ `1.12.0`; composite unique ≥ `1.13.0`; soft delete ≥ `1.14.0`; relations ≥ `1.15.0`; customizable `notFound` ≥ `1.16.0`). Without `store` + `action`, mocks stay 100% static.

Use it when the frontend needs **real CRUD flows**: create an item, list it, edit it, delete it — without a backend. Data lives in memory for the process lifetime; optionally survive restarts with `persist`.

The sections below are the reference. Use the **capability map** to pick pieces, then copy a recipe or a ready-made example (A–I) and adapt routes/fields to your app.

### Capability map (build complex mocks)

Goal: from this README alone you can compose multi-tenant APIs with validation, business errors, filtered/paginated lists, and persistence.

#### 1. Pick building blocks

| You need… | Use | Query / config sketch | Deep dive |
|-----------|-----|----------------------|-----------|
| Collection + CRUD | `store` + `action` | `"action": "list" \| "get" \| "create" \| "update" \| "patch" \| "delete" \| "restore"` | [Actions](#actions), [Schema](#schema-definition-vs-reference) |
| Soft delete / trash | `store.softDelete` | `"softDelete": true` + `?includeDeleted=true` | [Soft delete](#soft-delete) |
| Relations / FK | `store.relations` | `"userId": { "store": "users", "join": { "from": "userId", "to": "id" } }` / `type: "many"` / `?expand=posts.user` | [Relations](#relations) |
| Auto ids / defaults | `key`, `template` | `"key": "id"` or `{ "fields": ["tenantId", "id"] }` | [Key generation](#key-generation-on-create) |
| Seed data | `seed` | `"seed": [{ "id": 1, ... }]` | [Schema](#schema-definition-vs-reference) |
| Business uniqueness | `unique` + `409` responses | `"unique": ["email"]` or field-level `conflict` | [Conflicts](#conflicts-409) |
| Custom missing item | `store.notFound` | `"notFound": { "response": "missing-user" }` | [Not found](#not-found-404) |
| Survive restart | `persist` / `--reset-store` | `"persist": true` | [Persist and restart](#persist-and-restart-behavior) |
| Validate payload/query | `request` | `"body": { "email": { "type": "string", "format": "email" } }` | [Request validation](#example-8-request-validation) |
| Branch by params/query/body/call | `match` | `"match": { "call": { "index": 1, "by": { "body": "email" } } }` | [Example 5–8](#example-5-match-by-route-params) |
| Latency / headers | `delay`, `headers` | `"delay": 120`, `"Retry-After": "30"` | [Example 6](#example-6-match-by-query-params-and-delay) |
| Page tables | `store.list` **page** | `?page=2&pageSize=10` | [Page mode](#page-mode) |
| Offset APIs | `store.list` **offset** | `?offset=20&limit=10` | [Offset mode](#offset-mode) |
| Infinite scroll / feeds | `store.list` **cursor** | `?starting_after=<token>&limit=10` | [Cursor mode](#cursor--keyset-mode-stripe-style) |
| Equality filter | `filter` `eq` | `?status=active` | [Filters / search](#filters--search) |
| Exclude value | `op: "ne"` | `?excludeStatus=draft` | same |
| Numeric range | `gte`/`lte`/`gt`/`lt` | `?minPrice=10&maxPrice=50` | same |
| Multi-value | `op: "in"` | `?roles=a,b` or `?roles=a&roles=b` | same |
| Nested field | `a.b` in filter / search / sort | `?region=eu` or `?sort=meta.region` | same |
| OR facets | `filter.or` | `?anyDept=x&anyCity=y` → match either | same |
| Text box | `filter.search` | `?q=tea` | same |
| Multi-sort | `sort` | `?sort=price:desc,name:asc` | [Multi-sort](#multi-sort) |
| Custom list JSON | list placeholders | `"data": "{{items}}"`, `"Link": "{{linkHeader}}"` | [Response templates](#response-templates-fully-customizable) |
| Forward to real API | `proxy` (**not** with `action`) | `"proxy": true` or URL | [Proxy](#example-9-proxy-to-a-real-backend) |

Pipeline reminder (every request): `request` → `match` → `delay` → `proxy` **or** `action` → else static `body`.  
List pipeline (inside `action: "list"` + `store.list`): key params → `fields` (AND) → `or` → `search` → sort → page/offset/cursor → templates.

#### 2. Compose a complex endpoint (recipe)

Copy this skeleton and fill the `‹…›` slots. One file can define several endpoints; share data with `"store": { "id": "‹same-id›" }` on item routes.

```json
{
  "api/‹tenants›/:tenantId/‹resources›": {
    "store": {
      "id": "‹resources›",
      "key": { "fields": ["tenantId", "id"] },
      "seed": [],
      "template": {
        "tenantId": "",
        "id": 0,
        "status": "active",
        "meta": { "region": "" }
      },
      "unique": {
        "fields": [
          {
            "field": "‹slug-or-email›",
            "conflict": { "response": "‹conflict-name›" }
          }
        ]
      },
      "persist": true,
      "list": {
        "page": { "query": "page", "default": 1 },
        "pageSize": {
          "query": "pageSize",
          "default": 10,
          "max": 50,
          "aliases": ["limit"]
        },
        "sort": {
          "query": "sort",
          "default": "-id",
          "fields": ["id", "status", "‹price-or-createdAt›"]
        },
        "filter": {
          "fields": [
            "status",
            { "field": "‹price›", "op": "gte", "query": "minPrice" },
            { "field": "‹price›", "op": "lte", "query": "maxPrice" },
            { "field": "status", "op": "ne", "query": "excludeStatus" },
            { "field": "‹tag›", "op": "in", "query": "tags" },
            { "field": "meta.region", "op": "eq", "query": "region" }
          ],
          "or": [
            { "field": "status", "op": "eq", "query": "anyStatus" },
            { "field": "meta.region", "op": "eq", "query": "anyRegion" }
          ],
          "search": {
            "query": "q",
            "fields": ["‹name›", "meta.region"]
          }
        }
      }
    },
    "GET": {
      "nameResponse": "list",
      "responses": [
        {
          "name": "forbidden",
          "statusCode": 403,
          "match": { "params": { "tenantId": "blocked" } },
          "body": { "code": "FORBIDDEN" }
        },
        {
          "name": "list",
          "statusCode": 200,
          "action": "list",
          "headers": {
            "X-Total-Count": "{{total}}",
            "Link": "{{linkHeader}}"
          },
          "body": {
            "data": "{{items}}",
            "page": "{{page}}",
            "pageSize": "{{pageSize}}",
            "total": "{{total}}",
            "next": "{{next}}",
            "previous": "{{previous}}",
            "hasNext": "{{hasNext}}",
            "hasPrevious": "{{hasPrevious}}"
          }
        }
      ]
    },
    "POST": {
      "nameResponse": "create",
      "request": {
        "body": {
          "‹name›": { "type": "string", "minLength": 2 },
          "‹slug-or-email›": { "type": "string", "minLength": 2 }
        },
        "invalidResponse": "validation-error"
      },
      "responses": [
        {
          "name": "validation-error",
          "statusCode": 422,
          "body": { "message": "Invalid payload", "errors": [] }
        },
        {
          "name": "‹conflict-name›",
          "statusCode": 409,
          "body": { "code": "CONFLICT", "conflicts": "{{conflicts}}" }
        },
        { "name": "create", "statusCode": 201, "action": "create" }
      ]
    }
  },
  "api/‹tenants›/:tenantId/‹resources›/:id": {
    "store": { "id": "‹resources›" },
    "GET": {
      "nameResponse": "get",
      "responses": [{ "name": "get", "statusCode": 200, "action": "get" }]
    },
    "PATCH": {
      "nameResponse": "patch",
      "responses": [
        {
          "name": "‹conflict-name›",
          "statusCode": 409,
          "body": { "code": "CONFLICT", "conflicts": "{{conflicts}}" }
        },
        { "name": "patch", "statusCode": 200, "action": "patch" }
      ]
    },
    "DELETE": {
      "nameResponse": "remove",
      "responses": [{ "name": "remove", "statusCode": 204, "action": "delete" }]
    }
  }
}
```

Checklist when wiring a new domain:

1. **Identity** — `store.id` + `key` (simple or composite with route params).  
2. **Shape** — `template` + `seed` (+ nested objects if you filter on `a.b`).  
3. **List UX** — choose page **or** offset **or** cursor; add `filter` / `sort` / placeholders.  
4. **Writes** — `request` for shape; `unique` + named `409` responses for clashes.  
5. **Branches** — `match` for `401`/`403`/`503` before `action`.  
6. **Item routes** — reference the same `store.id`; include the same conflict response names on mutating methods.  
7. **Persist** — `"persist": true` if the UI must survive reload; document `--reset-store` for clean demos.

#### 3. Which ready-made example to copy

| Frontend you are building | Start from | What to steal |
|---------------------------|------------|---------------|
| Simple CRUD list | [Example A](#example-a--simple-notes-crud) | Minimal `list`/`create`/`get`/`delete` |
| Multi-tenant users | [Example B](#example-b--complex-multi-tenant-users) | Composite key + `request` + conflicts |
| Todo / notes app | [Example C](#example-c--real-project-todo--notes-app) | Persist + toggle-style `patch` |
| Org projects / board | [Example D](#example-d--real-project-saas-projects-board) | Slug unique + forbidden org `match` |
| Admin catalog + checkout | [Example E](#example-e--real-project-e-commerce-catalog) | Price/stock/`in`/warehouse/`or` + `402`/`429` |
| Support inbox + activity | [Example F](#example-f--real-project-multi-tenant-helpdesk) | Page + cursor + date/channel filters |
| People directory / HR | [Example G](#example-g--real-project-hr-employee-directory) | All filter ops + nested + combined query |
| Blog / CMS authors + articles | [Example H](#example-h--real-project-blog-cms-with-authors) | `relations` + soft delete + expand + restrict |
| Multi-tenant orders + line items | [Example I](#example-i--real-project-multi-tenant-orders) | Composite `join` + cascade + tenant routes |
| Auth lockout + sessions | [Example J](#example-j--real-project-auth-lockout--sessions) | `match.call` + `request` + `store` + headers |

More product scenarios (auth, RBAC, webhooks, proxy) live under [Real-world projects](#real-world-projects-).

### How it works

1. Put `store` at **endpoint level** (sibling of `GET` / `POST` / …, not inside a method).
2. Define the collection **once** (full object with `id`, optional `key` / `seed` / `template` / `unique` / `persist`).
3. Other routes that share data use the **reference** form: `"store": { "id": "notes" }`.
4. On each response you want to mutate/read the collection, set `"action": "list" | "get" | "create" | "update" | "patch" | "delete"`.

Request pipeline (fixed order):

1. `request` validation (if any) → may return `invalidResponse` and **never** hits the store  
2. `match` → picks a response (`nameResponse` fallback)  
3. `delay` (once)  
4. `proxy` **or** `action` (not both on the same response)  
5. otherwise static `body`

### Actions

| Action | Behavior | Success status | Common errors |
|--------|----------|----------------|---------------|
| `list` | Returns items. Filters by route `key` params. With `store.list`: filter (`fields`/`or`/`search`) → multi-sort → page/offset/cursor. Optional `body`/`headers` templates. Soft-deleted items omitted unless `?includeDeleted=true` | response `statusCode` | `400` (invalid page/sort/order/cursor/filter query) |
| `get` | Loads one item; all `key` fields must come from route params. Soft-deleted → `404` unless `?includeDeleted=true` | response `statusCode` | `404` (default or `store.notFound`) |
| `create` | Inserts; merges `template` + body; auto-generates missing numeric key fields; route params override key fields. Soft-deleted rows do not count toward `unique`/`key` | typically `201` | `400` (body not object), `409` (conflict) |
| `update` | Full replace (`template` + body), preserves existing key. Soft-deleted → `404` | response `statusCode` | `404` / `400` / `409` |
| `patch` | Partial merge on existing item (no template), preserves key. Soft-deleted → `404` | response `statusCode` | `404` / `400` / `409` |
| `delete` | Without `softDelete`: removes item. With `softDelete`: sets the delete field (ISO) and keeps the row. Runs `relations.onDelete` on dependents first. **Always** `204` with empty body on success (`statusCode` in JSON is ignored, warning if ≠ 204) | `204` | `404` / `409` (restrict) |
| `restore` | Requires `store.softDelete`. Clears the delete field and returns the item. Soft-deleted-only; active or missing → `404` | response `statusCode` | `404` / `409` |

Rules for `action`:

- Requires `store` on the endpoint  
- Cannot be combined with `proxy` on the same response  
- `body` is optional; ignored with warning for actions other than `list`  
- For `list`, `body` and `headers` may be templates with placeholders (see below)  
- Returned items are **clones** (mutating the HTTP response does not mutate the store)
- `restore` is only valid when the store definition has `softDelete`

### Soft delete

Soft delete means: **the item stays in the collection**, but is marked deleted (default field `deletedAt` = ISO timestamp). Clients that call `list` / `get` / `update` / `patch` treat it as gone, unless they ask for trash with `?includeDeleted=true` (or `1`). `action: "restore"` clears the mark.

#### Why it lives on `store`, not on the HTTP `DELETE`

`softDelete` is a property of the **collection**, not of one route:

1. **Same data, many verbs.** After a soft delete, `list` must hide the row, `get`/`patch` must 404, and `unique` must free the email/title. That logic belongs to the store that holds the rows, not to the `DELETE` response alone.
2. **`DELETE` only triggers the action.** The HTTP method still uses `"action": "delete"`. With soft delete on, that action **marks**; without it, that action **removes**. Same verb, different store policy.
3. **One policy per `store.id`.** Every endpoint that references `{ "id": "notes" }` shares the same in-memory Map. Putting soft delete on the store definition once keeps list/get/delete/restore consistent. Putting it only on the `DELETE` response would leave other actions unaware.

So: configure `"softDelete": true` (or `{ "field": "deletedAt" }`) on the **full store definition**. The `DELETE` endpoint does not need a special soft-delete flag — only `"action": "delete"` and a `store` that already has soft delete enabled.

#### Why a single endpoint is enough

You do **not** need `GET` list + `POST` create + `DELETE` for soft delete to work. Soft delete only needs:

1. A store definition with `softDelete` (and usually `seed`, or a `create` route, so there is something to delete).
2. A response with `"action": "delete"`.

Example — delete-only mock:

```json
"api/notes/:id": {
  "store": {
    "id": "notes",
    "softDelete": true,
    "seed": [{ "id": 1, "title": "Keep" }]
  },
  "DELETE": {
    "nameResponse": "remove",
    "responses": [
      { "name": "remove", "statusCode": 204, "action": "delete" }
    ]
  }
}
```

`DELETE /api/notes/1` returns 204 and sets `deletedAt` on that row. There is no list route here, so you cannot “see” the trash over HTTP until you add `get`/`list`/`restore` — but the soft delete **did** run in the store.

When you **do** share the store across routes (`api/notes` + `api/notes/:id`), keep **one** full definition (with `softDelete`) and use `{ "id": "notes" }` elsewhere — see [Schema (definition vs reference)](#schema-definition-vs-reference). Do not add `softDelete` on a reference; that becomes a second definition and fails startup.

#### Behavior

```json
"store": {
  "id": "notes",
  "softDelete": true
}
```

or `"softDelete": { "field": "deletedAt" }`.

| | Without `softDelete` | With `softDelete: true` |
|--|----------------------|-------------------------|
| `action: "delete"` | Removes the item | Keeps the item and sets `deletedAt` (ISO) |
| `list` / `get` | Normal | Soft-deleted items hidden (unless `?includeDeleted=true` or `1`) |
| `update` / `patch` | Normal | Soft-deleted → `404` |
| `unique` / `key` | Counts all items | Soft-deleted ignored (values free to reuse) |
| `action: "restore"` | Invalid | Clears `deletedAt` and returns the item |

Also:

- Absent/`null` delete field = active. Soft-deleting an already soft-deleted item → `404`.
- Persist keeps soft-deleted rows as-is (same file format).

### Relations

Opt-in links between stores: `type: "one"` (FK) and `type: "many"` (reverse embed). Targets may use a **simple or composite** store `key`.

#### `type: "one"` (default)

```json
"relations": {
  "userId": {
    "store": "users",
    "join": { "from": "userId", "to": "id" },
    "required": true,
    "onDelete": {
      "action": "restrict",
      "conflict": { "response": "has-posts" }
    },
    "embed": { "as": "user" },
    "conflict": {
      "response": "invalid-user",
      "detail": { "field": "{{field}}", "value": "{{value}}" }
    }
  },
  "orderRef": {
    "store": "orders",
    "join": {
      "from": ["tenantId", "orderId"],
      "to": ["tenantId", "id"]
    },
    "required": true,
    "onDelete": "cascade",
    "embed": "order"
  }
}
```

Shorthand: `"userId": "users"` → `type: "one"`, `join.from = "userId"`, `to` = target key, `required: false`, `onDelete: "restrict"`, default embed key `userId$`.

| Field | Default | Notes |
|-------|---------|-------|
| `type` | `"one"` | `"one"` = FK; `"many"` = reverse collection embed only |
| `store` | — | Target `store.id` (required) |
| `join.from` | relation name | Column(s) on **this** store (`string` or `string[]`) |
| `join.to` | target’s key | Column(s) on the referenced store; required when the target `key` is composite; must match that key |
| `required` | `false` | All `from` parts missing → error when `true` (`one` only). Partial `from` values also fail FK checks |
| `onDelete` | `"restrict"` | String `restrict`/`cascade`/`setNull`, **or** `{ "action", "conflict?" }` (`one` only; `setNull` not with `required: true`) |
| `embed` | `‹name›$` | String or `{ "as": "…" }` — property name when expanding; cannot equal a `join.from` field |
| `conflict` | default `409` | Invalid/missing FK on write (`one` only) |

`onDelete.conflict` (or top-level `conflict` as fallback) is used when **`action: "restrict"`** blocks deleting the parent. That named response must exist on the **parent** store’s `delete` method.

#### `type: "many"`

Declared on the **parent**. Embed-only (no write FK checks, no `onDelete`).

```json
"relations": {
  "posts": {
    "type": "many",
    "store": "posts",
    "join": { "from": "userId" },
    "embed": { "as": "posts" }
  }
}
```

| Field | Notes |
|-------|--------|
| `join.from` | Child column(s) that point at this store’s key (`string` or `string[]`; length must match). No `join.to` on `many` |
| Integrity | Child store must declare a `type: "one"` whose `join.from` equals this `join.from` and targets this store |

#### Expand

- Flat: `?expand=user` / `?expand=userId,posts`
- Nested (max depth **3**): `?expand=posts.user`
- Matching aliases per relation: relation **name**, `embed` / `embed.as`, and (for simple `one`) the single `join.from` field
- Soft-deleted related `one` → `null` (unless `?includeDeleted=true`); soft-deleted `many` children omitted the same way
- Soft-deleted children do **not** block `onDelete: "restrict"`
- `onDelete` runs in two phases: all `restrict` checks (including through `cascade` chains) first; only then `setNull` / `cascade` mutations. A blocked delete never leaves partial side effects.
- `cascade` is recursive (grandchildren included) and supports self-referential FKs on the same store
- Cycles are skipped (no infinite recursion)

#### Walkthrough (HTTP)

1. **Invalid FK** — `POST /api/posts` `{ "title": "X", "userId": 999 }` → status/body from `conflict.response` (e.g. `422` + `INVALID_USER`).
2. **Expand one** — `GET /api/posts/1?expand=user` → post plus `"user": { "id": 1, "name": "Ada" }`.
3. **Expand many + nested** — `GET /api/users/1?expand=posts.user` → user plus `posts: [...]`, each post with nested `user`.
4. **Restrict** — `DELETE /api/users/2` while posts reference them → `onDelete.conflict` on the users DELETE method (e.g. `409` + `HAS_POSTS`).
5. **Composite join** — `GET /api/acme/order-items/1?expand=order` embeds the order keyed by `(tenantId, id)`.

Behavior summary:

1. **Write** — only `type: "one"` validates FKs on create/update/patch/restore.
2. **Expand** — `one` embeds an object (or `null`); `many` embeds an array.
3. **onDelete** — only from child `one` relations (including composite joins and self-refs). `restrict` is evaluated before any mutation; `cascade` walks the dependent graph.
4. **Startup** — unknown targets, mismatched `join.from`/`join.to`, missing reverse for `many`, bad seed FKs, missing named conflict responses → fail boot.

### Schema (definition vs reference)

Think of `store.id` as the collection name. **Configure it once; point at it everywhere else.**

**Full definition** — all config for that collection, **only once** per `id` in the whole mock set:

```json
"store": {
  "id": "notes",
  "key": "id",
  "seed": [],
  "template": { "id": 0, "title": "", "done": false },
  "unique": ["title"],
  "persist": true,
  "list": true,
  "softDelete": true
}
```

**Reference** — other endpoints that share the same collection. **Only** `id` is allowed:

```json
"store": { "id": "notes" }
```

If you add any other key on a reference (`softDelete`, `seed`, `unique`, …), it becomes a second full definition → startup error (`store already defined`).

Right:

```json
"api/notes": {
  "store": { "id": "notes", "softDelete": true, "seed": [...] }
},
"api/notes/:id": {
  "store": { "id": "notes" },
  "DELETE": { "responses": [{ "action": "delete", ... }] }
}
```

Wrong (splits config / two definitions):

```json
"api/notes": {
  "store": { "id": "notes", "seed": [...] }
},
"api/notes/:id": {
  "store": { "id": "notes", "softDelete": true }
}
```

Also fine: put the **entire** full definition on `api/notes/:id` and use `{ "id": "notes" }` on `api/notes` — same rule, one definition only.

| Field | Default | Notes |
|-------|---------|-------|
| `id` | — | Required. Collection name in memory (and default persist filename) |
| `key` | `"id"` | String, string array, or `{ "field" }` / `{ "fields", "conflict?" }` — not both `field` and `fields` |
| `seed` | `[]` | Initial rows. Optional. Every seed item must include all key fields; no duplicate key/unique values. Omit/`[]` → empty until `create` or a persist snapshot |
| `template` | — | Defaults for `create` / `update`. Values on key fields are placeholders unless the client sends them |
| `unique` | — | `["email"]` or `{ "fields": [...], "conflict": { "response", "detail" } }` |
| `persist` | off | `true` / `{ "enabled": true, "file?": "relative/path.json" }` |
| `list` | off | `true` / `{}` / object — sort (multi), page/offset/cursor, filters/search for `action: "list"` (see [Filters / search](#filters--search) and [List sort and pagination](#list-sort-and-pagination-storelist)) |
| `softDelete` | off | `true` / `{ "field": "deletedAt" }` — on the full definition only; see [Soft delete](#soft-delete) |
| `relations` | off | `{ "userId": "users" }` or object map — FK / reverse embed; see [Relations](#relations) |
| `notFound` | off | `{ "response": "missing-user" }` — named `404` for missing / soft-deleted items; see [Not found](#not-found-404) |

Rules:

1. `store` is **not** an HTTP method; the endpoint still needs at least one verb (`GET`, `POST`, …).
2. Unknown keys inside `store` → startup error.
3. Several endpoints may share the same `store.id`; the full definition can appear only once. All of `key` / `seed` / `template` / `unique` / `persist` / `list` / `softDelete` / `relations` / `notFound` belong on that one definition.
4. A reference is **only** `{ "id": "..." }`. Any other property = full definition (and will conflict if that `id` is already defined).
5. A reference to an undefined `id` → startup error.
6. `seed` must be an array of objects (when present). `[]` or omitted → empty collection at start (unless a persist snapshot loads).
7. `unique.fields` must be non-empty. Each entry is a non-empty string, `{ "field", "conflict?" }`, or `{ "fields": ["a","b"], "conflict?" }` (composite unique).
8. `conflict` objects only allow `response` and `detail`.
9. `conflict.detail` is a non-empty string **or** a non-empty object whose values are strings (templates).
10. Named `conflict.response` values must exist in `responses` of every method that uses mutating actions (`create` / `update` / `patch` / `restore`) for that store (includes relation `conflict`). Named `onDelete.conflict.response` (or relation `conflict` when used as restrict fallback) must exist on every method with `action: "delete"` of the **target** store.
11. In a unique entry object, `field` and `fields` are mutually exclusive.
12. Named `notFound.response` must exist in `responses` of every method that uses `get` / `update` / `patch` / `delete` / `restore` for that store.

`key` shapes:

```json
"key": "id"
"key": ["tenantId", "id"]
"key": { "field": "id", "conflict": { "response": "duplicate-key" } }
"key": { "fields": ["tenantId", "id"], "conflict": { "response": "duplicate-key" } }
```

`unique` shapes:

```json
"unique": ["email", "username"]
"unique": {
  "fields": [
    "email",
    { "field": "username", "conflict": { "response": "duplicate-username" } },
    {
      "fields": ["tenantId", "email"],
      "conflict": { "response": "duplicate-tenant-email" }
    }
  ],
  "conflict": {
    "response": "duplicate-fields",
    "detail": { "campo": "{{field}}", "campos": "{{fields}}", "valor": "{{value}}" }
  }
}
```

Composite unique (`{ "fields": ["tenantId", "email"] }`) requires **all** listed fields to be present on the item to evaluate. Same email under another `tenantId` is allowed. `{{field}}` becomes `"tenantId+email"`; `{{fields}}` is `["tenantId","email"]`; `{{value}}` is the JSON array of values.
### Key generation on `create`

Merge order, then key resolution for each key field:

1. `base = { ...template, ...body }`
2. If the field is present in **route params** → use the param (params win over body). Pure numeric strings are coerced to numbers (`"12"` → `12`; `"12a"` stays a string).
3. Else if the field is present in the **body** → keep the body value (template placeholders for that key field are ignored).
4. Else → **auto-generate** a number: among items that share the other key fields (“siblings”), take `max(field) + 1`, or `1` if none.

Examples:

- `POST /api/notes` with `{ "title": "A" }` and `key: "id"` → `id` becomes `1`, then `2`, …
- `POST /api/acme/users` with composite key `["tenantId","id"]` → `tenantId` from params, next `id` among that tenant only

### `update` vs `patch`

| | `update` (PUT) | `patch` |
|--|----------------|---------|
| Merge | `{ ...template, ...body }` | `{ ...existing, ...body }` |
| Key fields | Always forced back to the existing item’s key (cannot change PK via body) | Same |
| Missing fields | Come from template (then body) | Kept from the existing item |

### Conflicts (`409`)

Checked on `create` / `update` / `patch` (not on `list` / `get` / `delete`):

1. Primary-key collision (for `update`/`patch`, the current item is ignored).
2. Each `unique` field present on the item — compared with `String(value)` (so `1` and `"1"` collide).

**All** conflicts are collected; there is no “stop at first” mode.

Which named response / `detail` is used:

| Situation | Response / detail source |
|-----------|--------------------------|
| Only key conflict(s) | `key.conflict` if set; else default `409` |
| Exactly one unique conflict (and no key conflict) | That field’s `fields[].conflict` if set; else `unique.conflict`; else default |
| Multiple conflicts (any mix) | `unique.conflict`, falling back to `key.conflict`; else default |
| No `conflict.response` configured | Default body below |

Default conflict response:

```json
{
  "message": "Duplicate value(s)",
  "conflicts": [
    { "field": "email", "value": "a@b.com", "message": "Duplicate value for unique field \"email\"" }
  ]
}
```

Status `409`. For a composite key conflict, `field` is the key fields joined with `+` (e.g. `"tenantId+id"`).

Placeholders in the **named** conflict response `body` (deep replace):

| Placeholder | Meaning |
|-------------|---------|
| `{{conflicts}}` as the **entire** property value | Replaced by an array shaped by `conflict.detail` (not a JSON string) |
| `{{conflicts}}` inside a larger string | Replaced by `JSON.stringify(...)` of that array |
| `{{field}}` / `{{value}}` / `{{message}}` | First conflict only |
| `{{fields}}` | JSON array of field names for the first conflict (`["email"]` or `["tenantId","email"]`) |

`conflict.detail` shaping of each conflict entry:

| `detail` | Each conflict becomes |
|----------|------------------------|
| omitted | `{ "field", "value", "message" }` |
| string template | that string with placeholders applied |
| object of string templates | same keys; each value is a template |

Headers from the selected conflict response are applied. `delay` already ran once before the action (including when the result is a conflict).

### Not found (`404`)

Optional. Without `store.notFound`, missing items (and soft-deleted items treated as missing) keep the default:

```json
{ "message": "Not found" }
```

Status `404`.

With config:

```json
"notFound": {
  "response": "missing-user"
}
```

```json
{
  "name": "missing-user",
  "statusCode": 404,
  "body": {
    "code": "USER_NOT_FOUND",
    "message": "User {{id}} was not found in tenant {{tenantId}}",
    "key": "{{key}}"
  }
}
```

Applies to `get` / `update` / `patch` / `delete` / `restore` when the item is missing or soft-deleted (and not requested with `?includeDeleted=true` for `get`). Soft-deleted “missing” paths use the same named response.

Placeholders in the named notFound response `body` / `headers` (deep replace):

| Placeholder | Meaning |
|-------------|---------|
| `{{<keyField>}}` | Value of each `store.key` field from route params (e.g. `{{id}}`, `{{tenantId}}`) |
| `{{key}}` | Full key as fields joined with `+` (e.g. `"acme+42"`) |
| `{{message}}` | Default message (`"Not found"`) |

`notFound` only allows `response` (no `detail` — the response body is the template). The named response must exist on every method that can return store `404` for that store.

### Persist and restart behavior

| Mode | On `mock-server start` / watch reload |
|------|----------------------------------------|
| No `persist` | Registry rebuilt from `seed` every time |
| `persist: true` / `{ "enabled": true }` | Loads `.store/<id>.json` under the mock files root if present and valid; otherwise `seed`. Successful mutations rewrite the snapshot |
| `{ "enabled": true, "file": "..." }` | Same, but custom path **relative** to the mock files root (no absolute paths, no `..`) |
| `false` / `{ "enabled": false }` | Same as no persist |

Snapshot file shape:

```json
{
  "items": [ { "id": 1, "title": "A" } ]
}
```

Behavior details:

1. Write is atomic: write `*.tmp`, then rename over the target.
2. Your mock JSON definition files are **never** modified by persist.
3. If a write fails, the server logs `Failed to persist store "<id>": ...` and **keeps the in-memory mutation** (the HTTP response still succeeds).
4. Invalid snapshot at startup (bad JSON, missing `items` array, non-object items, missing key fields, duplicate key/unique) → **startup fails** (server does not start).
5. Watcher ignores `.store/**`, custom persist files, their `.tmp` siblings, and custom parent dirs (when those dirs are not the mock files root), so persist I/O does not restart the server.
6. `--reset-store` deletes persist files **only on the initial CLI start**, then loads from `seed`. Watch reloads do **not** re-apply `--reset-store`.

```bash
mock-server start --reset-store              # clear all persist files, then start from seed
mock-server start --reset-store notes,users  # clear only those store ids
```

You can also delete `.store/<id>.json` (or your custom file) manually before start.

### Runtime HTTP statuses

| Case | Status | Body |
|------|--------|------|
| `list` / `get` / `create` / `update` / `patch` success | Response `statusCode` (use `201` for create if you want) | Cloned item or array; response `headers` applied |
| `delete` success | Always `204` | Empty (`null`); JSON `statusCode` ignored |
| Item not found (`get` / `update` / `patch` / `delete` / `restore`) | `404` or status of `store.notFound.response` | Default `{ "message": "Not found" }` or named body (see [Not found](#not-found-404)) |
| Body of `create` / `update` / `patch` is not a JSON object | `400` | `{ "message": "Request body must be a JSON object" }` |
| Key / unique conflict | `409` or status of the named conflict response | Default or named conflict body (see above) |
| Invalid relation FK | status of `relations.*.conflict.response` (else `409`) | Named body + `{{conflicts}}` / `detail` templates |
| Parent delete blocked (`onDelete` restrict) | status of `onDelete.conflict.response` (else `conflict`, else `409`) | Named body on the **parent** DELETE method |
| `request` validation failed | Your `invalidResponse` (or generic `400`) | Never reaches the store |
| `match` selected a static response (no `action`) | That response’s status/body | Store is not called |

Implications of the pipeline:

- `match` can return a static `401`/`403`/etc. on an endpoint that also has store actions.
- `action` and `proxy` cannot share the same response.
- `delay` runs once before the action; conflicts / `404` / `400` do not wait again.
- Response bodies from the store are deep clones; mutating them in the client does not change memory.

### Coexistence with other features

| Feature | Relationship |
|---------|--------------|
| `request` | Validates input **before** the store. Use it for types/format/`minLength`; use `unique` for business uniqueness |
| `match` | Chooses which response runs; may skip `action` entirely |
| `delay` / `headers` | Applied to action success, named conflict responses, and named notFound responses |
| `proxy` | Incompatible with `action` on the same response |
| Watch / restart | Without persist → back to `seed`. With persist → reload snapshot (unless `--reset-store` on initial start) |

### List sort and pagination (`store.list`)

Opt-in on the **full store definition** only (not on `{ "id": "..." }` references).  
Requires `action: "list"`. Without `store.list`, `list` still returns a plain array (optionally filtered by route params that overlap `key`).

Static mocks (`match` + fixed `body`) are unrelated: they do **not** use this engine.

#### Pipeline

1. Filter by route params that match `store.key` fields (e.g. `:tenantId`)
2. Apply `store.list.filter`: `fields` (AND) → `or` → `search` (if configured)
3. Multi-sort
4. Paginate: **page** | **offset** | **cursor**
5. If the response has `body` and/or `headers`, apply list placeholders; otherwise return the items array

#### Shortcuts

```json
"list": true
"list": {}
"list": false
```

`true` and `{}` enable **page mode** with defaults. `false` disables the list engine (same as omitting `list`).

| Option | Default |
|--------|---------|
| `page` query | `page`, default `1` |
| `pageSize` query | `pageSize`, default `10`, max `100`, alias `limit` |
| `sort` query | `sort`, default `"id"` (no field whitelist) |
| `order` query | `order`, default `"asc"` |

#### Config fields

| Key | Type | Meaning |
|-----|------|---------|
| `page` | `{ query?, default? }` | 1-based page (`default` ≥ 1) |
| `pageSize` | `{ query?, default?, max?, aliases? }` | Page size (`default`/`max` ≥ 1; `aliases` e.g. `["limit"]`) |
| `offset` | `{ query?, default? }` | 0-based offset (`default` ≥ 0) |
| `limit` | `{ query?, default?, max? }` | Offset-mode page size |
| `cursor` | `true` \| `{ query?, limit? }` | Cursor/keyset mode (see below) |
| `sort` | `{ query?, default?, fields? }` | Sort query name, default expression, optional whitelist |
| `order` | `{ query?, default? }` | `"asc"` \| `"desc"` — default direction for unsigned sort fields |
| `filter` | `string[]` \| `{ fields?, or?, search? }` | `eq`/`ne`/`gt`/`gte`/`lt`/`lte`/`in`, nested paths, OR group, search |

Unknown keys under `store.list` → startup error.

#### Page mode

```json
"list": {
  "page": { "query": "page", "default": 1 },
  "pageSize": {
    "query": "pageSize",
    "default": 10,
    "max": 100,
    "aliases": ["limit"]
  },
  "sort": { "query": "sort", "default": "id", "fields": ["id", "name", "price"] },
  "order": { "query": "order", "default": "asc" }
}
```

`offset` used internally = `(page - 1) * pageSize`.

#### Offset mode

Declare `offset` / `limit` **without** `page` / `pageSize` (unless you intentionally combine modes — see priority):

```json
"list": {
  "offset": { "query": "offset", "default": 0 },
  "limit": { "query": "limit", "default": 10, "max": 100 },
  "sort": { "query": "sort", "default": "id" },
  "order": { "query": "order", "default": "asc" }
}
```

#### Cursor / keyset mode (Stripe-style)

A **cursor** is an opaque bookmark (“continue after this item”), not a page number.

```json
"list": {
  "cursor": {
    "query": "starting_after",
    "limit": { "query": "limit", "default": 10, "max": 100 }
  },
  "sort": { "query": "sort", "default": "-meta.score", "fields": ["meta.score", "id"] }
}
```

| Form | Effect |
|------|--------|
| `"cursor": true` | Query name `cursor`; limit query `limit` (default `10`, max `100`) |
| `"cursor": { "query", "limit" }` | Custom query names / defaults |

- Token is **base64url** JSON of sort values + primary `key` values (stable tie-break). Nested sort paths (e.g. `meta.score`) are included the same way as top-level fields.
- Request: `?starting_after=<token>&limit=10` (names from config).
- Response placeholders: `{{nextCursor}}`, `{{hasMore}}`, and `{{next}}` (URL with the next cursor).
- There is no `ending_before` (forward-only).
- Invalid / empty / mismatched cursor → `400`.

#### Which pagination mode runs?

When several styles are configured:

1. **Page** if `page` / `pageSize` (or a `pageSize` alias) appear in the query, **or** neither offset nor cursor params are present and page config exists (page is the default when configured).
2. Else **offset** if `offset` / `limit` appear, **or** offset is configured and cursor is not.
3. Else **cursor** if `store.list.cursor` is configured.
4. If only `cursor` is configured (no page/offset), cursor mode is used (page defaults are **not** injected).

Example config with **all three** modes (use distinct limit query names so they do not collide):

```json
"list": {
  "page": { "query": "page", "default": 1 },
  "pageSize": { "query": "pageSize", "default": 2, "max": 10 },
  "offset": { "query": "offset", "default": 0 },
  "limit": { "query": "limit", "default": 2, "max": 10 },
  "cursor": {
    "query": "starting_after",
    "limit": { "query": "cursorLimit", "default": 2, "max": 10 }
  },
  "sort": { "query": "sort", "default": "id", "fields": ["id"] }
}
```

| Request | Mode that runs | Why |
|---------|----------------|-----|
| `(none)` | **page** | No offset/cursor params → page default |
| `?offset=2` | **offset** | Offset param present; no page params |
| `?page=2&offset=0` | **page** | Page wins over offset |
| `?starting_after=<token>` | **cursor** | Cursor param present; no page/offset |
| `?offset=1&starting_after=<token>` | **offset** | Offset wins over cursor |
| `?starting_after=%%%` | **400** | Invalid cursor token |

Try:

```bash
# Default → page (look for page= / {{page}} in the envelope)
curl -s 'http://localhost:3000/api/mixed'

# Offset mode
curl -s 'http://localhost:3000/api/mixed?offset=2'

# Page wins when both are present
curl -s 'http://localhost:3000/api/mixed?page=2&offset=0'

# Cursor mode (token from a previous {{nextCursor}} / keyset bookmark)
curl -s "http://localhost:3000/api/mixed?starting_after=${TOKEN}"

# Offset wins over cursor
curl -s "http://localhost:3000/api/mixed?offset=1&starting_after=${TOKEN}"

# Bad cursor → 400
curl -si 'http://localhost:3000/api/mixed?starting_after=placeholder'
```

Tip: avoid giving `pageSize` the alias `limit` if the same store also defines offset `limit` — prefer `pageSize` + `limit` + `cursorLimit` as separate names.

#### Filters / search

Opt-in under `store.list.filter`. Only runs for `action: "list"`.  
Rules read **query params**; if a rule’s query param is omitted, that rule is skipped (no error).

**Shapes**

| Shape | Example | Meaning |
|-------|---------|---------|
| String array | `"filter": ["status", "role"]` | AND equality; each string = `{ field, op: "eq", query: <same name> }` |
| Object | `"filter": { "fields?", "or?", "search?" }` | Full control; must include at least one of `fields`, `or`, `search` |

**Rule object**

```json
{ "field": "price", "op": "gte", "query": "minPrice" }
```

| Property | Required | Default | Meaning |
|----------|----------|---------|---------|
| `field` | yes | — | Item path (supports dots: `meta.region`) |
| `op` | no | `"eq"` | Operator (see table below) |
| `query` | no | same as `field` | Query param name that supplies the compare value |

String shorthand inside `fields` / `or`:

```json
"status"
```

is equivalent to:

```json
{ "field": "status", "op": "eq", "query": "status" }
```

**Operators (`op`)**

| `op` | Query example | Keeps item when… | Notes |
|------|---------------|------------------|--------|
| `eq` | `?status=active` | `String(value) === query` | Default; missing/`null` field → drop |
| `ne` | `?excludeStatus=draft` | value ≠ query | Missing/`null` field → **keep** |
| `gt` | `?gtPrice=20` | value > N | Query must be a number → else `400` |
| `gte` | `?minPrice=10` | value ≥ N | Same |
| `lt` | `?ltPrice=10` | value < N | Same |
| `lte` | `?maxPrice=30` | value ≤ N | Same |
| `in` | `?tag=a,b` or `?tag=a&tag=b` | `String(value)` ∈ list | CSV and/or repeated params; empty list → `400` |

Numeric ops coerce the query with `Number(...)`. Item values use the same compare rules as sort (numbers, numeric strings, then locale string compare).

**Nested paths**

`field` (and `search.fields`, and `sort` fields) may use `.` to walk objects:

```json
{ "id": 1, "meta": { "region": "eu" } }
```

```json
{ "field": "meta.region", "op": "eq", "query": "region" }
```

`?region=eu` keeps that item. Missing intermediate keys → value is `undefined` (fails `eq` / range / `in`; passes `ne`).

The same dotted paths work in `?sort=meta.region` and in cursor bookmarks when the active sort uses them.

**`fields` (AND)**

Every rule whose query param is present must match.

```json
"fields": [
  "status",
  { "field": "price", "op": "gte", "query": "minPrice" },
  { "field": "price", "op": "lte", "query": "maxPrice" }
]
```

`?status=active&minPrice=10&maxPrice=30` → active **and** `10 ≤ price ≤ 30`.

**`or` (OR among present params)**

Same rule shape as `fields`. After AND rules:

1. Collect `or` rules whose query param is present (and valid).
2. If that set is empty → skip OR (no extra filtering).
3. Else keep items that match **at least one** of those rules.

```json
"or": [
  { "field": "status", "op": "eq", "query": "anyStatus" },
  { "field": "meta.region", "op": "eq", "query": "anyRegion" }
]
```

| Request | Effect |
|---------|--------|
| (neither param) | OR ignored |
| `?anyStatus=draft` | status is `draft` |
| `?anyRegion=latam` | `meta.region` is `latam` |
| `?anyStatus=draft&anyRegion=latam` | draft **or** latam |

**`search` (text)**

```json
"search": { "query": "q", "fields": ["name", "meta.region"] }
```

| Option | Default | Behavior |
|--------|---------|----------|
| `query` | `"q"` | Query param with the search term |
| `fields` | required | Case-insensitive **substring** match; item kept if **any** field matches |

Empty / omitted search term → search skipped. Nested paths allowed in `fields`.

**Full example**

```json
"list": {
  "page": { "query": "page", "default": 1 },
  "pageSize": { "query": "pageSize", "default": 10, "max": 50, "aliases": ["limit"] },
  "sort": { "query": "sort", "default": "id", "fields": ["id", "name", "price", "meta.region"] },
  "filter": {
    "fields": [
      "status",
      { "field": "price", "op": "gte", "query": "minPrice" },
      { "field": "price", "op": "lte", "query": "maxPrice" },
      { "field": "price", "op": "gt", "query": "gtPrice" },
      { "field": "price", "op": "lt", "query": "ltPrice" },
      { "field": "status", "op": "ne", "query": "excludeStatus" },
      { "field": "name", "op": "in", "query": "name" },
      { "field": "meta.region", "op": "eq", "query": "region" }
    ],
    "or": [
      { "field": "status", "op": "eq", "query": "anyStatus" },
      { "field": "meta.region", "op": "eq", "query": "anyRegion" }
    ],
    "search": { "query": "q", "fields": ["name", "meta.region"] }
  }
}
```

Try (happy path):

```bash
# AND equality + range
curl -s 'http://localhost:3000/api/products?status=active&minPrice=10&maxPrice=30'

# Exclusive bounds
curl -s 'http://localhost:3000/api/products?gtPrice=20&ltPrice=40'

# Not equal
curl -s 'http://localhost:3000/api/products?excludeStatus=draft'

# Membership (CSV or repeated)
curl -s 'http://localhost:3000/api/products?name=Alpha,Charlie'
curl -s 'http://localhost:3000/api/products?name=Alpha&name=Echo'

# Nested path (match)
curl -s 'http://localhost:3000/api/products?region=eu'

# Nested sort
curl -s 'http://localhost:3000/api/products?sort=meta.region&order=asc&pageSize=10'

# Nested path (no match) → empty page, total 0 (not an error)
curl -s 'http://localhost:3000/api/products?region=antarctica'

# OR omitted → no OR filtering (full list subject to other rules)
curl -s 'http://localhost:3000/api/products?pageSize=10'

# OR single / multi
curl -s 'http://localhost:3000/api/products?anyRegion=eu'
curl -s 'http://localhost:3000/api/products?anyStatus=draft&anyRegion=latam'

# Text search
curl -s 'http://localhost:3000/api/products?q=cha'
```

Try (sad path → `400`):

```bash
# Non-numeric compare ops
curl -si 'http://localhost:3000/api/products?minPrice=abc'
curl -si 'http://localhost:3000/api/products?maxPrice=nan'
curl -si 'http://localhost:3000/api/products?gtPrice=x'

# Present but empty string
curl -si 'http://localhost:3000/api/products?ltPrice='
curl -si 'http://localhost:3000/api/products?status='

# in with no values after split/trim
curl -si 'http://localhost:3000/api/products?name='

# Example bodies:
# { "message": "Query \"minPrice\" must be a number" }
# { "message": "Query \"status\" must not be empty" }
# { "message": "Query \"name\" must not be empty" }
```

**Filter evaluation order**

1. Route `key` params (outside `filter`, always on)
2. `fields` — AND of present rules
3. `or` — if any OR query present, OR of those rules
4. `search` — if term non-empty
5. Then sort → pagination

`{{total}}` (and `X-Total-Count` if you template it) is the count **after** all filters, **before** pagination.

**Runtime `400` from filters**

| Condition | Try | Example message |
|-----------|-----|-----------------|
| `gt` / `gte` / `lt` / `lte` not a number | `?minPrice=abc` | `Query "minPrice" must be a number` |
| Present but empty string | `?status=` | `Query "status" must not be empty` |
| `in` present but no values after split/trim | `?name=` | `Query "name" must not be empty` |

Omitted params are **not** errors (rule skipped). Unknown region / no matches → `200` with empty `items` and `total: 0`.

**Startup validation (filter)**

- Top-level `filter` must be a non-empty string array **or** an object.
- Object keys only: `fields`, `or`, `search`.
- `fields` / `or`: non-empty array of strings or `{ field, op?, query? }`.
- `op` must be one of: `eq`, `ne`, `gt`, `gte`, `lt`, `lte`, `in`.
- Object must include at least one of `fields`, `or`, `search`.

Invalid shapes (server refuses to start):

```json
"filter": { "fields": [{ "field": "price", "op": "between" }] }
```

→ `The "store.list.filter.fields[0].op" must be one of: eq, ne, gt, gte, lt, lte, in`

```json
"filter": { "or": [] }
```

→ `The "store.list.filter.or" must be a non-empty array of strings or field objects`

```json
"filter": { "or": [{ "op": "eq", "query": "status" }] }
```

→ `The "store.list.filter.or[0].field" must be a non-empty string`

#### Multi-sort

`sort` accepts one or more comma-separated fields (including nested paths like `meta.region`). If `sort.fields` is set, every field must be in that whitelist.

| Form | Example | Effect |
|------|---------|--------|
| Field + `order` | `?sort=name&order=desc` | Single field; direction from `order` |
| Signed prefix | `?sort=-price,+name` | `price` desc, then `name` asc (`+` optional for asc) |
| Explicit | `?sort=price:desc,name:asc` | Same, per-field direction |
| Nested | `?sort=meta.region&order=asc` | Sort by dotted path |
| Default expression | `"default": "-meta.score"` in config | Used when the client omits `sort` |

`{{sort}}` echoes the active sort string. `{{order}}` is the direction of the **first** sort field.

#### Runtime errors (`400`)

Invalid integers / out of range for `page`, `pageSize`, `offset`, `limit`; invalid `order`; sort field outside whitelist; invalid cursor; non-numeric `gt`/`gte`/`lt`/`lte`; empty `in` / empty filter query →:

```json
{ "message": "Query \"sort\" field must be one of: id, name, price, meta.region" }
```

(Exact message depends on the failing query.)

#### Response templates (fully customizable)

On `action: "list"`, `body` and header **values** are templates.  
Exact string `"{{items}}"` / `"{{total}}"` / … is replaced by the typed value (`array` / `number` / `null` / …).  
Placeholders embedded in a longer string are stringified.

| Placeholder | Type | Meaning |
|-------------|------|---------|
| `{{items}}` | array | Current page/slice |
| `{{total}}` | number | Count after filters |
| `{{page}}` / `{{pageSize}}` | number | Page mode meta |
| `{{offset}}` / `{{limit}}` | number | Offset (and cursor limit) meta |
| `{{totalPages}}` | number | `ceil(total / pageSize)` (page mode) |
| `{{sort}}` / `{{order}}` | string | Active sort string / first direction |
| `{{self}}` | string | Absolute URL of the current request |
| `{{next}}` / `{{previous}}` | string \| `null` | Absolute URLs for neighbors |
| `{{hasNext}}` / `{{hasPrevious}}` | boolean | Neighbor flags |
| `{{linkHeader}}` | string | RFC 5988 `Link` (`rel="next"` / `rel="prev"`) |
| `{{nextCursor}}` | string \| `null` | Opaque cursor for the next page (cursor mode) |
| `{{hasMore}}` | boolean | Same as `hasNext` (handy alias for cursor-style envelopes) |

Without a `body` template → JSON array of items (already filtered/sorted/paginated).  
`body` on `list` does **not** emit the “body ignored” warning (unlike other actions).

**Page envelope + `Link` header**

```json
{
  "name": "list",
  "statusCode": 200,
  "action": "list",
  "headers": {
    "X-Total-Count": "{{total}}",
    "Link": "{{linkHeader}}"
  },
  "body": {
    "data": "{{items}}",
    "page": "{{page}}",
    "pageSize": "{{pageSize}}",
    "total": "{{total}}",
    "next": "{{next}}",
    "previous": "{{previous}}"
  }
}
```

**Offset / Django-like**

```json
{
  "name": "list",
  "statusCode": 200,
  "action": "list",
  "body": {
    "results": "{{items}}",
    "next": "{{next}}",
    "previous": "{{previous}}",
    "meta": {
      "count": "{{total}}",
      "offset": "{{offset}}",
      "limit": "{{limit}}"
    }
  }
}
```

**Cursor / Stripe-like**

```json
{
  "name": "list",
  "statusCode": 200,
  "action": "list",
  "body": {
    "data": "{{items}}",
    "has_more": "{{hasMore}}",
    "next_cursor": "{{nextCursor}}",
    "next": "{{next}}"
  }
}
```

### Out of scope

Not implemented (do not expect these):

- Case-insensitive / trimmed unique comparison  
- Expand deeper than 3 hops / GraphQL-style field selection on embeds  
- HTTP admin routes to reset stores (use `--reset-store` or delete the snapshot file)  
- Re-implementing `request` rules inside `store`

### Example A — Simple (notes CRUD)

Minimal list/create/get/delete. Empty seed; `id` auto-increments; titles unique; optional persist.

```json
{
  "api/notes": {
    "store": {
      "id": "notes",
      "key": "id",
      "seed": [],
      "template": { "id": 0, "title": "", "done": false },
      "unique": ["title"],
      "persist": true
    },
    "GET": {
      "nameResponse": "list",
      "responses": [
        { "name": "list", "statusCode": 200, "action": "list" }
      ]
    },
    "POST": {
      "nameResponse": "create",
      "responses": [
        { "name": "create", "statusCode": 201, "action": "create" }
      ]
    }
  },
  "api/notes/:id": {
    "store": { "id": "notes" },
    "GET": {
      "nameResponse": "get",
      "responses": [
        { "name": "get", "statusCode": 200, "action": "get" }
      ]
    },
    "DELETE": {
      "nameResponse": "remove",
      "responses": [
        { "name": "remove", "statusCode": 204, "action": "delete" }
      ]
    }
  }
}
```

Try:

```bash
curl -s http://localhost:3000/api/notes
curl -s -X POST http://localhost:3000/api/notes -H 'Content-Type: application/json' -d '{"title":"Buy milk"}'
curl -s http://localhost:3000/api/notes/1
curl -s -X DELETE http://localhost:3000/api/notes/1 -o /dev/null -w '%{http_code}\n'
```

### Example B — Complex (multi-tenant users)

Composite key, template defaults, request validation, custom conflict bodies, shared store across collection + item routes, `list` filtered by `:tenantId`.

```json
{
  "api/:tenantId/users": {
    "store": {
      "id": "users",
      "key": {
        "fields": ["tenantId", "id"],
        "conflict": { "response": "duplicate-key" }
      },
      "seed": [
        {
          "tenantId": "acme",
          "id": 1,
          "name": "Juan",
          "email": "juan@acme.com",
          "username": "juan",
          "active": true
        }
      ],
      "template": {
        "tenantId": "",
        "id": 0,
        "name": "",
        "email": "",
        "username": "",
        "active": true
      },
      "unique": {
        "fields": ["email", "username"],
        "conflict": {
          "response": "duplicate-fields",
          "detail": { "campo": "{{field}}", "valor": "{{value}}" }
        }
      }
    },
    "GET": {
      "nameResponse": "list",
      "responses": [
        { "name": "list", "statusCode": 200, "action": "list" }
      ]
    },
    "POST": {
      "nameResponse": "create",
      "request": {
        "body": {
          "name": { "type": "string", "minLength": 2 },
          "email": { "type": "string", "format": "email" },
          "username": { "type": "string", "minLength": 3 }
        },
        "invalidResponse": "validation-error"
      },
      "responses": [
        {
          "name": "validation-error",
          "statusCode": 400,
          "body": { "code": "VALIDATION_ERROR", "message": "Invalid request" }
        },
        {
          "name": "duplicate-fields",
          "statusCode": 409,
          "body": { "ok": false, "code": "DUPLICATE", "errores": "{{conflicts}}" }
        },
        {
          "name": "duplicate-key",
          "statusCode": 409,
          "body": { "code": "DUPLICATE_KEY", "message": "Id already exists for tenant" }
        },
        { "name": "create", "statusCode": 201, "action": "create" }
      ]
    }
  },
  "api/:tenantId/users/:id": {
    "store": { "id": "users" },
    "GET": {
      "nameResponse": "get",
      "responses": [
        { "name": "get", "statusCode": 200, "action": "get" }
      ]
    },
    "PATCH": {
      "nameResponse": "patch",
      "responses": [
        {
          "name": "duplicate-fields",
          "statusCode": 409,
          "body": { "ok": false, "code": "DUPLICATE", "errores": "{{conflicts}}" }
        },
        {
          "name": "duplicate-key",
          "statusCode": 409,
          "body": { "code": "DUPLICATE_KEY", "message": "Id already exists for tenant" }
        },
        { "name": "patch", "statusCode": 200, "action": "patch" }
      ]
    },
    "DELETE": {
      "nameResponse": "remove",
      "responses": [
        { "name": "remove", "statusCode": 204, "action": "delete" }
      ]
    }
  }
}
```

Behavior:

- `GET /api/acme/users` → only users with `tenantId: "acme"`  
- `POST /api/acme/users` with body `{ "name", "email", "username" }` → `tenantId` from params, next numeric `id`, `active: true` from template  
- Duplicate email/username → `409` with `errores` shaped by `detail`  
- Invalid email format → `400` from `request` (store never runs)

### Example C — Real project: Todo / notes app

Typical SPA: list, create with validation, toggle done (`patch`), delete. Persist so a browser refresh after server restart still sees data.

```json
{
  "api/todos": {
    "store": {
      "id": "todos",
      "seed": [
        { "id": 1, "title": "Ship landing page", "done": false },
        { "id": 2, "title": "Write README", "done": true }
      ],
      "template": { "id": 0, "title": "", "done": false },
      "unique": {
        "fields": ["title"],
        "conflict": {
          "response": "duplicate-title",
          "detail": { "field": "{{field}}", "value": "{{value}}" }
        }
      },
      "persist": true
    },
    "GET": {
      "nameResponse": "list",
      "responses": [
        { "name": "list", "statusCode": 200, "action": "list" }
      ]
    },
    "POST": {
      "nameResponse": "create",
      "request": {
        "body": {
          "title": { "type": "string", "minLength": 1, "maxLength": 120 }
        },
        "invalidResponse": "validation-error"
      },
      "responses": [
        {
          "name": "validation-error",
          "statusCode": 422,
          "body": { "message": "Invalid todo", "errors": [] }
        },
        {
          "name": "duplicate-title",
          "statusCode": 409,
          "body": { "code": "TITLE_TAKEN", "conflicts": "{{conflicts}}" }
        },
        { "name": "create", "statusCode": 201, "action": "create" }
      ]
    }
  },
  "api/todos/:id": {
    "store": { "id": "todos" },
    "PATCH": {
      "nameResponse": "patch",
      "request": {
        "body": {
          "title?": { "type": "string", "minLength": 1, "maxLength": 120 },
          "done?": { "type": "boolean" }
        },
        "invalidResponse": "validation-error"
      },
      "responses": [
        {
          "name": "validation-error",
          "statusCode": 422,
          "body": { "message": "Invalid patch", "errors": [] }
        },
        {
          "name": "duplicate-title",
          "statusCode": 409,
          "body": { "code": "TITLE_TAKEN", "conflicts": "{{conflicts}}" }
        },
        { "name": "patch", "statusCode": 200, "action": "patch" }
      ]
    },
    "DELETE": {
      "nameResponse": "remove",
      "responses": [
        { "name": "remove", "statusCode": 204, "action": "delete" }
      ]
    }
  }
}
```

Frontend flow: load board → `POST` new todo → `PATCH` `{ "done": true }` → `DELETE` when archived. Snapshot: `.store/todos.json` under the mock files root.

### Example D — Real project: SaaS projects board

Org-scoped projects with slug uniqueness, forbidden org via `match`, persist across restarts. Pattern used by project-management / B2B dashboards.

```json
{
  "api/orgs/:orgId/projects": {
    "store": {
      "id": "projects",
      "key": {
        "fields": ["orgId", "id"],
        "conflict": { "response": "duplicate-key" }
      },
      "seed": [
        {
          "orgId": "org_acme",
          "id": 1,
          "name": "Website Redesign",
          "slug": "website",
          "status": "active",
          "ownerEmail": "lead@acme.com"
        }
      ],
      "template": {
        "orgId": "",
        "id": 0,
        "name": "",
        "slug": "",
        "status": "active",
        "ownerEmail": ""
      },
      "unique": {
        "fields": [
          {
            "field": "slug",
            "conflict": {
              "response": "slug-taken",
              "detail": { "field": "{{field}}", "value": "{{value}}" }
            }
          }
        ],
        "conflict": {
          "response": "duplicate-fields",
          "detail": { "campo": "{{field}}", "valor": "{{value}}" }
        }
      },
      "persist": true
    },
    "GET": {
      "nameResponse": "list",
      "responses": [
        {
          "name": "forbidden-org",
          "statusCode": 403,
          "match": { "params": { "orgId": "org_blocked" } },
          "body": { "code": "ORG_FORBIDDEN", "message": "You cannot access this organization" }
        },
        { "name": "list", "statusCode": 200, "action": "list" }
      ]
    },
    "POST": {
      "nameResponse": "create",
      "request": {
        "body": {
          "name": { "type": "string", "minLength": 3, "maxLength": 80 },
          "slug": {
            "type": "string",
            "minLength": 2,
            "maxLength": 40,
            "pattern": "^[a-z0-9]+(?:-[a-z0-9]+)*$"
          },
          "ownerEmail": { "type": "string", "format": "email" },
          "status?": { "type": "string", "enum": ["active", "paused"] }
        },
        "invalidResponse": "validation-error"
      },
      "responses": [
        {
          "name": "forbidden-org",
          "statusCode": 403,
          "match": { "params": { "orgId": "org_blocked" } },
          "body": { "code": "ORG_FORBIDDEN" }
        },
        {
          "name": "validation-error",
          "statusCode": 422,
          "body": { "message": "Invalid project", "errors": [] }
        },
        {
          "name": "slug-taken",
          "statusCode": 409,
          "body": { "code": "SLUG_TAKEN", "conflicts": "{{conflicts}}" }
        },
        {
          "name": "duplicate-fields",
          "statusCode": 409,
          "body": { "code": "DUPLICATE", "errores": "{{conflicts}}" }
        },
        {
          "name": "duplicate-key",
          "statusCode": 409,
          "body": { "code": "DUPLICATE_KEY" }
        },
        { "name": "create", "statusCode": 201, "action": "create" }
      ]
    }
  },
  "api/orgs/:orgId/projects/:id": {
    "store": { "id": "projects" },
    "GET": {
      "nameResponse": "get",
      "responses": [
        { "name": "get", "statusCode": 200, "action": "get" }
      ]
    },
    "PATCH": {
      "nameResponse": "patch",
      "responses": [
        {
          "name": "slug-taken",
          "statusCode": 409,
          "body": { "code": "SLUG_TAKEN", "conflicts": "{{conflicts}}" }
        },
        {
          "name": "duplicate-fields",
          "statusCode": 409,
          "body": { "code": "DUPLICATE", "errores": "{{conflicts}}" }
        },
        {
          "name": "duplicate-key",
          "statusCode": 409,
          "body": { "code": "DUPLICATE_KEY" }
        },
        { "name": "patch", "statusCode": 200, "action": "patch" }
      ]
    },
    "DELETE": {
      "nameResponse": "remove",
      "responses": [
        { "name": "remove", "statusCode": 204, "action": "delete" }
      ]
    }
  }
}
```

- `GET /api/orgs/org_acme/projects` → store `list` filtered by `orgId`  
- `GET /api/orgs/org_blocked/projects` → static `403` via `match` (no store)  
- Duplicate `slug` alone → `slug-taken`; other unique clashes → `duplicate-fields`

### Example E — Real project: E-commerce catalog

Admin catalog + checkout resilience: `store` + `store.list` (page, multi-sort, **advanced filters**, search, `Link`) + `request` + `unique` SKU + `persist` + `match` (featured / maintenance / archive) + `delay` + custom headers.

Filter permutation focus: `eq` / `ne` / `gt` / `lt` / `gte` / `lte` / `in` + nested `warehouse.code` + `or` (warehouse **or** category) + search.

```json
{
  "api/catalog/products": {
    "store": {
      "id": "catalog-products",
      "key": "id",
      "seed": [
        {
          "id": 1,
          "sku": "SKU-TEA-001",
          "name": "Green Tea",
          "category": "beverages",
          "price": 12.5,
          "stock": 40,
          "status": "active",
          "warehouse": { "code": "WH-EU", "zone": "A" }
        },
        {
          "id": 2,
          "sku": "SKU-MUG-010",
          "name": "Ceramic Mug",
          "category": "home",
          "price": 18,
          "stock": 12,
          "status": "active",
          "warehouse": { "code": "WH-US", "zone": "B" }
        }
      ],
      "template": {
        "id": 0,
        "sku": "",
        "name": "",
        "category": "home",
        "price": 0,
        "stock": 0,
        "status": "draft",
        "warehouse": { "code": "", "zone": "" }
      },
      "unique": {
        "fields": [
          {
            "field": "sku",
            "conflict": {
              "response": "sku-taken",
              "detail": { "field": "{{field}}", "value": "{{value}}" }
            }
          }
        ],
        "conflict": {
          "response": "duplicate-fields",
          "detail": { "field": "{{field}}", "value": "{{value}}" }
        }
      },
      "persist": true,
      "list": {
        "page": { "query": "page", "default": 1 },
        "pageSize": {
          "query": "pageSize",
          "default": 3,
          "max": 50,
          "aliases": ["limit"]
        },
        "sort": {
          "query": "sort",
          "default": "id",
          "fields": ["id", "name", "price", "stock"]
        },
        "order": { "query": "order", "default": "asc" },
        "filter": {
          "fields": [
            "status",
            "category",
            { "field": "price", "op": "gte", "query": "minPrice" },
            { "field": "price", "op": "lte", "query": "maxPrice" },
            { "field": "stock", "op": "gt", "query": "minStock" },
            { "field": "stock", "op": "lt", "query": "maxStock" },
            { "field": "status", "op": "ne", "query": "excludeStatus" },
            { "field": "category", "op": "in", "query": "categories" },
            { "field": "warehouse.code", "op": "eq", "query": "warehouse" }
          ],
          "or": [
            { "field": "warehouse.code", "op": "eq", "query": "anyWarehouse" },
            { "field": "category", "op": "eq", "query": "anyCategory" }
          ],
          "search": {
            "query": "q",
            "fields": ["name", "sku", "warehouse.code"]
          }
        }
      }
    },
    "GET": {
      "nameResponse": "list",
      "responses": [
        {
          "name": "maintenance",
          "statusCode": 503,
          "match": { "query": { "mode": "maintenance" } },
          "delay": 200,
          "headers": { "Retry-After": "30", "X-Catalog": "down" },
          "body": {
            "code": "CATALOG_MAINTENANCE",
            "message": "Catalog temporarily unavailable"
          }
        },
        {
          "name": "featured-static",
          "statusCode": 200,
          "match": { "query": { "view": "featured" } },
          "headers": {
            "X-View": "featured",
            "Cache-Control": "public, max-age=60"
          },
          "body": {
            "view": "featured",
            "items": [
              { "sku": "SKU-TEA-001", "badge": "bestseller" }
            ]
          }
        },
        {
          "name": "list",
          "statusCode": 200,
          "action": "list",
          "delay": 80,
          "headers": {
            "X-Total-Count": "{{total}}",
            "Link": "{{linkHeader}}",
            "X-Catalog": "store"
          },
          "body": {
            "data": "{{items}}",
            "page": "{{page}}",
            "pageSize": "{{pageSize}}",
            "total": "{{total}}",
            "totalPages": "{{totalPages}}",
            "sort": "{{sort}}",
            "order": "{{order}}",
            "next": "{{next}}",
            "previous": "{{previous}}",
            "hasNext": "{{hasNext}}",
            "hasPrevious": "{{hasPrevious}}"
          }
        }
      ]
    },
    "POST": {
      "nameResponse": "create",
      "request": {
        "body": {
          "sku": {
            "type": "string",
            "minLength": 5,
            "maxLength": 32,
            "pattern": "^SKU-[A-Z0-9]+-[0-9]{3}$"
          },
          "name": { "type": "string", "minLength": 2, "maxLength": 80 },
          "category": {
            "type": "string",
            "enum": ["beverages", "home", "grocery"]
          },
          "price": { "type": "number", "min": 0.01, "max": 9999 },
          "stock?": { "type": "number", "min": 0, "max": 100000 },
          "status?": { "type": "string", "enum": ["active", "draft"] }
        },
        "invalidResponse": "validation-error"
      },
      "responses": [
        {
          "name": "validation-error",
          "statusCode": 422,
          "body": {
            "code": "VALIDATION_ERROR",
            "message": "Invalid product payload",
            "errors": []
          }
        },
        {
          "name": "sku-taken",
          "statusCode": 409,
          "body": { "code": "SKU_TAKEN", "conflicts": "{{conflicts}}" }
        },
        {
          "name": "duplicate-fields",
          "statusCode": 409,
          "body": { "code": "DUPLICATE", "conflicts": "{{conflicts}}" }
        },
        { "name": "create", "statusCode": 201, "action": "create" }
      ]
    }
  },
  "api/catalog/products/:id": {
    "store": { "id": "catalog-products" },
    "GET": {
      "nameResponse": "get",
      "responses": [{ "name": "get", "statusCode": 200, "action": "get" }]
    },
    "PATCH": {
      "nameResponse": "patch",
      "request": {
        "body": {
          "name?": { "type": "string", "minLength": 2, "maxLength": 80 },
          "price?": { "type": "number", "min": 0.01, "max": 9999 },
          "stock?": { "type": "number", "min": 0, "max": 100000 },
          "status?": {
            "type": "string",
            "enum": ["active", "draft", "archived"]
          }
        },
        "invalidResponse": "validation-error"
      },
      "responses": [
        {
          "name": "validation-error",
          "statusCode": 422,
          "body": {
            "code": "VALIDATION_ERROR",
            "message": "Invalid product patch",
            "errors": []
          }
        },
        {
          "name": "discontinued-static",
          "statusCode": 409,
          "match": { "body": { "status": "archived" } },
          "body": {
            "code": "USE_ARCHIVE_ENDPOINT",
            "message": "Archive products via DELETE, not PATCH status=archived"
          }
        },
        {
          "name": "sku-taken",
          "statusCode": 409,
          "body": { "code": "SKU_TAKEN", "conflicts": "{{conflicts}}" }
        },
        { "name": "patch", "statusCode": 200, "action": "patch" }
      ]
    },
    "DELETE": {
      "nameResponse": "remove",
      "responses": [{ "name": "remove", "statusCode": 204, "action": "delete" }]
    }
  },
  "api/catalog/checkout": {
    "POST": {
      "nameResponse": "paid",
      "request": {
        "body": {
          "sku": { "type": "string", "minLength": 5 },
          "quantity": { "type": "number", "min": 1, "max": 20 },
          "cardLast4": { "type": "string", "pattern": "^[0-9]{4}$" }
        },
        "invalidResponse": "validation-error"
      },
      "responses": [
        {
          "name": "validation-error",
          "statusCode": 422,
          "body": {
            "code": "VALIDATION_ERROR",
            "message": "Invalid checkout",
            "errors": []
          }
        },
        {
          "name": "payment-required",
          "statusCode": 402,
          "match": { "body": { "cardLast4": "0000" } },
          "delay": 150,
          "body": { "code": "PAYMENT_REQUIRED", "message": "Card declined" }
        },
        {
          "name": "rate-limited",
          "statusCode": 429,
          "match": { "body": { "cardLast4": "4290" } },
          "headers": { "Retry-After": "5" },
          "body": {
            "code": "RATE_LIMITED",
            "message": "Too many checkout attempts"
          }
        },
        {
          "name": "paid",
          "statusCode": 201,
          "delay": 120,
          "body": { "orderId": "ord_demo_1", "status": "paid" }
        }
      ]
    }
  }
}
```

Try:

```bash
# Paginated catalog (Link + X-Total-Count)
curl -si 'http://localhost:3000/api/catalog/products?page=1&pageSize=3'

# Filters + search + multi-sort
curl -s 'http://localhost:3000/api/catalog/products?status=active&category=home&q=mug&sort=price:desc,name:asc'

# Range + ne + in + nested warehouse
curl -s 'http://localhost:3000/api/catalog/products?minPrice=12&maxPrice=22&excludeStatus=draft&pageSize=10'
curl -s 'http://localhost:3000/api/catalog/products?minStock=0&categories=home,grocery&pageSize=10'
curl -s 'http://localhost:3000/api/catalog/products?warehouse=WH-EU&status=active&pageSize=10'

# OR: warehouse OR category
curl -s 'http://localhost:3000/api/catalog/products?anyWarehouse=WH-LATAM&anyCategory=grocery&pageSize=10'

# Static branches via match
curl -si 'http://localhost:3000/api/catalog/products?view=featured'
curl -si 'http://localhost:3000/api/catalog/products?mode=maintenance'

# Create (422 invalid / 409 SKU / 201 ok)
curl -s -X POST http://localhost:3000/api/catalog/products \
  -H 'Content-Type: application/json' \
  -d '{"sku":"SKU-NEW-099","name":"Matcha Kit","category":"beverages","price":15,"status":"active"}'

# Checkout resilience
curl -si -X POST http://localhost:3000/api/catalog/checkout \
  -H 'Content-Type: application/json' \
  -d '{"sku":"SKU-TEA-001","quantity":1,"cardLast4":"0000"}'
```

| Feature | Where it shows up |
|---------|-------------------|
| `store` + `action` | CRUD on `/api/catalog/products` |
| `store.list` | Page envelope, multi-sort, `{{linkHeader}}` |
| Filter ops | `gte`/`lte` price, `gt`/`lt` stock, `ne`, `in` categories, nested `warehouse.code` |
| `or` | `anyWarehouse` **or** `anyCategory` |
| `search` | `q` over name / sku / warehouse code |
| `request` | POST/PATCH product + checkout body rules |
| `unique` | Duplicate `sku` → `409 SKU_TAKEN` |
| `persist` | Catalog survives restart (`--reset-store` to wipe) |
| `match` + `delay` | Featured view, maintenance `503`, archive guard, checkout `402`/`429` |

### Example F — Real project: Multi-tenant helpdesk

Tenant-scoped tickets (page list) + activity feed (cursor): composite keys, `store.list`, **advanced filters**, `request`, `unique`, `persist`, `match` (`403` / `401`), `delay`.

Filter permutation focus: date range on `createdAt`, nested `channel.source` / `channel.sla`, `ne` / `in`, `or` (assignee **or** priority), search.

```json
{
  "api/tenants/:tenantId/tickets": {
    "store": {
      "id": "helpdesk-tickets",
      "key": {
        "fields": ["tenantId", "id"],
        "conflict": { "response": "duplicate-key" }
      },
      "seed": [
        {
          "tenantId": "acme",
          "id": 1,
          "subject": "Cannot login",
          "priority": "high",
          "status": "open",
          "assignee": "alice@acme.com",
          "createdAt": 1700000001,
          "channel": { "source": "email", "sla": 4 }
        },
        {
          "tenantId": "acme",
          "id": 2,
          "subject": "Invoice PDF broken",
          "priority": "medium",
          "status": "pending",
          "assignee": "bob@acme.com",
          "createdAt": 1700000002,
          "channel": { "source": "chat", "sla": 8 }
        },
        {
          "tenantId": "globex",
          "id": 1,
          "subject": "API key rotation",
          "priority": "high",
          "status": "open",
          "assignee": "dan@globex.com",
          "createdAt": 1700000101,
          "channel": { "source": "email", "sla": 4 }
        }
      ],
      "template": {
        "tenantId": "",
        "id": 0,
        "subject": "",
        "priority": "medium",
        "status": "open",
        "assignee": "",
        "createdAt": 0,
        "channel": { "source": "email", "sla": 8 }
      },
      "unique": {
        "fields": [
          {
            "field": "subject",
            "conflict": {
              "response": "subject-taken",
              "detail": { "field": "{{field}}", "value": "{{value}}" }
            }
          }
        ],
        "conflict": {
          "response": "duplicate-fields",
          "detail": { "field": "{{field}}", "value": "{{value}}" }
        }
      },
      "persist": true,
      "list": {
        "page": { "query": "page", "default": 1 },
        "pageSize": {
          "query": "pageSize",
          "default": 2,
          "max": 25,
          "aliases": ["limit"]
        },
        "sort": {
          "query": "sort",
          "default": "-createdAt",
          "fields": ["id", "priority", "createdAt", "status"]
        },
        "order": { "query": "order", "default": "desc" },
        "filter": {
          "fields": [
            "status",
            "priority",
            "assignee",
            { "field": "createdAt", "op": "gte", "query": "since" },
            { "field": "createdAt", "op": "lte", "query": "until" },
            { "field": "channel.sla", "op": "lt", "query": "maxSla" },
            { "field": "status", "op": "ne", "query": "excludeStatus" },
            { "field": "priority", "op": "in", "query": "priorities" },
            { "field": "channel.source", "op": "eq", "query": "channel" }
          ],
          "or": [
            { "field": "assignee", "op": "eq", "query": "anyAssignee" },
            { "field": "priority", "op": "eq", "query": "anyPriority" }
          ],
          "search": {
            "query": "q",
            "fields": ["subject", "assignee", "channel.source"]
          }
        }
      }
    },
    "GET": {
      "nameResponse": "inbox",
      "responses": [
        {
          "name": "forbidden-tenant",
          "statusCode": 403,
          "match": { "params": { "tenantId": "blocked" } },
          "body": {
            "code": "TENANT_FORBIDDEN",
            "message": "Your account cannot access this tenant"
          }
        },
        {
          "name": "unauthorized",
          "statusCode": 401,
          "match": { "query": { "auth": "missing" } },
          "headers": { "WWW-Authenticate": "Bearer" },
          "body": { "code": "UNAUTHORIZED", "message": "Login required" }
        },
        {
          "name": "inbox",
          "statusCode": 200,
          "action": "list",
          "delay": 60,
          "headers": {
            "X-Total-Count": "{{total}}",
            "Link": "{{linkHeader}}",
            "X-Tenant-Scope": "tickets"
          },
          "body": {
            "tickets": "{{items}}",
            "page": "{{page}}",
            "pageSize": "{{pageSize}}",
            "total": "{{total}}",
            "totalPages": "{{totalPages}}",
            "sort": "{{sort}}",
            "next": "{{next}}",
            "previous": "{{previous}}",
            "hasNext": "{{hasNext}}",
            "hasPrevious": "{{hasPrevious}}"
          }
        }
      ]
    },
    "POST": {
      "nameResponse": "create",
      "request": {
        "body": {
          "subject": { "type": "string", "minLength": 5, "maxLength": 120 },
          "priority": { "type": "string", "enum": ["low", "medium", "high"] },
          "assignee": { "type": "string", "format": "email" },
          "status?": {
            "type": "string",
            "enum": ["open", "pending", "closed"]
          },
          "createdAt?": { "type": "number", "min": 1 }
        },
        "invalidResponse": "validation-error"
      },
      "responses": [
        {
          "name": "forbidden-tenant",
          "statusCode": 403,
          "match": { "params": { "tenantId": "blocked" } },
          "body": { "code": "TENANT_FORBIDDEN" }
        },
        {
          "name": "validation-error",
          "statusCode": 422,
          "body": {
            "code": "VALIDATION_ERROR",
            "message": "Invalid ticket",
            "errors": []
          }
        },
        {
          "name": "subject-taken",
          "statusCode": 409,
          "body": { "code": "SUBJECT_TAKEN", "conflicts": "{{conflicts}}" }
        },
        {
          "name": "duplicate-key",
          "statusCode": 409,
          "body": { "code": "DUPLICATE_KEY" }
        },
        { "name": "create", "statusCode": 201, "action": "create" }
      ]
    }
  },
  "api/tenants/:tenantId/tickets/:id": {
    "store": { "id": "helpdesk-tickets" },
    "GET": {
      "nameResponse": "get",
      "responses": [
        {
          "name": "forbidden-tenant",
          "statusCode": 403,
          "match": { "params": { "tenantId": "blocked" } },
          "body": { "code": "TENANT_FORBIDDEN" }
        },
        { "name": "get", "statusCode": 200, "action": "get" }
      ]
    },
    "PATCH": {
      "nameResponse": "patch",
      "request": {
        "body": {
          "status?": {
            "type": "string",
            "enum": ["open", "pending", "closed"]
          },
          "priority?": {
            "type": "string",
            "enum": ["low", "medium", "high"]
          },
          "assignee?": { "type": "string", "format": "email" }
        },
        "invalidResponse": "validation-error"
      },
      "responses": [
        {
          "name": "validation-error",
          "statusCode": 422,
          "body": {
            "code": "VALIDATION_ERROR",
            "message": "Invalid ticket patch",
            "errors": []
          }
        },
        { "name": "patch", "statusCode": 200, "action": "patch" }
      ]
    },
    "DELETE": {
      "nameResponse": "remove",
      "responses": [
        {
          "name": "forbidden-tenant",
          "statusCode": 403,
          "match": { "params": { "tenantId": "blocked" } },
          "body": { "code": "TENANT_FORBIDDEN" }
        },
        { "name": "remove", "statusCode": 204, "action": "delete" }
      ]
    }
  },
  "api/tenants/:tenantId/activity": {
    "store": {
      "id": "helpdesk-activity",
      "key": { "fields": ["tenantId", "id"] },
      "seed": [
        {
          "tenantId": "acme",
          "id": 1,
          "type": "comment",
          "message": "Looking into login",
          "score": 2,
          "createdAt": 1700001001
        },
        {
          "tenantId": "acme",
          "id": 2,
          "type": "status",
          "message": "Moved to pending",
          "score": 5,
          "createdAt": 1700001002
        },
        {
          "tenantId": "acme",
          "id": 3,
          "type": "comment",
          "message": "Password reset sent",
          "score": 8,
          "createdAt": 1700001003
        },
        {
          "tenantId": "acme",
          "id": 4,
          "type": "assign",
          "message": "Assigned to alice",
          "score": 3,
          "createdAt": 1700001004
        }
      ],
      "template": {
        "tenantId": "",
        "id": 0,
        "type": "comment",
        "message": "",
        "score": 0,
        "createdAt": 0
      },
      "list": {
        "cursor": {
          "query": "starting_after",
          "limit": { "query": "limit", "default": 2, "max": 20 }
        },
        "sort": {
          "query": "sort",
          "default": "-createdAt",
          "fields": ["id", "createdAt", "score"]
        },
        "order": { "query": "order", "default": "desc" },
        "filter": {
          "fields": ["type"],
          "search": { "query": "q", "fields": ["message"] }
        }
      }
    },
    "GET": {
      "nameResponse": "feed",
      "responses": [
        {
          "name": "forbidden-tenant",
          "statusCode": 403,
          "match": { "params": { "tenantId": "blocked" } },
          "body": { "code": "TENANT_FORBIDDEN" }
        },
        {
          "name": "feed",
          "statusCode": 200,
          "action": "list",
          "headers": {
            "X-Feed": "activity",
            "X-Has-More": "{{hasMore}}"
          },
          "body": {
            "data": "{{items}}",
            "has_more": "{{hasMore}}",
            "next_cursor": "{{nextCursor}}",
            "next": "{{next}}",
            "sort": "{{sort}}"
          }
        }
      ]
    },
    "POST": {
      "nameResponse": "create",
      "request": {
        "body": {
          "type": {
            "type": "string",
            "enum": ["comment", "status", "assign"]
          },
          "message": { "type": "string", "minLength": 3, "maxLength": 200 },
          "score?": { "type": "number", "min": 0, "max": 100 },
          "createdAt?": { "type": "number", "min": 1 }
        },
        "invalidResponse": "validation-error"
      },
      "responses": [
        {
          "name": "validation-error",
          "statusCode": 422,
          "body": {
            "code": "VALIDATION_ERROR",
            "message": "Invalid activity event",
            "errors": []
          }
        },
        { "name": "create", "statusCode": 201, "action": "create" }
      ]
    }
  }
}
```

Try:

```bash
# Tenant isolation (path key fields filter the store)
curl -s 'http://localhost:3000/api/tenants/acme/tickets?status=open&priority=high'
curl -s 'http://localhost:3000/api/tenants/globex/tickets'

# Date range + ne + nested channel + in + sla
curl -s 'http://localhost:3000/api/tenants/acme/tickets?since=1700000002&until=1700000004&excludeStatus=closed&pageSize=10'
curl -s 'http://localhost:3000/api/tenants/acme/tickets?channel=email&priorities=high,low&pageSize=10'
curl -s 'http://localhost:3000/api/tenants/acme/tickets?maxSla=5&pageSize=10'

# OR: assignee OR priority
curl -s 'http://localhost:3000/api/tenants/acme/tickets?anyAssignee=carol@acme.com&anyPriority=high&pageSize=10'

# Auth / RBAC-style static branches
curl -si 'http://localhost:3000/api/tenants/blocked/tickets'
curl -si 'http://localhost:3000/api/tenants/acme/tickets?auth=missing'

# Create + conflict
curl -s -X POST http://localhost:3000/api/tenants/acme/tickets \
  -H 'Content-Type: application/json' \
  -d '{"subject":"Billing dispute","priority":"medium","assignee":"finance@acme.com"}'

# Cursor activity feed (Stripe-style)
PAGE1=$(curl -s 'http://localhost:3000/api/tenants/acme/activity')
echo "$PAGE1"
CURSOR=$(echo "$PAGE1" | node -e "let s='';process.stdin.on('data',d=>s+=d);process.stdin.on('end',()=>console.log(JSON.parse(s).next_cursor||''))")
curl -s "http://localhost:3000/api/tenants/acme/activity?starting_after=${CURSOR}"
```

| Feature | Where it shows up |
|---------|-------------------|
| Composite `key` | `tenantId` + `id` scopes tickets/activity per tenant |
| `store.list` page | Inbox with `Link`, default `-createdAt` |
| Filter ops | `since`/`until`, `ne`, `in` priorities, nested `channel.*`, `maxSla` |
| `or` | `anyAssignee` **or** `anyPriority` |
| `store.list` cursor | Activity feed with `starting_after` + `{{nextCursor}}` |
| `request` | Ticket/activity payload validation → `422` |
| `match` | `blocked` tenant → `403`; `auth=missing` → `401` |
| `unique` + `persist` | Duplicate subject → `409`; data survives restart |

### Example G — Real project: HR employee directory

Org-scoped people directory built to **permute every filter op** in a realistic admin UI: salary bands, level ranges, hire window, role `in`, nested `profile.*`, `or` (dept / city / role), search, plus `request` / `unique` / `match` / `persist`.

```json
{
  "api/orgs/:orgId/employees": {
    "store": {
      "id": "hr-employees",
      "key": {
        "fields": ["orgId", "id"],
        "conflict": { "response": "duplicate-key" }
      },
      "seed": [
        {
          "orgId": "acme",
          "id": 1,
          "name": "Ana Ruiz",
          "email": "ana@acme.com",
          "role": "engineer",
          "status": "active",
          "salary": 72000,
          "hiredAt": 1600000000,
          "profile": { "dept": "platform", "level": 3, "city": "Madrid" }
        },
        {
          "orgId": "acme",
          "id": 2,
          "name": "Bruno Díaz",
          "email": "bruno@acme.com",
          "role": "designer",
          "status": "active",
          "salary": 58000,
          "hiredAt": 1620000000,
          "profile": { "dept": "product", "level": 2, "city": "Barcelona" }
        },
        {
          "orgId": "acme",
          "id": 5,
          "name": "Elena Voss",
          "email": "elena@acme.com",
          "role": "engineer",
          "status": "active",
          "salary": 64000,
          "hiredAt": 1680000000,
          "profile": { "dept": "data", "level": 2, "city": "Berlin" }
        }
      ],
      "template": {
        "orgId": "",
        "id": 0,
        "name": "",
        "email": "",
        "role": "engineer",
        "status": "active",
        "salary": 0,
        "hiredAt": 0,
        "profile": { "dept": "", "level": 1, "city": "" }
      },
      "unique": {
        "fields": [
          {
            "field": "email",
            "conflict": {
              "response": "email-taken",
              "detail": { "field": "{{field}}", "value": "{{value}}" }
            }
          }
        ],
        "conflict": {
          "response": "duplicate-fields",
          "detail": { "field": "{{field}}", "value": "{{value}}" }
        }
      },
      "persist": true,
      "list": {
        "page": { "query": "page", "default": 1 },
        "pageSize": {
          "query": "pageSize",
          "default": 3,
          "max": 50,
          "aliases": ["limit"]
        },
        "sort": {
          "query": "sort",
          "default": "name",
          "fields": ["id", "name", "salary", "hiredAt", "role"]
        },
        "order": { "query": "order", "default": "asc" },
        "filter": {
          "fields": [
            "status",
            "role",
            { "field": "salary", "op": "gte", "query": "minSalary" },
            { "field": "salary", "op": "lte", "query": "maxSalary" },
            { "field": "profile.level", "op": "gt", "query": "minLevel" },
            { "field": "profile.level", "op": "lt", "query": "maxLevel" },
            { "field": "hiredAt", "op": "gte", "query": "hiredAfter" },
            { "field": "hiredAt", "op": "lte", "query": "hiredBefore" },
            { "field": "status", "op": "ne", "query": "excludeStatus" },
            { "field": "role", "op": "in", "query": "roles" },
            { "field": "profile.dept", "op": "eq", "query": "dept" },
            { "field": "profile.city", "op": "eq", "query": "city" }
          ],
          "or": [
            { "field": "profile.dept", "op": "eq", "query": "anyDept" },
            { "field": "profile.city", "op": "eq", "query": "anyCity" },
            { "field": "role", "op": "eq", "query": "anyRole" }
          ],
          "search": {
            "query": "q",
            "fields": ["name", "email", "profile.city", "profile.dept"]
          }
        }
      }
    },
    "GET": {
      "nameResponse": "directory",
      "responses": [
        {
          "name": "forbidden-org",
          "statusCode": 403,
          "match": { "params": { "orgId": "blocked" } },
          "body": {
            "code": "ORG_FORBIDDEN",
            "message": "HR directory is not available for this organization"
          }
        },
        {
          "name": "directory",
          "statusCode": 200,
          "action": "list",
          "headers": {
            "X-Total-Count": "{{total}}",
            "Link": "{{linkHeader}}"
          },
          "body": {
            "employees": "{{items}}",
            "page": "{{page}}",
            "pageSize": "{{pageSize}}",
            "total": "{{total}}",
            "totalPages": "{{totalPages}}",
            "sort": "{{sort}}",
            "next": "{{next}}",
            "previous": "{{previous}}",
            "hasNext": "{{hasNext}}",
            "hasPrevious": "{{hasPrevious}}"
          }
        }
      ]
    },
    "POST": {
      "nameResponse": "create",
      "request": {
        "body": {
          "name": { "type": "string", "minLength": 2, "maxLength": 80 },
          "email": { "type": "string", "format": "email" },
          "role": {
            "type": "string",
            "enum": ["engineer", "designer", "manager", "support"]
          },
          "salary": { "type": "number", "min": 1, "max": 500000 },
          "hiredAt": { "type": "number", "min": 1 },
          "profile": {
            "type": "object",
            "properties": {
              "dept": { "type": "string", "minLength": 2 },
              "level": { "type": "number", "min": 1, "max": 10 },
              "city": { "type": "string", "minLength": 2 }
            }
          }
        },
        "invalidResponse": "validation-error"
      },
      "responses": [
        {
          "name": "validation-error",
          "statusCode": 422,
          "body": {
            "code": "VALIDATION_ERROR",
            "message": "Invalid employee payload",
            "errors": []
          }
        },
        {
          "name": "email-taken",
          "statusCode": 409,
          "body": { "code": "EMAIL_TAKEN", "conflicts": "{{conflicts}}" }
        },
        {
          "name": "duplicate-fields",
          "statusCode": 409,
          "body": { "code": "DUPLICATE", "conflicts": "{{conflicts}}" }
        },
        {
          "name": "duplicate-key",
          "statusCode": 409,
          "body": { "code": "DUPLICATE_KEY" }
        },
        { "name": "create", "statusCode": 201, "action": "create" }
      ]
    }
  },
  "api/orgs/:orgId/employees/:id": {
    "store": { "id": "hr-employees" },
    "GET": {
      "nameResponse": "get",
      "responses": [
        { "name": "get", "statusCode": 200, "action": "get" }
      ]
    },
    "PATCH": {
      "nameResponse": "patch",
      "responses": [
        {
          "name": "email-taken",
          "statusCode": 409,
          "body": { "code": "EMAIL_TAKEN", "conflicts": "{{conflicts}}" }
        },
        {
          "name": "duplicate-fields",
          "statusCode": 409,
          "body": { "code": "DUPLICATE", "conflicts": "{{conflicts}}" }
        },
        {
          "name": "duplicate-key",
          "statusCode": 409,
          "body": { "code": "DUPLICATE_KEY" }
        },
        { "name": "patch", "statusCode": 200, "action": "patch" }
      ]
    },
    "DELETE": {
      "nameResponse": "remove",
      "responses": [
        { "name": "remove", "statusCode": 204, "action": "delete" }
      ]
    }
  }
}
```

Try (filter permutations):

```bash
# eq + ne
curl -s 'http://localhost:3000/api/orgs/acme/employees?role=engineer&excludeStatus=terminated&pageSize=20'

# salary band (gte/lte) + status
curl -s 'http://localhost:3000/api/orgs/acme/employees?minSalary=60000&maxSalary=85000&status=active&pageSize=20'

# nested level gt/lt + dept
curl -s 'http://localhost:3000/api/orgs/acme/employees?minLevel=2&maxLevel=5&dept=platform&pageSize=20'

# in roles + nested city
curl -s 'http://localhost:3000/api/orgs/acme/employees?roles=designer,manager&city=Barcelona&pageSize=20'

# hire window
curl -s 'http://localhost:3000/api/orgs/acme/employees?hiredAfter=1600000000&hiredBefore=1650000000&pageSize=20'

# OR: dept OR city OR role
curl -s 'http://localhost:3000/api/orgs/acme/employees?anyDept=people&anyCity=Berlin&anyRole=support&pageSize=20'

# search + combined admin query
curl -s 'http://localhost:3000/api/orgs/acme/employees?q=madrid&pageSize=20'
curl -s 'http://localhost:3000/api/orgs/acme/employees?status=active&minSalary=50000&roles=engineer,designer&q=a&sort=salary:desc&pageSize=20'

# 400 on bad numeric filter
curl -si 'http://localhost:3000/api/orgs/acme/employees?minSalary=abc'
```

| Op / feature | Query in this example |
|--------------|------------------------|
| `eq` | `status`, `role`, `dept`, `city` |
| `ne` | `excludeStatus` |
| `gte` / `lte` | `minSalary` / `maxSalary`, `hiredAfter` / `hiredBefore` |
| `gt` / `lt` | `minLevel` / `maxLevel` on `profile.level` |
| `in` | `roles=engineer,designer` |
| Nested | `profile.dept`, `profile.city`, `profile.level` |
| `or` | `anyDept` / `anyCity` / `anyRole` |
| `search` | `q` on name, email, city, dept |

### Example H — Real project: Blog CMS with authors

Editorial UI: authors own articles, FK validation on write, `?expand=author` / `?expand=articles.author`, soft-delete + restore trash, paginated/filtered article list, `request` on create, `unique` slug, `persist`, and `onDelete: restrict` so you cannot delete an author who still has articles.

```json
{
  "api/authors": {
    "store": {
      "id": "blog-authors",
      "key": "id",
      "softDelete": true,
      "seed": [
        { "id": 1, "name": "Ada Lovelace", "handle": "ada" },
        { "id": 2, "name": "Grace Hopper", "handle": "grace" }
      ],
      "template": { "id": 0, "name": "", "handle": "" },
      "unique": {
        "fields": [
          {
            "field": "handle",
            "conflict": { "response": "duplicate-handle" }
          }
        ]
      },
      "relations": {
        "articles": {
          "type": "many",
          "store": "blog-articles",
          "join": { "from": "authorId" },
          "embed": { "as": "articles" }
        }
      },
      "persist": true,
      "list": {
        "page": { "query": "page", "default": 1 },
        "pageSize": { "default": 10, "max": 50 },
        "sort": { "fields": ["name", "id"], "default": "name:asc" },
        "filter": {
          "fields": [
            { "field": "handle", "query": "handle", "op": "eq" }
          ],
          "search": { "query": "q", "fields": ["name", "handle"] }
        }
      }
    },
    "GET": {
      "nameResponse": "list",
      "responses": [
        { "name": "list", "statusCode": 200, "action": "list" }
      ]
    },
    "POST": {
      "nameResponse": "create",
      "request": {
        "body": {
          "name": { "type": "string", "minLength": 1, "maxLength": 80 },
          "handle": { "type": "string", "minLength": 2, "maxLength": 40, "pattern": "^[a-z0-9-]+$" }
        },
        "invalidResponse": "validation-error"
      },
      "responses": [
        { "name": "create", "statusCode": 201, "action": "create" },
        {
          "name": "duplicate-handle",
          "statusCode": 409,
          "body": { "code": "HANDLE_TAKEN", "field": "{{field}}", "value": "{{value}}" }
        },
        {
          "name": "validation-error",
          "statusCode": 422,
          "body": { "message": "Invalid author", "errors": [] }
        }
      ]
    }
  },
  "api/authors/:id": {
    "store": { "id": "blog-authors" },
    "GET": {
      "nameResponse": "get",
      "responses": [
        { "name": "get", "statusCode": 200, "action": "get" }
      ]
    },
    "DELETE": {
      "nameResponse": "remove",
      "responses": [
        {
          "name": "has-articles",
          "statusCode": 409,
          "body": {
            "code": "HAS_ARTICLES",
            "conflicts": "{{conflicts}}"
          }
        },
        { "name": "remove", "statusCode": 204, "action": "delete" }
      ]
    },
    "POST": {
      "nameResponse": "restore",
      "responses": [
        {
          "name": "duplicate-handle",
          "statusCode": 409,
          "body": { "code": "HANDLE_TAKEN", "field": "{{field}}", "value": "{{value}}" }
        },
        { "name": "restore", "statusCode": 200, "action": "restore" }
      ]
    }
  },
  "api/articles": {
    "store": {
      "id": "blog-articles",
      "key": "id",
      "softDelete": true,
      "seed": [
        {
          "id": 1,
          "title": "Analytical Engine notes",
          "slug": "analytical-engine",
          "status": "published",
          "authorId": 1
        },
        {
          "id": 2,
          "title": "Bug in the relay",
          "slug": "relay-bug",
          "status": "draft",
          "authorId": 2
        }
      ],
      "template": {
        "id": 0,
        "title": "",
        "slug": "",
        "status": "draft",
        "authorId": 0
      },
      "unique": {
        "fields": [
          {
            "field": "slug",
            "conflict": { "response": "duplicate-slug" }
          }
        ]
      },
      "relations": {
        "authorId": {
          "store": "blog-authors",
          "join": { "from": "authorId", "to": "id" },
          "required": true,
          "onDelete": {
            "action": "restrict",
            "conflict": { "response": "has-articles" }
          },
          "embed": { "as": "author" },
          "conflict": {
            "response": "invalid-author",
            "detail": {
              "code": "INVALID_AUTHOR",
              "field": "{{field}}",
              "value": "{{value}}"
            }
          }
        }
      },
      "persist": true,
      "list": {
        "page": { "query": "page", "default": 1 },
        "pageSize": { "default": 10, "max": 50 },
        "sort": {
          "fields": ["title", "status", "id"],
          "default": "id:desc"
        },
        "filter": {
          "fields": [
            { "field": "status", "query": "status", "op": "eq" },
            { "field": "authorId", "query": "authorId", "op": "eq" },
            {
              "field": "status",
              "query": "excludeStatus",
              "op": "ne"
            }
          ],
          "search": { "query": "q", "fields": ["title", "slug"] }
        }
      }
    },
    "GET": {
      "nameResponse": "list",
      "responses": [
        { "name": "list", "statusCode": 200, "action": "list" }
      ]
    },
    "POST": {
      "nameResponse": "create",
      "request": {
        "body": {
          "title": { "type": "string", "minLength": 1, "maxLength": 160 },
          "slug": { "type": "string", "minLength": 2, "maxLength": 80, "pattern": "^[a-z0-9-]+$" },
          "status?": { "type": "string", "enum": ["draft", "published"] },
          "authorId": { "type": "number", "min": 1 }
        },
        "invalidResponse": "validation-error"
      },
      "responses": [
        { "name": "create", "statusCode": 201, "action": "create" },
        {
          "name": "duplicate-slug",
          "statusCode": 409,
          "body": { "code": "SLUG_TAKEN", "field": "{{field}}", "value": "{{value}}" }
        },
        {
          "name": "invalid-author",
          "statusCode": 422,
          "body": {
            "code": "INVALID_AUTHOR",
            "field": "{{field}}",
            "value": "{{value}}"
          }
        },
        {
          "name": "validation-error",
          "statusCode": 422,
          "body": { "message": "Invalid article", "errors": [] }
        }
      ]
    }
  },
  "api/articles/:id": {
    "store": { "id": "blog-articles" },
    "GET": {
      "nameResponse": "get",
      "responses": [
        { "name": "get", "statusCode": 200, "action": "get" }
      ]
    },
    "PATCH": {
      "nameResponse": "patch",
      "request": {
        "body": {
          "title?": { "type": "string", "minLength": 1, "maxLength": 160 },
          "status?": { "type": "string", "enum": ["draft", "published"] },
          "authorId?": { "type": "number", "min": 1 }
        },
        "invalidResponse": "validation-error"
      },
      "responses": [
        { "name": "patch", "statusCode": 200, "action": "patch" },
        {
          "name": "duplicate-slug",
          "statusCode": 409,
          "body": { "code": "SLUG_TAKEN", "field": "{{field}}", "value": "{{value}}" }
        },
        {
          "name": "invalid-author",
          "statusCode": 422,
          "body": {
            "code": "INVALID_AUTHOR",
            "field": "{{field}}",
            "value": "{{value}}"
          }
        },
        {
          "name": "validation-error",
          "statusCode": 422,
          "body": { "message": "Invalid article", "errors": [] }
        }
      ]
    },
    "DELETE": {
      "nameResponse": "remove",
      "responses": [
        { "name": "remove", "statusCode": 204, "action": "delete" }
      ]
    },
    "POST": {
      "nameResponse": "restore",
      "responses": [
        {
          "name": "duplicate-slug",
          "statusCode": 409,
          "body": { "code": "SLUG_TAKEN", "field": "{{field}}", "value": "{{value}}" }
        },
        {
          "name": "invalid-author",
          "statusCode": 422,
          "body": {
            "code": "INVALID_AUTHOR",
            "field": "{{field}}",
            "value": "{{value}}"
          }
        },
        { "name": "restore", "statusCode": 200, "action": "restore" }
      ]
    }
  }
}
```

Try:

```bash
# Invalid FK
curl -si -X POST http://localhost:3000/api/articles \
  -H 'Content-Type: application/json' \
  -d '{"title":"Ghost","slug":"ghost","authorId":999}'

# Expand one + list filters
curl -s 'http://localhost:3000/api/articles/1?expand=author'
curl -s 'http://localhost:3000/api/articles?status=published&q=engine&pageSize=10'

# Expand many + nested
curl -s 'http://localhost:3000/api/authors/1?expand=articles.author'

# Restrict delete while articles remain
curl -si -X DELETE http://localhost:3000/api/authors/1

# Soft-delete article, then delete author, then restore article from trash
curl -s -X DELETE http://localhost:3000/api/articles/1 -o /dev/null -w '%{http_code}\n'
curl -s -X DELETE http://localhost:3000/api/articles/2 -o /dev/null -w '%{http_code}\n'
curl -si -X DELETE http://localhost:3000/api/authors/2
curl -s -X POST http://localhost:3000/api/articles/2
curl -s 'http://localhost:3000/api/articles?includeDeleted=true'
```

| Feature | How this example uses it |
|---------|--------------------------|
| `relations` `one` / `many` | Articles → authors; authors embed `articles` |
| `join` / `embed` / `expand` | `authorId` ↔ `id`; nested `articles.author` |
| `onDelete` restrict | Author DELETE → `409` `HAS_ARTICLES` |
| `softDelete` + `restore` | Trash for authors and articles; soft-deleted children do not block restrict |
| `store.list` | Page + status/`authorId`/`ne` + search `q` |
| `request` + `unique` + `persist` | Payload rules, slug/handle conflicts, survive restart |

### Example I — Real project: Multi-tenant orders

Checkout / order admin: tenant-scoped orders with composite keys, line items that join on `(tenantId, orderId)`, `onDelete: cascade` when an order is removed, list + filters, `request` validation, and `?expand=order` on items.

```json
{
  "api/:tenantId/orders": {
    "store": {
      "id": "shop-orders",
      "key": {
        "fields": ["tenantId", "id"],
        "conflict": { "response": "duplicate-key" }
      },
      "seed": [
        {
          "tenantId": "acme",
          "id": 1,
          "status": "paid",
          "total": 42.5
        },
        {
          "tenantId": "acme",
          "id": 2,
          "status": "pending",
          "total": 10
        }
      ],
      "template": {
        "tenantId": "",
        "id": 0,
        "status": "pending",
        "total": 0
      },
      "relations": {
        "items": {
          "type": "many",
          "store": "shop-order-items",
          "join": { "from": ["tenantId", "orderId"] },
          "embed": { "as": "items" }
        }
      },
      "persist": true,
      "list": {
        "page": { "query": "page", "default": 1 },
        "pageSize": { "default": 10, "max": 50 },
        "sort": { "fields": ["id", "status", "total"], "default": "id:desc" },
        "filter": {
          "fields": [
            { "field": "status", "query": "status", "op": "eq" },
            { "field": "total", "query": "minTotal", "op": "gte" },
            { "field": "total", "query": "maxTotal", "op": "lte" }
          ]
        }
      }
    },
    "GET": {
      "nameResponse": "list",
      "responses": [
        { "name": "list", "statusCode": 200, "action": "list" }
      ]
    },
    "POST": {
      "nameResponse": "create",
      "request": {
        "body": {
          "status?": { "type": "string", "enum": ["pending", "paid", "cancelled"] },
          "total": { "type": "number", "min": 0 }
        },
        "invalidResponse": "validation-error"
      },
      "responses": [
        { "name": "create", "statusCode": 201, "action": "create" },
        {
          "name": "duplicate-key",
          "statusCode": 409,
          "body": { "code": "DUPLICATE_ORDER", "fields": "{{fields}}" }
        },
        {
          "name": "validation-error",
          "statusCode": 422,
          "body": { "message": "Invalid order", "errors": [] }
        }
      ]
    }
  },
  "api/:tenantId/orders/:id": {
    "store": { "id": "shop-orders" },
    "GET": {
      "nameResponse": "get",
      "responses": [
        { "name": "get", "statusCode": 200, "action": "get" }
      ]
    },
    "PATCH": {
      "nameResponse": "patch",
      "request": {
        "body": {
          "status?": { "type": "string", "enum": ["pending", "paid", "cancelled"] },
          "total?": { "type": "number", "min": 0 }
        },
        "invalidResponse": "validation-error"
      },
      "responses": [
        { "name": "patch", "statusCode": 200, "action": "patch" },
        {
          "name": "duplicate-key",
          "statusCode": 409,
          "body": { "code": "DUPLICATE_ORDER", "fields": "{{fields}}" }
        },
        {
          "name": "validation-error",
          "statusCode": 422,
          "body": { "message": "Invalid order", "errors": [] }
        }
      ]
    },
    "DELETE": {
      "nameResponse": "remove",
      "responses": [
        { "name": "remove", "statusCode": 204, "action": "delete" }
      ]
    }
  },
  "api/:tenantId/order-items": {
    "store": {
      "id": "shop-order-items",
      "key": {
        "fields": ["tenantId", "id"],
        "conflict": { "response": "duplicate-key" }
      },
      "seed": [
        {
          "tenantId": "acme",
          "id": 1,
          "orderId": 1,
          "sku": "SKU-TEA",
          "qty": 2,
          "price": 12.5
        },
        {
          "tenantId": "acme",
          "id": 2,
          "orderId": 1,
          "sku": "SKU-MUG",
          "qty": 1,
          "price": 17.5
        },
        {
          "tenantId": "acme",
          "id": 3,
          "orderId": 2,
          "sku": "SKU-TEA",
          "qty": 1,
          "price": 10
        }
      ],
      "template": {
        "tenantId": "",
        "id": 0,
        "orderId": 0,
        "sku": "",
        "qty": 1,
        "price": 0
      },
      "relations": {
        "orderRef": {
          "store": "shop-orders",
          "join": {
            "from": ["tenantId", "orderId"],
            "to": ["tenantId", "id"]
          },
          "required": true,
          "onDelete": "cascade",
          "embed": { "as": "order" },
          "conflict": {
            "response": "invalid-order",
            "detail": {
              "code": "INVALID_ORDER",
              "field": "{{field}}",
              "value": "{{value}}",
              "fields": "{{fields}}"
            }
          }
        }
      },
      "persist": true,
      "list": {
        "page": { "query": "page", "default": 1 },
        "pageSize": { "default": 20, "max": 100 },
        "sort": { "fields": ["id", "sku", "qty"], "default": "id:asc" },
        "filter": {
          "fields": [
            { "field": "orderId", "query": "orderId", "op": "eq" },
            { "field": "sku", "query": "sku", "op": "eq" },
            { "field": "qty", "query": "minQty", "op": "gte" }
          ],
          "search": { "query": "q", "fields": ["sku"] }
        }
      }
    },
    "GET": {
      "nameResponse": "list",
      "responses": [
        { "name": "list", "statusCode": 200, "action": "list" }
      ]
    },
    "POST": {
      "nameResponse": "create",
      "request": {
        "body": {
          "orderId": { "type": "number", "min": 1 },
          "sku": { "type": "string", "minLength": 1, "maxLength": 40 },
          "qty": { "type": "number", "min": 1 },
          "price": { "type": "number", "min": 0 }
        },
        "invalidResponse": "validation-error"
      },
      "responses": [
        { "name": "create", "statusCode": 201, "action": "create" },
        {
          "name": "duplicate-key",
          "statusCode": 409,
          "body": { "code": "DUPLICATE_ITEM", "fields": "{{fields}}" }
        },
        {
          "name": "invalid-order",
          "statusCode": 422,
          "body": {
            "code": "INVALID_ORDER",
            "field": "{{field}}",
            "value": "{{value}}"
          }
        },
        {
          "name": "validation-error",
          "statusCode": 422,
          "body": { "message": "Invalid line item", "errors": [] }
        }
      ]
    }
  },
  "api/:tenantId/order-items/:id": {
    "store": { "id": "shop-order-items" },
    "GET": {
      "nameResponse": "get",
      "responses": [
        { "name": "get", "statusCode": 200, "action": "get" }
      ]
    },
    "DELETE": {
      "nameResponse": "remove",
      "responses": [
        { "name": "remove", "statusCode": 204, "action": "delete" }
      ]
    }
  }
}
```

Try:

```bash
# List orders + expand line items
curl -s 'http://localhost:3000/api/acme/orders?status=paid'
curl -s 'http://localhost:3000/api/acme/orders/1?expand=items'

# Line items for an order + expand parent (composite join)
curl -s 'http://localhost:3000/api/acme/order-items?orderId=1'
curl -s 'http://localhost:3000/api/acme/order-items/1?expand=order'

# Invalid FK (order 999 does not exist for tenant)
curl -si -X POST http://localhost:3000/api/acme/order-items \
  -H 'Content-Type: application/json' \
  -d '{"orderId":999,"sku":"SKU-X","qty":1,"price":5}'

# Cascade: deleting order 1 removes its items
curl -s -X DELETE http://localhost:3000/api/acme/orders/1 -o /dev/null -w '%{http_code}\n'
curl -s 'http://localhost:3000/api/acme/order-items?orderId=1'
```

| Feature | How this example uses it |
|---------|--------------------------|
| Composite `key` | Orders and items keyed by `(tenantId, id)` |
| Composite `join` | `from: [tenantId, orderId]` → `to: [tenantId, id]` |
| `type: "many"` | Order embeds `items` |
| `onDelete: "cascade"` | Delete order → dependents removed |
| `store.list` + `request` + `persist` | `orderId`/status/total filters, payload rules, survive restart |

### Example J — Real project: Auth lockout + sessions

Login UI with **per-email** failed-attempt counters (`match.call.by`), lockout headers, validation (`request`), latency, and a **sessions** store after a successful sign-in (`call.reset` clears that user’s counter).

Combines: `match.call` (`index` / `by` / `reset`) + `match.body` + `request` + `delay` + custom headers + `store` (`create` / `list` / `delete`) + `persist`.

```json
{
  "api/v1/auth/login": {
    "POST": {
      "nameResponse": "locked",
      "delay": 80,
      "request": {
        "body": {
          "email": { "type": "string", "format": "email" },
          "password": { "type": "string", "minLength": 8, "maxLength": 72 }
        },
        "invalidResponse": "validation-error"
      },
      "responses": [
        {
          "name": "attempt-1",
          "statusCode": 401,
          "delay": 150,
          "match": {
            "call": { "index": 1, "by": { "body": "email" } },
            "body": { "password": "wrong-password" }
          },
          "body": {
            "code": "INVALID_CREDENTIALS",
            "attemptsLeft": 2
          }
        },
        {
          "name": "attempt-2",
          "statusCode": 401,
          "match": {
            "call": { "index": 2, "by": { "body": "email" } },
            "body": { "password": "wrong-password" }
          },
          "headers": { "X-Auth-Warning": "last-attempt" },
          "body": {
            "code": "INVALID_CREDENTIALS",
            "attemptsLeft": 1
          }
        },
        {
          "name": "ok",
          "statusCode": 200,
          "delay": 120,
          "match": {
            "call": { "reset": true, "by": { "body": "email" } },
            "body": { "password": "CorrectHorse1" }
          },
          "headers": { "X-Auth": "session" },
          "body": {
            "token": "jwt-demo",
            "user": { "id": 1, "email": "demo@acme.com" }
          }
        },
        {
          "name": "locked",
          "statusCode": 423,
          "headers": { "Retry-After": "60" },
          "body": {
            "code": "ACCOUNT_LOCKED",
            "retryAfterSec": 60
          }
        },
        {
          "name": "validation-error",
          "statusCode": 422,
          "body": { "message": "Invalid login payload", "errors": [] }
        }
      ]
    }
  },
  "api/v1/auth/sessions": {
    "store": {
      "id": "auth-sessions",
      "seed": [
        {
          "id": 1,
          "userId": 1,
          "email": "demo@acme.com",
          "device": "Chrome / macOS",
          "createdAt": "2026-07-01T10:00:00.000Z"
        }
      ],
      "template": {
        "id": 0,
        "userId": 0,
        "email": "",
        "device": "Unknown",
        "createdAt": ""
      },
      "list": true,
      "persist": true,
      "notFound": { "response": "missing" }
    },
    "GET": {
      "nameResponse": "list",
      "responses": [
        {
          "name": "list",
          "statusCode": 200,
          "action": "list",
          "body": {
            "items": "{{items}}",
            "total": "{{total}}"
          }
        }
      ]
    },
    "POST": {
      "nameResponse": "create",
      "request": {
        "body": {
          "userId": { "type": "number", "min": 1 },
          "email": { "type": "string", "format": "email" },
          "device": { "type": "string", "minLength": 1, "maxLength": 80 }
        },
        "invalidResponse": "validation-error"
      },
      "responses": [
        {
          "name": "validation-error",
          "statusCode": 422,
          "body": { "message": "Invalid session", "errors": [] }
        },
        { "name": "create", "statusCode": 201, "action": "create" }
      ]
    }
  },
  "api/v1/auth/sessions/:id": {
    "store": { "id": "auth-sessions" },
    "DELETE": {
      "nameResponse": "remove",
      "responses": [
        { "name": "remove", "statusCode": 204, "action": "delete" },
        {
          "name": "missing",
          "statusCode": 404,
          "body": { "code": "SESSION_NOT_FOUND", "key": "{{key}}" }
        }
      ]
    }
  }
}
```

Try:

```bash
# Validation fails before match.call (counter does not advance)
curl -si -X POST http://localhost:3000/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"not-an-email","password":"short"}'

# Per-email lockout (Alice)
curl -si -X POST http://localhost:3000/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"alice@acme.com","password":"wrong-password"}'
# → 401 attemptsLeft: 2
curl -si -X POST http://localhost:3000/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"alice@acme.com","password":"wrong-password"}'
# → 401 + X-Auth-Warning, attemptsLeft: 1
curl -si -X POST http://localhost:3000/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"alice@acme.com","password":"wrong-password"}'
# → 423 + Retry-After

# Bob still has a fresh counter
curl -si -X POST http://localhost:3000/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"bob@acme.com","password":"wrong-password"}'
# → 401 attemptsLeft: 2

# Success resets Alice’s counter; then register a session
curl -si -X POST http://localhost:3000/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"alice@acme.com","password":"CorrectHorse1"}'

curl -si -X POST http://localhost:3000/api/v1/auth/sessions \
  -H 'Content-Type: application/json' \
  -d '{"userId":1,"email":"alice@acme.com","device":"Safari / iOS"}'

curl -s 'http://localhost:3000/api/v1/auth/sessions'
curl -s -o /dev/null -w '%{http_code}\n' -X DELETE http://localhost:3000/api/v1/auth/sessions/1
```

| Feature | How this example uses it |
|---------|--------------------------|
| `match.call.index` + `by` | Failed logins counted per email |
| `match.call.reset` | Successful password clears that email’s counter |
| `request` | Bad payload → `422` without advancing the counter |
| `delay` / headers | Slow fail path, `Retry-After`, `X-Auth-Warning` |
| `store` + `list` + `persist` | Session list / revoke after login; survives restart |

---

## Real-world projects 🏢

The [Advanced examples](#advanced-examples) teach one feature at a time. This section shows **product-style scenarios** you can paste into your own mock JSON files and adapt to your frontend routes.

### What each scenario covers

| Scenario | Features used | Frontend focus |
|----------|---------------|----------------|
| [Todo / notes app](#example-c--real-project-todo--notes-app) | `store` + `request` + `persist` | Mutable list, toggle done, survive restart |
| [SaaS projects board](#example-d--real-project-saas-projects-board) | `store` + `match` + `unique` + `persist` | Org-scoped CRUD, slug conflicts, forbidden org |
| [E-commerce catalog](#example-e--real-project-e-commerce-catalog) | `store` + advanced `filter` + `request` + `match` + `delay` | Admin table, price/stock/warehouse filters, checkout |
| [Multi-tenant helpdesk](#example-f--real-project-multi-tenant-helpdesk) | `store` + page/cursor + date/channel filters + `or` | Inbox facets, SLA, activity feed |
| [HR employee directory](#example-g--real-project-hr-employee-directory) | All filter ops + nested + `or` + search | People admin: salary, level, hire window, roles |
| [Blog CMS with authors](#example-h--real-project-blog-cms-with-authors) | `relations` + `softDelete` + `list` + `request` + `unique` + `persist` | Expand, trash/restore, FK + restrict delete |
| [Multi-tenant orders](#example-i--real-project-multi-tenant-orders) | Composite `join` + `cascade` + `list` + `request` + `persist` | Order + line items, tenant routes, expand parent |
| [Auth lockout + sessions](#example-j--real-project-auth-lockout--sessions) | `match.call` + `request` + `delay` + headers + `store` + `persist` | Per-email lockout, reset on success, session revoke |
| SaaS signup + org invite | `request` + `match` | Form validation vs business errors (`409`, `403`) |
| Checkout resilience | `match` + `delay` + headers | `402` / `429` / `503`, retries, idempotency |
| Multi-tenant RBAC | `match.params` + `match.query` | Admin vs member, `403` across orgs |
| REST CRUD + pagination | `match` + headers | Tables, create/update/delete, `404` / `409` / `410` |
| Request + proxy | `request` + `proxy` | Validate locally, forward only when valid |
| Global `--proxy` | CLI `--proxy` | Unmocked routes go to a real backend |
| Webhooks | `request` (array + enum) | Register callback URLs and event lists |

### Example: SaaS signup + org invite

Validate the payload first, then branch with `match` for business errors (`409` email taken, `403` insufficient role).

```json
{
  "api/saas/signup": {
    "POST": {
      "nameResponse": "created",
      "request": {
        "body": {
          "email": { "type": "string", "format": "email", "message": "Use a valid work email" },
          "password": { "type": "string", "minLength": 10, "maxLength": 128 },
          "company": { "type": "string", "minLength": 2 },
          "plan": { "type": "string", "enum": ["free", "pro", "business"] },
          "seats?": { "type": "number", "min": 1, "max": 500 },
          "billing": {
            "type": "object",
            "properties": {
              "country": { "type": "string", "minLength": 2, "maxLength": 2 },
              "vat?": { "type": "string", "pattern": "^[A-Z]{2}[A-Z0-9]{8,12}$" }
            }
          }
        },
        "invalidResponse": "validation-error"
      },
      "responses": [
        { "name": "created", "statusCode": 201, "body": { "orgId": "org_1", "status": "active" } },
        {
          "name": "email-taken",
          "statusCode": 409,
          "match": { "body": { "email": "taken@acme.com" } },
          "body": { "code": "EMAIL_TAKEN" }
        },
        {
          "name": "validation-error",
          "statusCode": 422,
          "body": { "message": "Signup validation failed", "errors": [] }
        }
      ]
    }
  },
  "api/saas/orgs/:orgId/members": {
    "POST": {
      "nameResponse": "not-found",
      "request": {
        "body": {
          "email": { "type": "string", "format": "email" },
          "role": { "type": "string", "enum": ["owner", "admin", "member"] }
        },
        "invalidResponse": "validation-error"
      },
      "responses": [
        {
          "name": "invited",
          "statusCode": 201,
          "match": { "params": { "orgId": "org_1" } },
          "body": { "inviteId": "inv_1", "status": "pending" }
        },
        {
          "name": "forbidden",
          "statusCode": 403,
          "match": {
            "params": { "orgId": "org_2" },
            "body": { "role": "owner" }
          },
          "body": { "code": "INSUFFICIENT_ROLE" }
        },
        { "name": "not-found", "statusCode": 404, "body": { "code": "ORG_NOT_FOUND" } },
        { "name": "validation-error", "statusCode": 422, "body": { "message": "Invalid request", "errors": [] } }
      ]
    }
  }
}
```

| Call | Result |
|------|--------|
| Invalid signup body | `422 validation-error` (`request` fails before `match`) |
| Valid signup + `taken@acme.com` | `409 EMAIL_TAKEN` |
| Invite member on `org_1` | `201` invite |
| Invite `owner` on `org_2` | `403 INSUFFICIENT_ROLE` |

### Example: Checkout resilience (payments UI)

Drive edge cases with `match.query` / `match.body` — useful for retry banners, idempotent pay buttons, and `Retry-After` handling.

```json
{
  "api/v1/checkout/sessions": {
    "POST": {
      "nameResponse": "created",
      "delay": 80,
      "responses": [
        {
          "name": "rate-limited",
          "statusCode": 429,
          "delay": 200,
          "match": { "query": { "scenario": "rate_limit" } },
          "headers": {
            "Retry-After": "2",
            "X-RateLimit-Remaining": "0"
          },
          "body": {
            "title": "Too Many Requests",
            "code": "RATE_LIMITED"
          }
        },
        {
          "name": "maintenance",
          "statusCode": 503,
          "match": { "query": { "scenario": "maintenance" } },
          "headers": { "Retry-After": "30" },
          "body": { "title": "Service Unavailable", "code": "PROVIDER_UNAVAILABLE" }
        },
        {
          "name": "card-declined",
          "statusCode": 402,
          "match": {
            "body": {
              "paymentMethod": "card",
              "card": { "number": "4000000000000002" }
            }
          },
          "body": { "code": "CARD_DECLINED", "detail": "The card was declined" }
        },
        {
          "name": "idempotent-replay",
          "statusCode": 409,
          "match": { "body": { "idempotencyKey": "pay_dup_1" } },
          "body": { "code": "IDEMPOTENCY_CONFLICT", "detail": "Already processed" }
        },
        {
          "name": "created",
          "statusCode": 201,
          "body": { "sessionId": "cs_1", "status": "open" }
        }
      ]
    }
  }
}
```

| Trigger | Status | Frontend focus |
|---------|--------|----------------|
| `?scenario=rate_limit` | `429` + `Retry-After` | Backoff / disable CTA |
| `?scenario=maintenance` | `503` | Maintenance banner |
| Declined test card | `402` | Payment error copy |
| Duplicate idempotency key | `409` | “Already processed” |

### Example: Multi-tenant RBAC

Same route shape (`/orgs/:orgId/...`), different outcomes by `params` + `query.role`.

```json
{
  "api/v1/orgs/:orgId/projects": {
    "GET": {
      "nameResponse": "unauthorized",
      "responses": [
        {
          "name": "list-admin",
          "statusCode": 200,
          "match": {
            "params": { "orgId": "org_1" },
            "query": { "role": "admin" }
          },
          "headers": { "X-Org-Id": "org_1", "X-Total-Count": "2" },
          "body": {
            "data": [
              { "id": "prj_1", "name": "Website", "role": "admin" },
              { "id": "prj_2", "name": "Mobile", "role": "admin" }
            ]
          }
        },
        {
          "name": "list-member",
          "statusCode": 200,
          "match": {
            "params": { "orgId": "org_1" },
            "query": { "role": "member" }
          },
          "body": {
            "data": [{ "id": "prj_1", "name": "Website", "role": "viewer" }]
          }
        },
        {
          "name": "forbidden",
          "statusCode": 403,
          "match": {
            "params": { "orgId": "org_2" },
            "query": { "role": "member" }
          },
          "body": { "title": "Forbidden", "code": "FORBIDDEN" }
        },
        {
          "name": "unauthorized",
          "statusCode": 401,
          "body": { "title": "Unauthorized", "code": "UNAUTHORIZED" }
        }
      ]
    }
  }
}
```

| Request | Result |
|---------|--------|
| `GET /api/v1/orgs/org_1/projects?role=admin` | Admin project list |
| `GET /api/v1/orgs/org_1/projects?role=member` | Restricted list |
| `GET /api/v1/orgs/org_2/projects?role=member` | `403` forbidden |
| Missing match (no role / unknown org) | `401` via `nameResponse` |

### Example: Auth login with validation + business match

For **per-email lockout**, `Retry-After`, `call.reset` on success, and a **sessions** store after login, use the full pasteable mock in [Example J — Auth lockout + sessions](#example-j--real-project-auth-lockout--sessions).

That scenario combines `request` (invalid payload never advances the counter), `match.call` (`index` / `by` / `reset`), `delay`, custom headers, and `store` + `persist`.

### Example: REST CRUD + pagination

Typical resource UI: list with filters/pages, get by id, create, update conflict, soft-delete gone.

```json
{
  "api/v1/products": {
    "GET": {
      "nameResponse": "empty",
      "responses": [
        {
          "name": "page-1-active",
          "statusCode": 200,
          "match": { "query": { "page": "1", "status": "active" } },
          "headers": { "X-Total-Count": "2" },
          "body": {
            "data": [
              { "id": "prod_1", "name": "Starter", "status": "active", "price": 990 },
              { "id": "prod_2", "name": "Pro", "status": "active", "price": 2990 }
            ],
            "page": 1,
            "total": 2
          }
        },
        {
          "name": "page-2",
          "statusCode": 200,
          "match": { "query": { "page": "2" } },
          "headers": { "X-Total-Count": "12" },
          "body": {
            "data": [{ "id": "prod_11", "name": "Enterprise", "status": "active" }],
            "page": 2,
            "total": 12
          }
        },
        {
          "name": "empty",
          "statusCode": 200,
          "headers": { "X-Total-Count": "0" },
          "body": { "data": [], "page": 1, "total": 0 }
        }
      ]
    },
    "POST": {
      "nameResponse": "created",
      "request": {
        "body": {
          "name": { "type": "string", "minLength": 1 },
          "sku": { "type": "string", "minLength": 3 },
          "price": { "type": "number", "min": 0 }
        },
        "invalidResponse": "validation-error"
      },
      "responses": [
        {
          "name": "duplicate-sku",
          "statusCode": 409,
          "match": { "body": { "sku": "SKU-EXISTS" } },
          "body": { "code": "DUPLICATE_SKU", "detail": "SKU already exists" }
        },
        {
          "name": "created",
          "statusCode": 201,
          "headers": { "Location": "/api/v1/products/prod_99" },
          "body": { "id": "prod_99", "name": "New Product", "sku": "SKU-NEW", "status": "draft" }
        },
        {
          "name": "validation-error",
          "statusCode": 422,
          "body": { "message": "Invalid request", "errors": [] }
        }
      ]
    }
  },
  "api/v1/products/:id": {
    "GET": {
      "nameResponse": "not-found",
      "responses": [
        {
          "name": "found",
          "statusCode": 200,
          "match": { "params": { "id": "prod_1" } },
          "body": { "id": "prod_1", "name": "Starter", "status": "active", "price": 990, "version": 3 }
        },
        {
          "name": "gone",
          "statusCode": 410,
          "match": { "params": { "id": "prod_gone" } },
          "body": { "code": "PRODUCT_GONE", "detail": "Permanently deleted" }
        },
        {
          "name": "not-found",
          "statusCode": 404,
          "body": { "code": "PRODUCT_NOT_FOUND" }
        }
      ]
    },
    "PATCH": {
      "nameResponse": "not-found",
      "responses": [
        {
          "name": "version-conflict",
          "statusCode": 409,
          "match": {
            "params": { "id": "prod_1" },
            "body": { "version": 2 }
          },
          "body": { "code": "VERSION_CONFLICT", "currentVersion": 3 }
        },
        {
          "name": "updated",
          "statusCode": 200,
          "match": { "params": { "id": "prod_1" } },
          "body": { "id": "prod_1", "name": "Starter Plus", "version": 4 }
        },
        { "name": "not-found", "statusCode": 404, "body": { "code": "PRODUCT_NOT_FOUND" } }
      ]
    },
    "DELETE": {
      "nameResponse": "not-found",
      "responses": [
        {
          "name": "deleted",
          "statusCode": 204,
          "match": { "params": { "id": "prod_1" } },
          "body": null
        },
        { "name": "not-found", "statusCode": 404, "body": { "code": "PRODUCT_NOT_FOUND" } }
      ]
    }
  }
}
```

| Call | Result |
|------|--------|
| `GET .../products?page=1&status=active` | Page 1 list + `X-Total-Count` |
| `GET .../products?page=2` | Page 2 |
| `POST` with `sku: "SKU-EXISTS"` | `409` duplicate |
| `GET .../products/prod_gone` | `410` gone |
| `PATCH` with stale `version: 2` | `409` conflict |
| `DELETE .../products/prod_1` | `204` |

### Example: Request validation + proxy (mock vs live)

Validate first. Invalid bodies never hit the upstream. Valid bodies can stay local or forward with `proxy`.

```json
{
  "api/v1/posts": {
    "POST": {
      "nameResponse": "mock",
      "proxy": "https://jsonplaceholder.typicode.com",
      "request": {
        "body": {
          "title": { "type": "string", "minLength": 3 },
          "body?": { "type": "string", "minLength": 1 }
        },
        "invalidResponse": "validation-error"
      },
      "responses": [
        {
          "name": "live",
          "proxy": {
            "target": "https://jsonplaceholder.typicode.com",
            "path": "/posts"
          },
          "match": { "body": { "title": "live-post" } }
        },
        {
          "name": "mock",
          "statusCode": 200,
          "body": { "source": "mock", "id": 0 }
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

| Call | Result |
|------|--------|
| `{ "title": "x" }` | `422` — blocked by `request` |
| `{ "title": "local-draft" }` | Local mock body |
| `{ "title": "live-post" }` | Proxied to upstream `/posts` |

### Example: Global `--proxy` for unmocked routes

Mock only the routes you care about. Everything else can fall through to a real API:

```bash
mock-server start --proxy https://api.staging.com
```

```json
{
  "api/v1/feature-flags": {
    "GET": {
      "nameResponse": "defaults",
      "responses": [
        {
          "name": "defaults",
          "statusCode": 200,
          "body": { "newCheckout": true, "darkMode": false }
        }
      ]
    }
  }
}
```

| Call | Result |
|------|--------|
| `GET /api/v1/feature-flags` | Local mock |
| `GET /api/v1/users/me` (no mock) | Forwarded to `https://api.staging.com/api/v1/users/me` |
| `POST /billing/invoices` (no mock) | Forwarded with the original path + query |

Use this when the frontend needs one or two controlled responses and the rest of the backend already works in staging.

### Example: Webhooks registration

Validate callback URL, event list, and secret before returning a webhook id.

```json
{
  "api/saas/webhooks": {
    "POST": {
      "nameResponse": "created",
      "request": {
        "body": {
          "url": { "type": "string", "format": "url" },
          "events": {
            "type": "array",
            "minItems": 1,
            "maxItems": 10,
            "items": {
              "type": "string",
              "enum": ["invoice.paid", "invoice.failed", "member.joined"]
            }
          },
          "secret": { "type": "string", "minLength": 16 }
        },
        "errorFormat": "map",
        "errorDetailsKey": "errors"
      },
      "responses": [
        {
          "name": "created",
          "statusCode": 201,
          "body": { "webhookId": "wh_1", "status": "active" }
        }
      ]
    }
  },
  "api/saas/webhooks/:id/deliveries": {
    "GET": {
      "nameResponse": "empty",
      "responses": [
        {
          "name": "recent",
          "statusCode": 200,
          "match": { "params": { "id": "wh_1" } },
          "body": {
            "data": [
              { "event": "invoice.paid", "status": "delivered", "attempts": 1 },
              { "event": "invoice.failed", "status": "failed", "attempts": 3 }
            ]
          }
        },
        {
          "name": "empty",
          "statusCode": 200,
          "body": { "data": [] }
        }
      ]
    }
  }
}
```

| Call | Result |
|------|--------|
| Invalid `url` / empty `events` / short `secret` | `400` with `errors` map |
| Valid registration | `201` + `webhookId` |
| `GET .../webhooks/wh_1/deliveries` | Delivery history for UI |

### Tips for your project

1. Paste the JSON into a mock JSON file in the directory created by `mock-server init` (or the path you pass to `start`).
2. Rename route prefixes (`api/saas/...`) to match your frontend base URL.
3. Keep `request` for contract checks and `match` for business branches — they stack, they don’t replace each other.
4. Prefer one JSON file per product area (auth, billing, orgs) so hot reload stays fast while editing.

---

## Troubleshooting 🔧

This section documents all possible errors and warnings you might encounter, organized by category.

### File-Level Errors

These errors occur when there are issues with the file structure or file system:

| Error Message                               | Description                             | Solution                                                            |
|---------------------------------------------|-----------------------------------------|---------------------------------------------------------------------|
| `The directory named mocks does not exist`  | The mock files directory is missing     | Run `mock-server init` to create it                                 |
| `No files found`                            | No JSON files found in that directory   | Create at least one `.json` mock file there                         |
| `JSON syntax error: ...`                    | Invalid JSON syntax in the file         | Check for missing commas, brackets, or quotes. Use a JSON validator |
| `Error processing file: ...`                | General file processing error           | Check file permissions and ensure the file is readable              |
| `The file must contain a valid JSON object` | File content is not a JSON object       | Ensure the file starts with `{` and contains valid JSON structure   |
| `The file does not contain any endpoints`   | File is empty or has no endpoints       | Add at least one endpoint to the file                               |

**Example:**

```
Error:
File: my-mock.json
  JSON syntax error: Unexpected token } in JSON at position 45
```

### Endpoint Errors

These errors occur when endpoint definitions are invalid:

| Error Message                                                                                             | Description                          | Solution                                                                    |
|-----------------------------------------------------------------------------------------------------------|--------------------------------------|-----------------------------------------------------------------------------|
| `Invalid path. Allowed characters: letters, numbers, "-", "_", ".", "~", "/", and parameters like ":id".` | Endpoint contains invalid characters | Use only allowed characters. Example: `data/users/:id` ✅, `data/users#id` ❌ |
| `Must be an object`                                                                                       | Endpoint value is not an object      | Ensure the endpoint value is wrapped in `{}`                                |
| `Does not contain any HTTP methods`                                                                       | Endpoint has no HTTP methods defined | Add at least one HTTP method (GET, POST, etc.) to the endpoint              |

**Example:**

❌ **Invalid** - Invalid character `#` in endpoint:
```json
{
  "data/users#id": {
    "GET": {
      "nameResponse": "success",
      "responses": []
    }
  }
}
```

✅ **Valid** - Correct parameter syntax:
```json
{
  "data/users/:id": {
    "GET": {
      "nameResponse": "success",
      "responses": []
    }
  }
}
```

### HTTP Method Errors

These errors occur when HTTP method definitions are invalid:

| Error Message                                                       | Description                                          | Solution                                                                 |
|---------------------------------------------------------------------|------------------------------------------------------|--------------------------------------------------------------------------|
| `Invalid HTTP method. Valid methods: GET, POST, PUT, PATCH, DELETE` | Method name is not valid                             | Use only: `GET`, `POST`, `PUT`, `PATCH`, or `DELETE` (must be uppercase) |
| `The method must be an object`                                      | Method value is not an object                        | Ensure the method value is wrapped in `{}`                               |
| `Missing property "nameResponse"`                                   | `nameResponse` property is missing                   | Add `"nameResponse": "your-response-name"` to the method                 |
| `Missing property "responses"`                                      | `responses` array is missing                         | Add `"responses": [...]` array to the method                             |
| `The "responses" property must be an array`                         | `responses` is not an array                          | Change `responses` to an array format `[]`                               |
| `The responses array is empty`                                      | `responses` array has no items                       | Add at least one response object to the array                            |
| `The "nameResponse" "X" does not exist in responses`                | `nameResponse` value doesn't match any response name | Ensure `nameResponse` matches a `name` in the responses array            |
| `The "delay" "X" is not a valid number`                             | Method-level `delay` is not a number                 | Use a number of milliseconds: `"delay": 300`                             |
| `The "delay" must be greater than or equal to 0`                    | Method-level `delay` is negative                     | Use `0` or a positive number                                             |

**Example:**

❌ **Invalid** - Lowercase method, should be uppercase:
```json
{
  "data/users": {
    "get": {
      "nameResponse": "success",
      "responses": []
    }
  }
}
```

✅ **Valid** - Uppercase method:
```json
{
  "data/users": {
    "GET": {
      "nameResponse": "success",
      "responses": [
        {
          "name": "success",
          "statusCode": "200",
          "body": {}
        }
      ]
    }
  }
}
```

### Response Errors

These errors occur when individual response objects are invalid:

| Error Message                                | Description                             | Solution                                                      |
|----------------------------------------------|-----------------------------------------|---------------------------------------------------------------|
| `The response must be an object`             | Response is not an object               | Ensure each response in the array is wrapped in `{}`          |
| `Missing property "name"`                    | Response is missing the `name` property | Add `"name": "your-response-name"` to each response           |
| `Missing property "statusCode"`              | Response is missing `statusCode`        | Add `"statusCode": "200"` (or any valid status code)          |
| `The "statusCode" "X" is not a valid number` | `statusCode` is not a valid number      | Use a number or string number: `200`, `"200"`, `404`, `"404"` |
| `Missing property "body"`                    | Response is missing `body` property     | Add `"body": {}`, `"body": null`, or any valid JSON value     |
| `The "headers" property must be an object`   | `headers` is not an object              | If provided, `headers` must be an object: `"headers": {}`     |
| `The "delay" "X" is not a valid number`      | Response-level `delay` is not a number  | Use a number of milliseconds: `"delay": 500`                  |
| `The "delay" must be greater than or equal to 0` | Response-level `delay` is negative  | Use `0` or a positive number                                  |
| `The "match" property must be an object`     | `match` is not an object                | Use `"match": { "params": {...} }`, `"query": {...}`, `"body": {...}` and/or `"call": 1` |
| `The "match" property must include "params", "query", "body" and/or "call"` | `match` is empty | Add at least `"params"`, `"query"`, `"body"`, or `"call"` inside `match` |
| `The "match.params" property must be an object` | `match.params` is not an object    | Use an object of route params: `"params": { "id": "1" }`       |
| `The "match.params" property must not be empty` | `match.params` is `{}`             | Add at least one route param key/value to match                |
| `The "match.query" property must be an object` | `match.query` is not an object        | Use an object of query keys/values: `"query": { "page": "1" }` |
| `The "match.query" property must not be empty` | `match.query` is `{}`                 | Add at least one query key/value to match                      |
| `The "match.call" property must be a positive integer (>= 1) or an object` | Invalid `match.call` shape | Use `1` or `{ "index": 1 }` / `{ "reset": true }` |
| `The "match.call" object must include "index" and/or "reset": true` | `call` object has only `loop`/`by`, or `"reset": false` alone | Add `"index"` and/or `"reset": true` |
| `A "match.call" with only "reset": true must also include "params", "query" and/or "body"` | Reset-only catch-all match | Combine with `body` / `query` / `params` |
| `All "match.call.by" values in a method must be identical` | Mixed `by` scopes on one method | Use the same `by` on every `call` |
| `When "match.call.loop" is true, "index" values should be contiguous from 1 to max` | Sparse indexes with `loop` (warning) | Use `1..N` without gaps |
| `The "match.call.index" property must be a positive integer (>= 1)` | Bad `index` | Use `1`, `2`, … |
| `The "match.call.loop" property must be a boolean` | Non-boolean `loop` | Use `true` or `false` |
| `The "match.call.reset" property must be a boolean` | Non-boolean `reset` | Use `true` or `false` |
| `The "match.call.by" property must include exactly one of "body", "query", or "params"` | Empty or multiple `by` keys | Use e.g. `"by": { "body": "email" }` |
| `The "match.call.by" property must be an object` | `by` is not an object | Use an object with one source key |
| `The "match.call.by.body" property must be a non-empty string` | Empty / non-string path | Use a field path string |
| `The "proxy" must be a valid http or https URL` | Invalid proxy URL                    | Use a full URL like `"https://api.staging.com"`               |
| `The "proxy" must be a URL string, true, or an object with "target"` | Invalid response proxy shape | Use a string, `true`, or `{ "target": "https://..." }`     |
| `The "proxy" must be a URL string or an object with "target"` | Invalid method proxy shape (`true` not allowed) | Use a string or `{ "target": "https://..." }` at method level |
| `The "proxy.target" property is required`      | Proxy object without target           | Add `"target": "https://api.staging.com"`                     |
| `The "proxy.target" must be a valid http or https URL` | Invalid `proxy.target` URL | Use a full `http://` or `https://` URL |
| `The "proxy.path" must be a string` | `proxy.path` is not a string | Use e.g. `"path": "/v2/users"` |
| `The "request" property must be an object` | `request` is not an object | Use `"request": { "body": {...} }` and/or `"query": {...}` |
| `The "request" property must include "body" and/or "query"` | Empty `request` | Add at least `body` or `query` |
| `The "request.body" property must be an object` | `body` is not an object | Use `"body": { "email": "string" }` |
| `The "request.body" property must not be empty` | `body` is `{}` | Add at least one field rule |
| `The "request.query" property must be an object` | `query` is not an object | Use `"query": { "page?": { "type": "number" } }` |
| `The "request.query" property must not be empty` | `query` is `{}` | Add at least one field rule |
| `The "request.body" contains an invalid field name` | Empty field name (e.g. `"?"`) | Use a real field name; `?` only as optional suffix |
| `field must be a type string or a rule object with "type"` | Invalid field schema | Use `"email": "string"` or `{ "type": "string", ... }` |
| `type must be one of: string, number, boolean, object, array` | Unknown `type` | Use one of the supported types |
| `string rules ... require type "string"` | `minLength`/`pattern`/`format` on non-string | Set `"type": "string"` |
| `range rules (min, max) require type "number"` | `min`/`max` on non-number | Set `"type": "number"` |
| `array rules ... require type "array"` | `minItems`/`items` on non-array | Set `"type": "array"` |
| `properties requires type "object"` | `properties` on non-object | Set `"type": "object"` |
| `properties must be a non-empty object` | `properties: {}` | Add nested fields |
| `minLength must be a non-negative number` | Negative bound | Use `0` or a positive number |
| `pattern is not a valid regular expression` | Broken regex | Fix the regex string |
| `pattern must be a non-empty string` | Empty/non-string pattern | Use a non-empty string regex |
| `format must be one of: email, uuid, url, date` | Unknown format | Use a supported format |
| `enum must be a non-empty array` | Empty enum | Add at least one allowed value |
| `enum values must be strings or numbers` | Invalid enum item types | Use only strings/numbers in `enum` |
| `message must be a string` | Non-string custom message | Use `"message": "..." ` |
| `request.invalidResponse must be a non-empty string` | Missing/empty/non-string | Use a response `name` string |
| `request.invalidResponse "X" does not exist in responses` | Unknown response name | Point to an existing response `name` |
| `request.errorFormat must be one of: array, map` | Invalid error format | Use `"array"` or `"map"` |
| `request.errorDetail must be a non-empty string or object` | Empty/invalid template | Use a string or object of string templates |
| `request.errorDetail object values must be strings` | Non-string template value | Use only string values in the object |
| `request.errorDetailsKey must be a non-empty string` | Empty key | Use e.g. `"errors"` or `"fields"` |

### Store / action Errors

These errors occur when `store` or `action` configuration is invalid:

| Error Message | Description | Solution |
|---|---|---|
| `The "store" property must be an object` | `store` is not an object | Use `{ "id": "..." }` |
| `The "store.id" must be a non-empty string` | Missing/empty id | Set a non-empty `id` |
| `The store "X" is already defined` | Duplicate full store definition | Define seed/key/unique once; other routes use `{ "id": "X" }` |
| `The store "X" is referenced but not defined` | Reference without definition | Add a full `store` with that `id` somewhere |
| `The "store.seed" contains duplicate key (...)` | Seed PK collision | Make seed keys unique |
| `The "store.seed" contains duplicate unique field "X"` | Seed unique collision | Make unique values unique in seed (`X` may be `tenantId+email` for composites) |
| `The "store.unique.fields[0]" object cannot include both "field" and "fields"` | Mixed simple/composite shape | Use either `field` or `fields`, not both |
| `The "store.unique.fields[0].fields" must be a non-empty array of strings` | Empty/invalid composite (incl. non-strings) | Provide `["a","b"]` |
| `The "store.unique.fields[0]" object must include "field" or "fields"` | Incomplete unique entry | Add `field` or `fields` |
| `The "store.unique.fields[0]" property contains unknown key "X"` | Typo in unique entry | Only `field`, `fields`, `conflict` |
| `The "store.unique.fields[1]" duplicates the unique constraint "email"` | Same unique twice | Keep one entry per constraint |
| `The "store.unique.fields[0]" matches the store key and is redundant` (warning) | Unique equals PK | Remove the redundant unique or keep intentionally |
| `The "action" must be one of: list, get, create, update, patch, delete, restore` | Unknown action | Use a supported action |
| `The "action" "restore" requires "store.softDelete" to be enabled` | `restore` without soft delete | Enable `store.softDelete` or use another action |
| `The "store.softDelete" property must be a boolean or an object` | Invalid softDelete shape | Use `true` or `{ "field": "deletedAt" }` |
| `The "store.softDelete.field" must be a non-empty string` | Empty/missing field | Provide a non-empty field name |
| `The "store.softDelete" property contains unknown key "X"` | Typo / unsupported key | Only `field` is allowed |
| `The "store.softDelete.field" "X" cannot overlap store key fields` | Soft-delete field is a key field | Choose another field name |
| `The "store.softDelete.field" "X" cannot overlap store unique fields` | Soft-delete field is unique | Choose another field name |
| `The "store.relations" property must be an object` | `relations` is not an object | Use `{ "userId": "users" }` or field objects |
| `The "store.relations.X.store" must be a non-empty string` | Missing target | Set `"store": "‹target-id›"` |
| `The "store.relations.X.onDelete" must be one of: restrict, cascade, setNull` | Invalid policy | Use one of the three values (or `{ "action": "…" }`) |
| `The "store.relations.X" cannot use onDelete "setNull" when required is true` | Conflicting options | Drop `required` or use another `onDelete` |
| `The store relation "A.X" targets unknown store "B"` | Target not defined | Define store `B` (or fix the id) |
| `The store relation "A.X" targets composite key store "B" and must set "join.from" and "join.to"` | Simple FK shape toward composite target | Add matching `join.from` + `join.to` |
| `The "store.relations.X.join.from" and "store.relations.X.join.to" must have the same length` | Composite join length mismatch | Align both arrays |
| `The store relation "A.X" requires store "B" to declare a type "one" relation…` | `type: "many"` without reverse FK on child | Add the matching `one` relation on B |
| `The store "A" seed[n] relation "X" references missing or soft-deleted "B" record` | Bad seed FK | Fix seed ids or seed the target first |
| `The store conflict response "X" does not exist in responses` | Named FK/`onDelete.conflict` response missing on mutate or parent delete | Add that `name` to the method’s `responses` |
| `The "store.notFound" property must be an object` | Invalid notFound shape | Use `{ "response": "missing" }` |
| `The "store.notFound" property contains unknown key "X"` | Typo / unsupported key | Only `response` is allowed |
| `The "store.notFound" object must include "response"` | Missing response name | Add `"response": "…"` |
| `The "store.notFound.response" must be a non-empty string` | Empty/invalid response | Provide a non-empty name |
| `The store notFound response "X" does not exist in responses` | Named notFound response missing on get/update/patch/delete/restore | Add that `name` to the method’s `responses` |
| `The "action" property requires a "store" on the endpoint` | Action without store | Add `store` to the endpoint |
| `The "action" property cannot be used together with "proxy"` | Action + proxy | Remove one of them |
| `The store conflict response "X" does not exist in responses` | Missing conflict response name | Add a response with that `name` on mutating methods |
| `The "store.persist" property must be a boolean or an object` | Invalid persist shape | Use `true` or `{ "enabled": true }` |
| `The "store.persist.enabled" must be a boolean` | Missing/invalid enabled | Set `"enabled": true/false` |
| `The "store.persist.file" must be a non-empty string` | Empty custom path | Provide a non-empty relative path under the mock files root |
| `The "store.persist.file" must be a relative path under the mocks directory` | Absolute path or `..` escape | Use a relative path like `custom/state.json` (no `..`, not absolute) |
| `The "store.list" property must be a boolean or an object` | Invalid `list` shape | Use `true`, `{}`, or a config object |
| `The "store.list" property contains unknown key "X"` | Typo / unsupported key | Only `page`, `pageSize`, `offset`, `limit`, `cursor`, `sort`, `order`, `filter` |
| `The "store.list.cursor" property must be a boolean or an object` | Invalid cursor shape | Use `true` or `{ "query", "limit" }` |
| `The "store.list.filter" property must be an array or an object` | Invalid filter shape | Use `["status"]` or `{ "fields", "or", "search" }` |
| `The "store.list.filter" object must include "fields", "or", and/or "search"` | Empty filter object | Add at least one of those keys |
| `The "store.list.filter.fields[0].op" must be one of: ...` | Unknown operator | Use `eq`, `ne`, `gt`, `gte`, `lt`, `lte`, or `in` |
| `The "store.list.sort.fields" must be a non-empty array of strings` | Empty whitelist | List allowed sort fields or omit `fields` |
| `Query "sort" field must be one of: ...` | Runtime: sort field not whitelisted | Use a field from `sort.fields` |
| `Query "minPrice" must be a number` (your `gte`/`gt`/`lt`/`lte` query) | Runtime: non-numeric compare | Pass a numeric query value |
| `Query "name" must not be empty` | Runtime: empty `in` / empty filter param | Omit the param or pass values |
| `Query "starting_after" is invalid` (or your cursor query name) | Runtime: bad cursor token | Omit cursor or pass a token from `{{nextCursor}}` |

**Example:**

❌ **Invalid** - Invalid statusCode and missing body:
```json
{
  "name": "success",
  "statusCode": "not-a-number"
}
```

✅ **Valid** - Valid statusCode and body included:
```json
{
  "name": "success",
  "statusCode": "200",
  "body": {
    "data": "example"
  }
}
```

✅ **Valid** - `body` can be `null` (useful for 204 No Content responses):
```json
{
  "name": "deleted",
  "statusCode": "204",
  "body": null
}
```

### Warnings

Warnings don't prevent the server from starting but indicate potential issues:

| Warning Message                                         | Description                             | Action                                                                                                     |
|---------------------------------------------------------|-----------------------------------------|------------------------------------------------------------------------------------------------------------|
| `The "statusCode" X is not a standard HTTP status code` | Status code is not in the IANA registry list | Unassigned codes like `299` or `599` still work, but prefer IANA-registered codes |

**Standard HTTP Status Codes:**

- **1xx**: 100, 101
- **2xx**: 200, 201, 202, 204
- **3xx**: 300, 301, 302, 304
- **4xx**: 400, 401, 403, 404, 405, 409, 422
- **5xx**: 500, 501, 502, 503

### System Errors

These errors occur when there are issues with the server or system:

| Error Message                      | Description                       | Solution                                                                        |
|------------------------------------|-----------------------------------|---------------------------------------------------------------------------------|
| `Port must be a valid number`      | Port value is not a valid number  | Use a valid port number: `mock-server start --port 3000`                        |
| `Port must be between 1 and 65535` | Port is outside valid range       | Use a port number between 1 and 65535: `mock-server start --port 3000`          |
| `Port X is already in use. Please use a different port.` | Port is already in use | The server validates port availability **before** loading mocks. If the port is occupied, it fails immediately without processing mock files. Use a different port: `mock-server start --port 3001` or stop the service using that port. |
| `Proxy must be a valid http or https URL` | CLI `--proxy` is not a valid URL | Use a full URL: `mock-server start --proxy https://api.staging.com` |

**Note:** Port validation happens first, before loading or validating any mock files. This ensures faster feedback when a port is unavailable and prevents unnecessary file processing.

### Runtime Proxy Errors

These responses happen while the server is running (HTTP `502`), not during mock-file validation:

| Response / Message | When it happens | Solution |
|--------------------|-----------------|----------|
| `{ "message": "Proxy is set to true but no method-level proxy or --proxy target is configured" }` | A response uses `"proxy": true` but neither the method nor CLI defines a target | Set method-level `"proxy": "https://..."` or start with `--proxy https://...` |
| `{ "message": "Proxy request failed" }` | Upstream is unreachable or the proxied request fails | Check the target URL, network/DNS, and that the upstream accepts the forwarded path |

### Watch Mode Issues

**Watch mode not restarting:**

- Check that you're saving files in the mock files directory used by `mock-server start`
- Ensure files have `.json` extension
- Fix any validation errors that prevent restart
- Check console for error messages
- Ensure the file is saved completely (some editors save in multiple steps)

### Complete Error Example

Here's what a complete error output looks like:

```
Error:
File: my-mock.json
  Invalid path. Allowed characters: letters, numbers, "-", "_", ".", "~", "/", and parameters like ":id".
  [GET] data/users: Missing property "body"
  [POST] data/products: The "nameResponse" "NotFound" does not exist in responses
  [GET] data/products: The "statusCode" "abc" is not a valid number

Warnings:
File: my-mock.json
  [GET] data/users: The "statusCode" 299 is not a standard HTTP status code
```

**Command-line error example:**

```
✖ Port must be a valid number
```

or

```
✖ Port must be between 1 and 65535
```

### Quick Validation Checklist

Before starting the server, verify:

- **Port availability** - The port is validated first, before loading any mocks. Ensure the port number is valid (between 1 and 65535) and not in use by another service
- All JSON files have valid syntax
- All endpoints use valid characters
- All HTTP methods are uppercase: `GET`, `POST`, `PUT`, `PATCH`, `DELETE`
- All methods have `nameResponse` and `responses` properties
- All responses have `name`, `statusCode`, and `body` properties (body can be `null`)
- `nameResponse` matches a `name` in the responses array
- `statusCode` is a valid number
- `headers` (if provided) is an object

**Note:** Port validation happens automatically when you start the server. If the port is unavailable, you'll get an immediate error before any mock files are processed.

---

## Contributing 🤝

Contributions are welcome! If you'd like to contribute:

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

Please make sure your code follows the existing style.

---

## FAQ ❓

**Q: Can I use this in production?**  
A: This library is designed for development and testing purposes. It's not recommended for production use.

**Q: Does it support WebSocket?**  
A: Currently, only HTTP/HTTPS methods (GET, POST, PUT, PATCH, DELETE) are supported.

**Q: Can I use TypeScript types?**  
A: Yes! The library is built with TypeScript and includes type definitions.

**Q: How do I change the response dynamically?**  
A: Simply change the `nameResponse` value in your mock JSON file and the server will use watch mode to reload
automatically.

**Q: Can I have multiple mock files?**  
A: Yes! You can have as many JSON files as you want in the mock files directory. All will be loaded automatically.

---

## License 📖

**http-mock-json** is MIT licensed.

---

## Author ✒️

[Alejandro Rodriguez Romero](https://www.linkedin.com/in/alejandro-rodriguez-romero/)

---

## Support 💬

- 📧 **Issues**: [GitHub Issues](https://github.com/alejandrorodrom/http-mock-json/issues)
- 🐛 **Bug Reports**: Please use the GitHub issue tracker
- 💡 **Feature Requests**: We'd love to hear your ideas!
