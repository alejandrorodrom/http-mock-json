<p align="center">
  <img src="assets/title.png" alt="http-mock-json" width="800" />
</p>

![npm version](https://img.shields.io/npm/v/http-mock-json?style=flat-square)
![npm downloads](https://img.shields.io/npm/dm/http-mock-json?style=flat-square)
![license](https://img.shields.io/npm/l/http-mock-json?style=flat-square)
![GitHub stars](https://img.shields.io/github/stars/alejandrorodrom/http-mock-json?style=flat-square)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat-square&logo=typescript&logoColor=white)
![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen?style=flat-square)

> Allows to create a mock server and test the frontend without depending on the backend.

## Table of Contents

- [Features](#features)
- [Quick Start](#quick-start)
- [Installation and use](#installation-and-use-)
- [Commands](#commands-)
- [Validation System](#validation-system-)
- [Advanced examples](#advanced-examples)
- [Real-world projects](#real-world-projects-)
- [Troubleshooting](#troubleshooting-)
- [License](#license-)

## Features

**Key Features:**

- **Zero Configuration** - Get started in seconds with interactive setup
- **Automatic Validation** - Comprehensive validation system prevents errors before they happen
- **Hot Reload** - Watch mode automatically restarts server on file changes
- **Multiple Responses** - Simulate different scenarios (success, error, etc.) for the same endpoint
- **Request Matching** - Select responses by route params, query params and/or request body
- **Request Validation** - Validate request `body`/`query` shape with rules (`type`, `minLength`, `format`, nested objects, etc.)
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
    - Create a `mocks` folder in your project root (or in the specified path)
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
   | body         | ✅*      | any            |                                          | Required unless the response uses `proxy`                                  |
   | match        | ❌       | object         | `{ "params": { "id": "1" } }`            | Request matching rules (`params`, `query` and/or `body`). First match wins |
   | match.params | ❌       | object         | `{ "id": "1" }`                          | Partial match against route params (e.g. `/users/:id`)                     |
   | match.query  | ❌       | object         | `{ "page": "1" }`                        | Partial match against request query params                                 |
   | match.body   | ❌       | any            | `{ "email": "a@b.com" }`                 | Partial match against request body                                         |
   | delay        | ❌       | number         | `500`                                    | Latency in ms for this response (overrides method-level `delay`)           |
   | proxy        | ❌       | string/object/true | `true`, `"https://api.com"`, `{ "target": "...", "path": "/v2/users" }` | Forward the original request to a real backend |

5. Edit the mock file to add your response data.

   Open the created JSON file (e.g., `mocks/animals.json`) and fill in the `body` objects with your mock data:

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

   **Example:**
   ```
   mock-server start --port 3001 --path apps/folder1 --proxy https://api.staging.com
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
8. **JSON structure**: Ensures files contain valid JSON objects

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

---

## Recommendations 📋

* Review the advanced examples.
* A single json file can contain many mocks.
* There can be many json files each with their respective mocks.
* The server validates your mocks automatically - fix any errors before the server can start.

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

All listed conditions must match.

### Example 8: Request validation

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

See Example 8 above for a full `request` configuration you can paste into your project.

### Example 9: Proxy to a real backend

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

---

## Real-world projects 🏢

The [Advanced examples](#advanced-examples) teach one feature at a time. This section shows **product-style scenarios** you can paste into your own `mocks/*.json` and adapt to your frontend routes.

### What each scenario covers

| Scenario | Features used | Frontend focus |
|----------|---------------|----------------|
| SaaS signup + org invite | `request` + `match` | Form validation vs business errors (`409`, `403`) |
| Checkout resilience | `match` + `delay` + headers | `402` / `429` / `503`, retries, idempotency |
| Multi-tenant RBAC | `match.params` + `match.query` | Admin vs member, `403` across orgs |
| Auth login | `request` + `match` + `delay` | Invalid payload vs locked account vs MFA |
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

1. Bad email/password shape → `422` (`request` + `invalidResponse`)
2. Valid credentials + locked email → `423` (`match`)
3. Valid credentials + MFA user → `401` MFA required
4. Otherwise → `200` token

```json
{
  "api/v1/auth/login": {
    "POST": {
      "nameResponse": "ok",
      "delay": 50,
      "request": {
        "body": {
          "email": { "type": "string", "format": "email" },
          "password": { "type": "string", "minLength": 8, "maxLength": 72 },
          "otp?": { "type": "string", "pattern": "^\\d{6}$" }
        },
        "invalidResponse": "validation-error"
      },
      "responses": [
        {
          "name": "ok",
          "statusCode": 200,
          "delay": 120,
          "headers": { "X-Auth": "session" },
          "body": { "token": "jwt-ok" }
        },
        {
          "name": "locked",
          "statusCode": 423,
          "match": { "body": { "email": "locked@example.com" } },
          "body": { "code": "ACCOUNT_LOCKED" }
        },
        {
          "name": "mfa-required",
          "statusCode": 401,
          "match": {
            "body": { "email": "mfa@example.com", "password": "secret123" }
          },
          "body": { "code": "MFA_REQUIRED" }
        },
        {
          "name": "validation-error",
          "statusCode": 422,
          "delay": 140,
          "body": { "message": "Invalid request", "errors": [] }
        }
      ]
    }
  }
}
```

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

1. Paste the JSON into a file under your project’s `mocks/` folder (created by `mock-server init`).
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
| `The directory named mocks does not exist`  | The mocks folder is missing             | Run `mock-server init` to create the folder                         |
| `No files found`                            | No JSON files found in the mocks folder | Create at least one `.json` file in the `mocks` folder              |
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
| `The "match" property must be an object`     | `match` is not an object                | Use `"match": { "params": {...} }`, `"query": {...}` and/or `"body": {...}` |
| `The "match" property must include "params", "query" and/or "body"` | `match` is empty | Add at least `"params"`, `"query"`, or `"body"` inside `match` |
| `The "match.params" property must be an object` | `match.params` is not an object    | Use an object of route params: `"params": { "id": "1" }`       |
| `The "match.params" property must not be empty` | `match.params` is `{}`             | Add at least one route param key/value to match                |
| `The "match.query" property must be an object` | `match.query` is not an object        | Use an object of query keys/values: `"query": { "page": "1" }` |
| `The "match.query" property must not be empty` | `match.query` is `{}`                 | Add at least one query key/value to match                      |
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

- Check that you're saving files in the correct `mocks` folder
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
A: Yes! You can have as many JSON files as you want in the `mocks` folder. All will be loaded automatically.

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
