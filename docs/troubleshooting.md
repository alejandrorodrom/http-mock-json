# Troubleshooting 🔧

This section documents all possible errors and warnings you might encounter, organized by category.

### File-Level Errors

These errors occur when there are issues with the file structure or file system:

| Error Message                               | Description                             | Solution                                                            |
|---------------------------------------------|-----------------------------------------|---------------------------------------------------------------------|
| `The mocks directory does not exist`        | The mock files directory is missing     | Run `mock-server init` (or pass `-f` / `--path` to an existing dir) |
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
| `The "match" property must include "params", "query", "body", "headers", "multipart" and/or "call"` | `match` is empty | Add at least one of those keys inside `match` |
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
| `The "request" property must be an object` | `request` is not an object | Use `"request": { "payload": {...} }` and/or `"query": {...}` |
| `The "request" property must include "payload", "query" and/or "headers"` | Missing all of them | Add `payload`, `query`, and/or `headers` |
| `The "request.payload" property must be an object` | `payload` is not an object (and not a raw file/rule shorthand) | Use `"payload": { "email": "string" }` |
| `The "request.payload" property must not be empty` | `payload` is `{}` | Add at least one field rule |
| `The "request.query" property must be an object` | `query` is not an object | Use `"query": { "page?": { "type": "number" } }` |
| `The "request.query" property must not be empty` | `query` is `{}` | Add at least one field rule |
| `The "request.payload" contains an invalid field name` | Empty field name (e.g. `"?"`) | Use a real field name; `?` only as optional suffix |
| `field must be a type string or a rule object with "type"` | Invalid field schema | Use `"email": "string"` or `{ "type": "string", ... }` |
| `type must be one of: string, number, boolean, object, array, file` | Unknown `type` | Use one of the supported types |
| `string rules ... require type "string"` | `minLength`/`maxLength` on non-string | Set `"type": "string"` |
| `pattern requires type "string" or "file"` | `pattern` on other types | Use string or file |
| `range rules (min, max) require type "number"` | `min`/`max` on non-number | Set `"type": "number"` |
| `rules (minItems, maxItems) require type "array" or "file"` | Counts on wrong type | Use array or file |
| `items requires type "array"` | `items` on non-array | Set `"type": "array"` |
| `properties requires type "object"` | `properties` on non-object | Set `"type": "object"` |
| `properties must be a non-empty object` | `properties: {}` | Add nested fields |
| `minLength must be a non-negative number` | Negative bound | Use `0` or a positive number |
| `pattern is not a valid regular expression` | Broken regex | Fix the regex string |
| `pattern must be a non-empty string` | Empty/non-string pattern | Use a non-empty string regex |
| `format must be one of: email, uuid, url, date` | Unknown format | Use a supported format |
| `enum must be a non-empty array` | Empty enum | Add at least one allowed value |
| `enum values must be strings or numbers` | Invalid enum item types | Use only strings/numbers in `enum` |
| `message must be a string` | Non-string custom message | Use `"message": "..." ` |
| `request.error.response must be a non-empty string` | Missing/empty/non-string | Use a response `name` string |
| `request.error.response "X" does not exist in responses` | Unknown response name | Point to an existing response `name` |
| `request.error.format must be one of: array, map` | Invalid error format | Use `"array"` or `"map"` |
| `request.error.detail must be a non-empty string or object` | Empty/invalid template | Use a string or object of string templates |
| `request.error.detail object values must be strings` | Non-string template value | Use only string values in the object |
| `request.error.key must be a non-empty string` | Empty key | Use e.g. `"errors"` or `"fields"` |

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
| `The "encoding" property cannot be used together with "proxy" or "action"` | Encoding + proxy/action on same response | Use separate responses, or drop `encoding` / `proxy` / `action` |
| `The "encoding" property must be one of: file, base64` | Unknown encoding | Use `"file"` or `"base64"` |
| `The "body" property must be a string when encoding is "file"` (or `"base64"`) | Non-string body with encoding | Use a path string or base64 string |
| `The "request.body" property is not supported; use "payload"` | Legacy key | Rename to `payload` |
| `The "request.invalidResponse" property is not supported; use "error.response"` | Legacy key | Nest under `error` |
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
| `{ "message": "Proxy is set to true but no method, folder, root config, or --proxy target is configured" }` | A response uses `"proxy": true` but no method, folder, root config, or CLI target is set | Set method/folder/root `"proxy": "https://..."` or start with `--proxy https://...` |
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

