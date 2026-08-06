# Troubleshooting

Diagnostic catalog of **startup** failures/warnings and **runtime** surprises. Each entry goes from an observable symptom (often an exact message) to cause, fix, and a deeper README section.

Short Q&A lives in [FAQ](faq.md). Field and flag reference lives in the [README](../README.md)—not here.

Invalid fixtures under [`mocks/invalid/`](../mocks/invalid/) reproduce many startup errors. Cite them for comparison; do not copy them into a working mocks directory.

---

## How errors appear

**CLI / preflight** (before or instead of `Mock server is running`):

```text
✖ Port must be a valid number
```

**Mock validation** (files load, then fail):

```text
✖ Error:
File: method-errors.json
  Invalid HTTP method. Valid methods: GET, POST, PUT, PATCH, DELETE
  [GET] data/users: Missing property "body"
```

After printing that block the process throws internally with `Invalid mock configuration` (not always re-printed). Port checks run **before** mock loading.

**Warnings** (server may still start):

```text
⚠ Warnings:
File: …
  [GET] …: The "statusCode" 299 is not a standard HTTP status code
```

**Runtime** failures return HTTP JSON (for example `502` / `500` / `400` / `413`) with a `message` field, or change which mock response you get.

---

## Port, path, and init

### `Port must be a valid number`

| | |
|---|---|
| **Symptom** | Start exits immediately; no mock files processed. |
| **Cause** | `--port` / `-p` is not numeric (e.g. `abc`). |
| **Fix** | Pass an integer port: `mock-server start -p 3000`. |
| **See** | [CLI](../README.md#cli-reference) |

### `Port must be between 1 and 65535`

| | |
|---|---|
| **Symptom** | Start exits; CLI or `mock.config.json` `"port"` out of range. |
| **Cause** | Value outside `1..65535` (CLI or config; config also requires an integer). |
| **Fix** | Use a port in range. Config may also say `The "port" must be an integer`. |
| **See** | [CLI](../README.md#cli-reference), [Mock config](../README.md#mock-config-reference) |

### `Port X is already in use. Please use a different port.`

| | |
|---|---|
| **Symptom** | Start fails before loading mocks. |
| **Cause** | Another process is listening on that port. |
| **Fix** | Free the port or choose another (`-p 3001`). |
| **See** | [CLI](../README.md#cli-reference) |

### `The mocks directory does not exist`

| | |
|---|---|
| **Symptom** | Start fails; directory from `-f` / `--path` (default `mocks`) is missing. |
| **Cause** | Path does not exist, or you still treat `-f` as “parent of `mocks/`” (pre-2.0). |
| **Fix** | Run `mock-server init`, or point `-f` at the **mocks directory itself** (e.g. `-f apps/api/mocks`). Since 2.0.0, `-f apps/folder1` means `apps/folder1`, not `apps/folder1/mocks`. |
| **See** | [CLI](../README.md#cli-reference), [CHANGELOG](../CHANGELOG.md) (`2.0.0`) |

### `No files found`

| | |
|---|---|
| **Symptom** | Directory exists but start fails. |
| **Cause** | No discoverable `.json` mock files (empty folder, or all excluded by `mock.config.json`). |
| **Fix** | Add at least one mock `.json`, or fix `include` / `exclude` / folder config. In watch mode, deleting the last mock also surfaces this during restart. |
| **See** | [CLI](../README.md#cli-reference), [Mock config](../README.md#mock-config-reference) |

### `The file "package.json" was not found`

| | |
|---|---|
| **Symptom** | `init` cannot add an npm start script. |
| **Cause** | Current working directory has no `package.json`. |
| **Fix** | Run init from a Node project root, or skip adding the script. |
| **See** | [CLI](../README.md#cli-reference) |

### Init / add OS errors (`ENOENT`, `EISDIR`, `ENOTDIR`)

| | |
|---|---|
| **Symptom** | `init` or `add` fails with a Node/OS code such as `ENOENT`, `EISDIR`, or `ENOTDIR`. |
| **Cause** | Path does not exist, a file was used where a directory was expected (or the reverse), or write target is blocked. |
| **Fix** | Run from a writable project root; ensure the mocks path is a directory; fix permissions. |
| **See** | [CLI](../README.md#cli-reference) |

### `Reset store ids must be a non-empty comma-separated list`

| | |
|---|---|
| **Symptom** | Start fails when using `--reset-store`. |
| **Cause** | Flag value is empty or only commas (e.g. `,,,`). |
| **Fix** | Pass real store ids: `--reset-store notes,users`. |
| **See** | [CLI](../README.md#cli-reference), [Store](../README.md#store-reference) |

### `Proxy must be a valid http or https URL` (CLI)

| | |
|---|---|
| **Symptom** | Start rejects `--proxy`. |
| **Cause** | Global CLI proxy is not an `http://` or `https://` URL. |
| **Fix** | Use a full URL: `--proxy https://api.staging.example`. |
| **See** | [CLI](../README.md#cli-reference) |

---

## Startup: mock file load

Bad examples: [`mocks/invalid/file-syntax-error.json`](../mocks/invalid/file-syntax-error.json), [`file-not-object.json`](../mocks/invalid/file-not-object.json), [`file-empty-endpoints.json`](../mocks/invalid/file-empty-endpoints.json).

### `JSON syntax error: …`

| | |
|---|---|
| **Symptom** | `File: <name>.json` then a parser message (position/token). |
| **Cause** | File is not valid JSON. |
| **Fix** | Fix commas, brackets, quotes; re-validate with a JSON tool. |
| **See** | [Mock file](../README.md#mock-file-reference), [Validation](../README.md#validation-reference) |

### `The file must contain a valid JSON object`

| | |
|---|---|
| **Symptom** | Root value is an array or non-object. |
| **Cause** | Mock files must be a single JSON object of endpoints. |
| **Fix** | Wrap routes in `{ … }`. |
| **See** | [Mock file](../README.md#mock-file-reference) |

### `The file does not contain any endpoints`

| | |
|---|---|
| **Symptom** | File parses as `{}` (or only non-endpoint keys). |
| **Cause** | No route keys with methods. |
| **Fix** | Add at least one endpoint object. |
| **See** | [Concepts](../README.md#concepts), [Mock file](../README.md#mock-file-reference) |

### `Error processing file: …`

| | |
|---|---|
| **Symptom** | Generic read/process failure for a file. |
| **Cause** | Permissions, I/O, or unexpected read error. |
| **Fix** | Ensure the file is readable; check the appended system message. |
| **See** | [CLI](../README.md#cli-reference) |

### `The folder "<name>" does not exist inside mocks`

| | |
|---|---|
| **Symptom** | `mock.config.json` references a missing folder. |
| **Cause** | `folders` entry does not match a real subdirectory. |
| **Fix** | Create the folder or remove/rename the config key. |
| **See** | [Mock config](../README.md#mock-config-reference) |

---

## Startup: endpoint, method, and response shape

Bad examples: [`mocks/invalid/endpoint-errors.json`](../mocks/invalid/endpoint-errors.json), [`method-errors.json`](../mocks/invalid/method-errors.json), [`method-responses-not-array.json`](../mocks/invalid/method-responses-not-array.json), [`response-errors.json`](../mocks/invalid/response-errors.json).

### `Invalid path. Allowed characters: letters, numbers, "-", "_", ".", "~", "/", and parameters like ":id".`

| | |
|---|---|
| **Symptom** | Route key rejected (e.g. `#` in the path). |
| **Cause** | Path characters outside the allowed set. |
| **Fix** | Use `/` segments and `:param` style params only. |
| **See** | [Mock file](../README.md#mock-file-reference), [Concepts](../README.md#concepts) |

### `Must be an object` / `Does not contain any HTTP methods`

| | |
|---|---|
| **Symptom** | Endpoint value wrong or empty. |
| **Cause** | Endpoint is not `{ "GET": … }`-style; or no methods present. |
| **Fix** | Use an object with at least one uppercase HTTP method. |
| **See** | [Mock file](../README.md#mock-file-reference) |

### `Invalid HTTP method. Valid methods: GET, POST, PUT, PATCH, DELETE`

| | |
|---|---|
| **Symptom** | Method key rejected (e.g. `HEAD`, `OPTIONS`, or a typo). |
| **Cause** | Method is not one of the five supported names. Keys are compared case-insensitively and normalized (lowercase `get` / `post` / … are accepted). |
| **Fix** | Use `GET`, `POST`, `PUT`, `PATCH`, or `DELETE` (any casing). See [`14-http-methods-case.json`](../mocks/14-http-methods-case.json). |
| **See** | [Mock file](../README.md#mock-file-reference) |

### Missing method / response scaffolding

| | |
|---|---|
| **Symptom** | Messages such as `Missing property "nameResponse"`, `Missing property "responses"`, `The "responses" property must be an array`, `The responses array is empty`, `Missing property "name"`, `Missing property "statusCode"`, `Missing property "body"`, `The response must be an object`, `The method must be an object`. |
| **Cause** | Incomplete method or response objects. |
| **Fix** | Each method needs `nameResponse` + non-empty `responses[]`; each response needs `name`, `statusCode`, and `body` (`null` allowed). |
| **See** | [Mock file](../README.md#mock-file-reference), [Validation](../README.md#validation-reference) |

### `The "nameResponse" "X" does not exist in responses`

| | |
|---|---|
| **Symptom** | Startup fails; `nameResponse` spelling mismatch. |
| **Cause** | Default/fallback response name is not in `responses[].name`. |
| **Fix** | Align `nameResponse` with an existing `name`. |
| **See** | [Concepts](../README.md#concepts), [Mock file](../README.md#mock-file-reference) |

### `The "statusCode" "X" is not a valid number` / delay number errors

| | |
|---|---|
| **Symptom** | `The "statusCode" "…" is not a valid number`; `The "delay" "…" is not a valid number`; `The "delay" must be greater than or equal to 0`. |
| **Cause** | Non-numeric status/delay, or negative delay. |
| **Fix** | Use numeric status (`200` or `"200"`); delay ≥ 0 milliseconds. |
| **See** | [Validation](../README.md#validation-reference) |

### `The "headers" property must be an object`

| | |
|---|---|
| **Symptom** | Response or config headers rejected. |
| **Cause** | `headers` is an array/string/etc. |
| **Fix** | Use a string-to-string object. |
| **See** | [Mock file](../README.md#mock-file-reference) |

### `Duplicate route [METHOD] /path (also defined in …)`

| | |
|---|---|
| **Symptom** | Same method+route registered twice with `strictDuplicates` enabled. |
| **Cause** | Overlapping definitions across files/folders. |
| **Fix** | Remove the duplicate, change the path, or disable `strictDuplicates` only if intentional. |
| **See** | [Mock file](../README.md#mock-file-reference), [Concepts](../README.md#concepts) |

---

## Startup: `match` configuration

Bad example: [`mocks/invalid/match-errors.json`](../mocks/invalid/match-errors.json).

### Empty or wrong-typed `match`

| | |
|---|---|
| **Symptom** | `The "match" property must be an object`; `… must include "params", "query", "body", "headers", "multipart" and/or "call"`; empty/non-object `match.params` / `query` / `headers` / `multipart`. |
| **Cause** | `match` present but unusable. |
| **Fix** | Provide at least one non-empty `match` object or a valid `call`. |
| **See** | [Concepts](../README.md#concepts), [Validation](../README.md#validation-reference) |

### Invalid `match.call`

| | |
|---|---|
| **Symptom** | `The "match.call" property must be a positive integer (>= 1) or an object`; `… object must include "index" and/or "reset": true`; `A "match.call" with only "reset": true must also include "params", "query", "body", "headers" and/or "multipart"`; `All "match.call.by" values in a method must be identical`; bad `index` / `loop` / `reset` / `by`. |
| **Cause** | Call sequencing config is inconsistent. |
| **Fix** | Use `1` or `{ "index": 1 }`; keep `by` identical across responses; never use reset-only catch-alls without another `match` rule. |
| **See** | [Concepts](../README.md#concepts), [Validation](../README.md#validation-reference) |

### Warning: `When "match.call.loop" is true, "index" values should be contiguous from 1 to max`

| | |
|---|---|
| **Symptom** | Warning only; server can start. |
| **Cause** | Sparse indexes with `loop: true`. |
| **Fix** | Prefer contiguous `1..N` indexes. |
| **See** | [Concepts](../README.md#concepts) |

---

## Startup & migration: `request`, body, and encoding

Bad example: [`mocks/invalid/request-errors.json`](../mocks/invalid/request-errors.json). Breaking renames: [CHANGELOG 4.0.0](../CHANGELOG.md).

### `The "request.body" property is not supported; use "payload"`

| | |
|---|---|
| **Symptom** | Startup fails on pre-4.0 mocks. |
| **Cause** | Legacy `request.body` key. |
| **Fix** | Rename to `request.payload`. Also migrate flat keys: `invalidResponse` → `error.response`, `errorFormat` → `error.format`, `errorDetail` → `error.detail`, `errorDetailsKey` → `error.key`. |
| **See** | [Body compatibility](../README.md#body-compatibility), [Validation](../README.md#validation-reference), [CHANGELOG](../CHANGELOG.md) |

### `The "request.invalidResponse" property is not supported; use "error.response"` (and siblings)

| | |
|---|---|
| **Symptom** | Same class of 4.0 migration errors for `errorFormat` / `errorDetail` / `errorDetailsKey`. |
| **Cause** | Flat error options removed. |
| **Fix** | Nest under `request.error.{ response, format, detail, key }`. |
| **See** | [Validation](../README.md#validation-reference), [CHANGELOG](../CHANGELOG.md) |

### Request schema / `as` / file rules

| | |
|---|---|
| **Symptom** | Messages under `request.payload.*` / `request.query.*` / `request.as` / `request.error.*` (types, formats, enums, empty objects, MIME `format`, file rules, etc.). |
| **Cause** | Invalid request validation config. |
| **Fix** | Use supported `type` values; put file fields under `"as": "multipart"`; whole-body rules need `"as": "text"` or `"raw"`; point `error.response` at a real response **without** `encoding`. |
| **See** | [Validation](../README.md#validation-reference), [Body compatibility](../README.md#body-compatibility) |

Notable real strings from e2e:

- `The "request.as" must be one of: json, form, multipart, raw, text`
- `The "request.payload" fields with type "file" require "as": "multipart"`
- `The "request.payload" rule object requires "as": "text" or "as": "raw" (or use type "file")`
- `The "request.error.response" cannot reference a response with "encoding"`
- `The "request.payload.email.format" must be one of: email, uuid, url, date`

### Encoding conflicts at startup

| | |
|---|---|
| **Symptom** | `The "encoding" property cannot be used together with "proxy" or "action"`; `The "encoding" property must be one of: file, base64`; `The "body" property must be a string when encoding is "file"` / `"base64"`; `The "body" property must be a non-empty path string when encoding is "file"`. |
| **Cause** | Binary response encoding misconfigured or combined with proxy/action. |
| **Fix** | Use separate responses; path relative to mocks root for `file`. |
| **See** | [Body compatibility](../README.md#body-compatibility), [Mock file](../README.md#mock-file-reference) |

---

## Startup: store, action, relations, soft-delete

Bad examples: [`mocks/invalid/store-errors.json`](../mocks/invalid/store-errors.json), [`store-relations-errors.json`](../mocks/invalid/store-relations-errors.json).

### Store id / definition / seed

| | |
|---|---|
| **Symptom** | `The "store" property must be an object`; `The "store.id" must be a non-empty string`; `The store "X" is already defined`; `The store "X" is referenced but not defined`; `The "store.seed" contains duplicate key (…)`; `The "store.seed" contains duplicate unique field "…"`. |
| **Cause** | Broken store wiring or colliding seed data. |
| **Fix** | Define a store once with seed/key/unique; other routes reference `{ "id": "…" }` only; make seed keys/uniques unique. |
| **See** | [Store](../README.md#store-reference), [Validation](../README.md#validation-reference) |

### Action constraints

| | |
|---|---|
| **Symptom** | `The "action" must be one of: list, get, create, update, patch, delete, restore`; `The "action" property requires a "store" on the endpoint`; `The "action" property cannot be used together with "proxy"`; `The "action" "restore" requires "store.softDelete" to be enabled`. |
| **Cause** | Action without store, with proxy, or restore without soft-delete. |
| **Fix** | Attach `store`, drop proxy on that response, enable `softDelete` for `restore`. |
| **See** | [Store](../README.md#store-reference) |

### Soft-delete field rules

| | |
|---|---|
| **Symptom** | `The "store.softDelete" property must be a boolean or an object`; `…field" must be a non-empty string`; overlap with key/unique (`cannot overlap store key fields` / `unique fields`); relation local fields overlapping `softDelete.field`. |
| **Cause** | Soft-delete marker collides with identity/unique/relation fields. |
| **Fix** | Choose a dedicated field (default `deletedAt`). |
| **See** | [Store](../README.md#store-reference) |

### Persist path validation

| | |
|---|---|
| **Symptom** | `The "store.persist" property must be a boolean or an object`; `The "store.persist.enabled" must be a boolean`; `The "store.persist.file" must be a non-empty string`; `The "store.persist.file" must be a relative path under the mocks directory`. |
| **Cause** | Absolute path, `..` escape, or empty custom file. |
| **Fix** | Relative path under the mocks root (e.g. `custom/notes.json`). |
| **See** | [Store](../README.md#store-reference) |

### `store.notFound` shape

| | |
|---|---|
| **Symptom** | `The "store.notFound" property must be an object`; `… contains unknown key "…"`; `The "store.notFound" object must include "response"`; `The "store.notFound.response" must be a non-empty string`. |
| **Cause** | `notFound` is mistyped or incomplete. |
| **Fix** | Use `{ "response": "<name>" }` pointing at a response on get/update/patch/delete/restore methods that need it. |
| **See** | [Store](../README.md#store-reference), [Validation](../README.md#validation-reference) |

### Missing conflict / notFound response names

| | |
|---|---|
| **Symptom** | Startup: `The store conflict response "X" does not exist in responses`; `The store notFound response "X" does not exist in responses`. Rare runtime throw if config diverges: `Store conflict response "…" was not found in the responses array` / `Store notFound response "…" was not found in the responses array`. |
| **Cause** | Named responses for unique/FK/`notFound` are not in that method’s `responses`. |
| **Fix** | Add the named response on the mutating/get method; restart after edits. |
| **See** | [Store](../README.md#store-reference), [Validation](../README.md#validation-reference) |

### Relations integrity

| | |
|---|---|
| **Symptom** | Unknown target store; composite join missing `join.from`/`join.to`; length mismatch; `type: "many"` without reverse `one`; seed FK missing/soft-deleted; `cannot use onDelete "setNull" when required is true`; embed conflicts. |
| **Cause** | Relation graph inconsistent across stores/seed. |
| **Fix** | Define both sides, align join arrays with keys, seed parents before children, avoid soft-deleted FK targets in seed. |
| **See** | [Store](../README.md#store-reference) |

### List config (startup) vs list queries (runtime)

| | |
|---|---|
| **Symptom (startup)** | `The "store.list" …` shape/unknown-key/op errors (e.g. `filter.fields[0].op` must be `eq, ne, gt, gte, lt, lte, in`). |
| **Symptom (runtime)** | `Query "sort" field must be one of: …`; `Query "<name>" must be a number` / `must be an integer` / `must not be empty`; `Query "<cursor>" is invalid`. |
| **Cause** | Invalid list engine config, or client query outside whitelist/type rules. **3.0.0:** omitting `list` enables the list engine by default; use `"list": false` for a plain array. |
| **Fix** | Fix config at startup; at runtime pass allowed sort fields, numeric compares, and cursors from `{{nextCursor}}`. |
| **See** | [Store](../README.md#store-reference), [CHANGELOG](../CHANGELOG.md) (`3.0.0`) |

---

## Startup: `mock.config.json` and proxy shapes

### Folder / root config mistakes

| | |
|---|---|
| **Symptom** | `The "prefix" is only allowed inside "folders"`; invalid folder names; `stripPrefix` / `proxyUnmatched` require `prefix`; `storeNamespace` pattern errors; delay/proxy/headers/port issues on root or folders. |
| **Cause** | Misplaced or mistyped folder config. |
| **Fix** | Put `prefix` under `folders.<name>`; keep folder names to letters, numbers, `-`, `_`, `.`. |
| **See** | [Mock config](../README.md#mock-config-reference), [CLI](../README.md#cli-reference) |

### Proxy shape at validation time

Bad example: [`mocks/invalid/proxy-errors.json`](../mocks/invalid/proxy-errors.json).

| | |
|---|---|
| **Symptom** | `The "proxy" must be a valid http or https URL`; `The "proxy" must be a URL string, true, or an object with "target"` (response); `The "proxy" must be a URL string or an object with "target"` (method/root — `true` not allowed); `The "proxy.target" property is required`; `The "proxy.path" must be a string`. |
| **Cause** | Invalid proxy value for that scope. |
| **Fix** | Response may use `true` only when a method/folder/root/CLI target exists; method/root need a real URL or `{ "target": "https://…" }`. |
| **See** | [Concepts](../README.md#concepts), [CLI](../README.md#cli-reference) |

---

## Startup warnings (non-fatal)

### `The "statusCode" N is not a standard HTTP status code`

| | |
|---|---|
| **Symptom** | Warning; server still starts. |
| **Cause** | Code not in the built-in IANA-oriented list (e.g. `299`). |
| **Fix** | Prefer registered codes; unassigned codes still work if intentional. |
| **See** | [Validation](../README.md#validation-reference) |

### `The "body" property is ignored when "action" is set`

| | |
|---|---|
| **Symptom** | Warning on action responses (except list templates). |
| **Cause** | Store action generates the body. |
| **Fix** | Omit unused `body`, or keep only intentional list templates. |
| **See** | [Store](../README.md#store-reference) |

### `The "statusCode" is ignored for action "delete" (always responds with 204)`

| | |
|---|---|
| **Symptom** | Warning on `action: "delete"`. |
| **Cause** | Delete always returns `204`. |
| **Fix** | Drop custom statusCode on delete actions. |
| **See** | [Store](../README.md#store-reference) |

### `The "…" matches the store key and is redundant`

| | |
|---|---|
| **Symptom** | Unique constraint equals the primary key. |
| **Cause** | Redundant unique entry. |
| **Fix** | Remove it unless you keep it deliberately. |
| **See** | [Store](../README.md#store-reference) |

---

## Persist: corrupt snapshot, write failure, reset

### `Invalid persisted store file "<path>": …`

| | |
|---|---|
| **Symptom** | Server refuses to start; message may include JSON parse detail, `expected an object with an "items" array`, `items[n] must be an object`, `missing key field "…"`, `duplicate key (…)`, or `duplicate unique field "…"`. |
| **Cause** | File under `.store/` (or custom `persist.file`) is corrupt or inconsistent with the store definition. |
| **Fix** | Delete or repair the snapshot, or start with `--reset-store <id>` for that store. |
| **See** | [Store](../README.md#store-reference) |

### `Failed to persist store "<id>": …`

| | |
|---|---|
| **Symptom** | Logged at runtime; HTTP mutation still succeeds in memory. |
| **Cause** | Disk write/rename failed (e.g. target path blocked). |
| **Fix** | Fix filesystem permissions/path; restart may lose unpersisted RAM state. |
| **See** | [Store](../README.md#store-reference) |

### Persist + watch surprise

| | |
|---|---|
| **Symptom** | Editing `.store/*.json` (or custom persist files) does **not** restart the server. |
| **Cause** | Persist paths are ignored by the watcher so writes do not loop restarts. |
| **Fix** | Expected; change mock JSON to reload, or restart manually after hand-editing snapshots. |
| **See** | [Store](../README.md#store-reference), [CLI](../README.md#cli-reference) |

---

## Runtime: unexpected response / match misses

### Wrong status/body — request “works” but uses `nameResponse`

| | |
|---|---|
| **Symptom** | e.g. `404` with your default error body when you expected a matched success response. |
| **Cause** | No `match` entry fit; server falls back to `nameResponse` (does not 500 for a normal miss). |
| **Fix** | Inspect `match.params` / `query` / `body` / `headers` / `multipart` / `call`; tighten or add a catch-all response. |
| **See** | [Concepts](../README.md#concepts) |

### `Fallback response "<nameResponse>" was not found in the responses array`

| | |
|---|---|
| **Symptom** | Rare runtime throw if config and runtime diverge. |
| **Cause** | Fallback name missing from `responses` (should normally be caught at startup). |
| **Fix** | Ensure `nameResponse` exists; restart after edits. |
| **See** | [Concepts](../README.md#concepts), [Validation](../README.md#validation-reference) |

### `Invalid response "…" was not found in the responses array`

| | |
|---|---|
| **Symptom** | Rare runtime throw when serving a `request` validation error. |
| **Cause** | `request.error.response` names a response that is missing at runtime (normally caught at startup). |
| **Fix** | Point `error.response` at an existing response **without** `encoding`; restart after edits. |
| **See** | [Validation](../README.md#validation-reference) |

### `Unsupported HTTP method: "…"`

| | |
|---|---|
| **Symptom** | Internal throw if a route is registered with a method outside `GET` / `POST` / `PUT` / `PATCH` / `DELETE`. |
| **Cause** | Defensive path; startup validation should already reject invalid methods. |
| **Fix** | Use only the five supported methods; restart with a clean mock load. |
| **See** | [Mock file](../README.md#mock-file-reference) |

---

## Runtime: request body, Content-Type, encoding

### `request content-type must be <expected>`

| | |
|---|---|
| **Symptom** | Validation error response (via `request.error.response`) when `request.as` is set. |
| **Cause** | Incoming `Content-Type` does not match `as` (`json` / `form` / `multipart` / `raw` / `text`). |
| **Fix** | Send the matching content type, or relax/omit `as`. |
| **See** | [Body compatibility](../README.md#body-compatibility), [Validation](../README.md#validation-reference) |

### Field validation messages (`email is required`, `items.0.qty must be >= 1`, …)

| | |
|---|---|
| **Symptom** | `400`-style body from your configured error response; detail array/map per `request.error`. |
| **Cause** | Payload/query/headers fail the declared rules. |
| **Fix** | Fix the client payload or the schema; custom `message` / `messages` override defaults. |
| **See** | [Validation](../README.md#validation-reference) |

### `Request body exceeds limit of N bytes` / `Request body too large` (`413`)

| | |
|---|---|
| **Symptom** | HTTP `413` with `Request body exceeds limit of … bytes`, or the fallback `Request body too large`. |
| **Cause** | Raw/JSON/form body exceeds the intake byte limit. |
| **Fix** | Reduce payload size. |
| **See** | [Body compatibility](../README.md#body-compatibility) |

### Multipart limits (`413`)

| | |
|---|---|
| **Symptom** | HTTP `413` with `Multipart file exceeds limit of … bytes`; `Multipart files exceed limit of … bytes`; `Multipart files limit exceeded`; or `Multipart fields limit exceeded`. |
| **Cause** | A single file, total files size, file count, or field count exceeds multipart intake limits. |
| **Fix** | Smaller/fewer files and fields, or split the upload. |
| **See** | [Body compatibility](../README.md#body-compatibility) |

### Encoding runtime `500` JSON

| | |
|---|---|
| **Symptom** | `{ "message": "…" }` with one of: `Response body file path escapes mocks directory: …`; `encoding "base64" requires body to be a string`; `encoding "file" requires body to be a non-empty path string`; `unsupported encoding: …`; or OS `ENOENT` / “no such file” for a missing `encoding: "file"` path. |
| **Cause** | Path escapes mocks root, file missing, wrong body type, or unknown `encoding` value at send time. |
| **Fix** | Keep assets under the mocks directory; use a non-empty relative `body` path for `file`; `body` must be a string for `base64`; only `file` / `base64` are supported. |
| **See** | [Body compatibility](../README.md#body-compatibility) |

---

## Runtime: store mutations and soft-delete

### `Request body must be a JSON object`

| | |
|---|---|
| **Symptom** | Store create/update/patch rejects the body. |
| **Cause** | Body is missing, array, or non-object JSON. |
| **Fix** | Send a JSON object. |
| **See** | [Store](../README.md#store-reference) |

### `Not found` (store `404`)

| | |
|---|---|
| **Symptom** | HTTP `404` JSON `{ "message": "Not found" }` (or your custom `store.notFound.response` body). |
| **Cause** | get/update/patch/delete/restore target key missing, or item is soft-deleted and not included. |
| **Fix** | Use an existing key; for soft-delete see below; or customize `store.notFound.response`. |
| **See** | [Store](../README.md#store-reference) |

### Soft-deleted records “missing”

| | |
|---|---|
| **Symptom** | After `DELETE` with soft-delete: `get`/`list`/`patch`/`update` behave like 404 (`Not found`); list length shrinks. |
| **Cause** | Soft-deleted items are hidden unless `includeDeleted=true` or `includeDeleted=1` (other values like `yes`/`false` do not include them). |
| **Fix** | Use `?includeDeleted=true`, or `restore` action; unique values free up after soft-delete (restore can then `409` if reused). |
| **See** | [Store](../README.md#store-reference) |

### Store unique / conflict (`409`)

| | |
|---|---|
| **Symptom** | HTTP `409` with default `{ "message": "Duplicate value(s)" }`, or `Duplicate value for unique field "…"`, or `Duplicate value for unique fields "a+b"` (composite). If you configured a conflict response name, that mock body is used instead. |
| **Cause** | create/update/patch/restore violates `store.unique` (or key uniqueness). |
| **Fix** | Change the payload, delete/soft-delete the conflicting row, or customize the conflict response on the method. |
| **See** | [Store](../README.md#store-reference) |

### `Related record not found` / `Missing required relation "…"`

| | |
|---|---|
| **Symptom** | HTTP conflict/error body with `Related record not found` (default FK message) or `Missing required relation "<name>"`. |
| **Cause** | Payload FK points at a missing/soft-deleted parent, or a required relation field is absent. |
| **Fix** | Seed/create the related row first; send required relation fields; customize the relation conflict response if needed. |
| **See** | [Store](../README.md#store-reference) |

### `Cannot delete: related records exist`

| | |
|---|---|
| **Symptom** | HTTP conflict on delete with that default message (or your restrict conflict response). |
| **Cause** | Relation `onDelete: "restrict"` and children still reference the row. |
| **Fix** | Delete or reassign children first, or use a different `onDelete` strategy where appropriate. |
| **See** | [Store](../README.md#store-reference) |

### `Store softDelete is not enabled`

| | |
|---|---|
| **Symptom** | Runtime restore path without soft-delete (should usually fail at startup if `action: "restore"`). |
| **Cause** | Restore invoked on a store without soft-delete. |
| **Fix** | Enable `store.softDelete` or remove restore. |
| **See** | [Store](../README.md#store-reference) |

### `Store "…" was not found` / `Unsupported store action "…"`

| | |
|---|---|
| **Symptom** | Runtime failure when handling a store action. |
| **Cause** | Defensive paths: store id missing from the in-memory registry, or action string outside `list` / `get` / `create` / `update` / `patch` / `delete` / `restore`. |
| **Fix** | Ensure the store is defined and referenced correctly; use only supported actions; restart after mock edits. |
| **See** | [Store](../README.md#store-reference) |

---

## Runtime: proxy

### `{ "message": "Proxy is set to true but no method, folder, root config, or --proxy target is configured" }`

| | |
|---|---|
| **Symptom** | HTTP `502` JSON. |
| **Cause** | Response uses `"proxy": true` with no inherited/CLI target. |
| **Fix** | Set method/folder/root `"proxy": "https://…"` or start with `--proxy https://…`. |
| **See** | [Concepts](../README.md#concepts), [CLI](../README.md#cli-reference) |

### Recordings not appearing / not replaying

| | |
|--|--|
| **Symptom** | After `--record`, no files under `.recordings/`, or replay still needs the backend. |
| **Cause** | Traffic hit a local mock (not proxied); proxy failed (`[proxy:error]`); started with `--exclude-recordings`; or `--record` without any proxy target. |
| **Fix** | Confirm the request is unmatched or uses `"proxy"`; check `[proxy:error]` logs; restart without `--exclude-recordings`. See [Record & Replay](../README.md#record--replay). |

### Proxied request returns 301 / 302 instead of the final response

| | |
|--|--|
| **Symptom** | After upgrading to 4.1.0+, a proxied route that used to return 200 (or another final status) now returns `301` / `302` (often with `Location`). |
| **Cause** | Proxy no longer follows upstream redirects (`redirect: "manual"`). Applies to all proxy paths, not only `--record`. |
| **Fix** | Point `proxy` / `--proxy` at the final URL, or have the client follow `Location`. See [CHANGELOG 4.1.0](../CHANGELOG.md), [Concepts — proxy](../README.md#proxy--forward-to-a-real-backend), [Record & Replay](../README.md#record--replay). |

### `{ "message": "Proxy request failed", "error": "…", "target": "…" }`

| | |
|---|---|
| **Symptom** | HTTP `502`; `target` shows upstream URL. |
| **Cause** | Upstream unreachable or request failed. |
| **Fix** | Check URL, network/DNS, and forwarded path (`proxy.path` / stripPrefix). |
| **See** | [Concepts](../README.md#concepts), [CLI](../README.md#cli-reference) |

---

## Watch mode

### `Mock server is restarting ⏳` then nothing useful

| | |
|---|---|
| **Symptom** | Save seems ignored. |
| **Cause** | File outside watched mocks path; non-`.json`; editor multi-step save still settling; or change only under ignored persist paths (`.store/`). |
| **Fix** | Save completed `.json` under the `-f` directory; wait for debounce; check console. |
| **See** | [CLI](../README.md#cli-reference) |

### `Mock server could not be restarted due to an invalid mock configuration. Please fix the mocks and run the command again.`

| | |
|---|---|
| **Symptom** | After a bad edit or deleting all mocks; previous process stops serving. |
| **Cause** | Reload hit validation/`No files found`/etc. Validation details are printed; internal `Invalid mock configuration` is **not** re-logged as the failure reason. |
| **Fix** | Fix mocks (or restore files), then run `mock-server start` again—watch does not keep serving the old process after a failed restart. |
| **See** | [CLI](../README.md#cli-reference), [Validation](../README.md#validation-reference) |

---

## Quick triage

1. **No `Mock server is running`** → read the first `✖` line (port/path/CLI) before chasing mock JSON.
2. **`✖ Error:` + `File:`** → fix that file; compare with [`mocks/invalid/`](../mocks/invalid/) only as a negative example.
3. **`⚠ Warnings:`** → optional cleanup; server may already be up.
4. **Wrong HTTP body but 2xx/4xx from your mock** → matching/`nameResponse`/request validation, not startup validation.
5. **`409` / `Not found` from a store action** → unique/FK/restrict/missing key (or custom conflict/`notFound` response).
6. **`413`** → body or multipart intake limit.
7. **`502` with proxy `message`** → proxy target inheritance or upstream.
8. **Store data “lost” after restart** → persist enabled? corrupt `.store`? `--reset-store`?
9. **Watch died after an edit** → fix mocks and start again.

---

## Related documentation

| Topic | Where |
|-------|-------|
| Concepts / matching | [Concepts](../README.md#concepts) |
| CLI flags & commands | [CLI](../README.md#cli-reference) |
| Mock file fields | [Mock file](../README.md#mock-file-reference) |
| `mock.config.json` / folders | [Mock config](../README.md#mock-config-reference) |
| Startup + request validation | [Validation](../README.md#validation-reference) |
| Content types, files, encoding | [Body compatibility](../README.md#body-compatibility) |
| Store, persist, list, soft-delete | [Store](../README.md#store-reference) |
| Short Q&A | [FAQ](faq.md) |
| Breaking changes / migrations | [CHANGELOG](../CHANGELOG.md) |
