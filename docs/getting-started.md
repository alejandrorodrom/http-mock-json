# Installation and use 🔧

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
   | store.list   | ❌       | boolean/object | `true` / `false` / `{ page, pageSize, offset, limit, cursor, sort, order, filter }` | List engine for `action: "list"` (on by default when omitted / `true`): multi-sort, page/offset/cursor, filters (`eq`/`ne`/`gt`/`gte`/`lt`/`lte`/`in`, nested, `or`) + search. Use `false` for a plain full array. Response `body`/`headers` use placeholders (`{{items}}`, `{{next}}`, `{{nextCursor}}`, …) |
   | store.softDelete | ❌   | boolean/object | `true` or `{ "field": "deletedAt" }`     | Soft delete: `action: "delete"` sets the field (ISO); `list`/`get` hide items unless `?includeDeleted=true`; `action: "restore"` clears it |
   | store.relations | ❌  | object         | `{ "userId": "users" }` / `{ "orderRef": { "join": { "from", "to" } } }` / `{ "posts": { "type": "many", "join": { "from": "userId" } } }` | FK (`one`) + reverse embed (`many`); `join.from`/`join.to`; `?expand=` incl. nested (max depth 3) |
   | store.notFound | ❌    | object         | `{ "response": "missing-user" }`         | Named `404` response for missing / soft-deleted items (`get` / `update` / `patch` / `delete` / `restore`). Placeholders: `{{key}}`, `{{message}}`, each key field |
   | HTTP Method  | ✅       | string         | `GET`, `POST`, `PUT`, `PATCH`, `DELETE`  | HTTP verb (must be uppercase)                                              |
   | nameResponse | ✅       | string         | `success`, `error`, `error-401`          | Fallback response when no `match` applies (must exist in responses array) |
   | request      | ❌       | object         | `{ "payload": { "email": { "type": "string", "format": "email" } } }` | Validate incoming payload / query / headers before selecting a response. See [body compatibility](body-compatibility.md#body-compatibility-request--response-) |
   | request.payload | ❌    | object         | `{ "avatar": { "type": "file", "format": ["png", "jpeg"] } }` | Field map (or a single rule for raw/text). Always `{ "type": ... }`; files use `type: "file"` + `format` |
   | request.as   | ❌       | string         | `"multipart"`                            | Omit = auto from Content-Type; if set, require that mode before validating payload |
   | request.query| ❌       | object         | `{ "page?": { "type": "number", "min": 1 } }` | Field rules for query params (basic number/boolean coercion)         |
   | request.headers | ❌    | object         | `{ "authorization": { "type": "string" } }` | Field rules for HTTP headers (case-insensitive names) |
   | request.error | ❌      | object         | `{ "response": "invalid", "format": "map" }` | Grouped error output (`response`, `format`, `detail`, `key`) |
   | delay        | ❌       | number         | `300`                                    | Default latency in ms for all responses of this method (overridable per response) |
   | proxy        | ❌       | string/object  | `"https://api.staging.com"`              | Default proxy target for responses with `"proxy": true`                    |
   | responses    | ✅       | array          |                                          | A mock can have multiple responses (array), each identified with a `name`. |
   | name         | ✅       | string         |                                          | Response name (unique within the responses array)                          |
   | statusCode   | ✅*      | string/number  | `200`, `"200"`, `404`, `"404"`          | Required unless the response uses `proxy`                                  |
   | headers      | ❌       | object         | `{ "Content-Type": "application/json" }`  | Headers in json format (optional)                                          |
   | encoding     | ❌       | string         | `"file"`, `"base64"`                     | Response-only: how to interpret `body` (omit = JSON). Incompatible with `proxy` / `action` on the same response. See [response encoding](body-compatibility.md#response-encoding) |
   | body         | ✅*      | any            |                                          | Required unless the response uses `proxy` or `action`. With `encoding: "file"` = path under mocks root; with `"base64"` = string |
   | action       | ❌       | string         | `"list"`, `"get"`, `"create"`, `"update"`, `"patch"`, `"delete"`, `"restore"` | Store op instead of fixed `body` (requires `store`). Incompatible with `proxy` and with `encoding` on the same response |
   | match        | ❌       | object         | `{ "params": { "id": "1" } }`            | Request matching rules (`params`, `query`, `body`, `headers`, `multipart` and/or `call`). First match wins |
   | match.params | ❌       | object         | `{ "id": "1" }`                          | Partial match against route params (e.g. `/users/:id`)                     |
   | match.query  | ❌       | object         | `{ "page": "1" }`                        | Partial match against request query params                                 |
   | match.body   | ❌       | any            | `{ "email": "a@b.com" }`                 | Partial match against parsed body (JSON or urlencoded form fields)         |
   | match.headers | ❌      | object         | `{ "x-role": "admin" }`                  | Partial match against request headers (case-insensitive names)             |
   | match.multipart | ❌   | object         | `{ "title": "logo", "avatar": { "mimeType": "image/png" } }` | Partial match against multipart fields / file metadata |
   | match.call   | ❌       | number \| object | `1` or `{ "index": 1, "by": { "body": "email" }, "loop": true, "reset": true }` | Match by N-th hit (1-based). Number shorthand = `{ "index": N }`. See [Example 8](advanced-examples.md#example-8-match-by-call-count) |
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

## Recommendations 📋

* Need a ready-made JSON? Browse [Examples in this repository](examples.md#examples-in-this-repository-) and copy the one that matches what you need.
* Want a full explanation of a feature? Use [Advanced examples](advanced-examples.md#advanced-examples) and the [mutable store guide](store.md#mutable-store-).
* A single json file can contain many mocks.
* There can be many json files each with their respective mocks.
* For microservices or large APIs, use optional [folder organization](body-compatibility.md#example-11-folder-organization-mockconfigjson) with `mock.config.json`.
* The server validates your mocks automatically - fix any errors before the server can start.
* Prefer `request` for input shape and `store.unique` / conflict responses for business uniqueness (`409`).

---

