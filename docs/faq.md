# FAQ

Short answers to common questions. Full reference: [README](../README.md). Symptom → cause → fix: [Troubleshooting](troubleshooting.md).

**Browse by topic:** [Basics](#basics) · [CLI & config](#cli--config) · [Matching & validation](#matching--validation) · [Store & proxy](#store--proxy) · [Watch & persist](#watch--persist) · [Limits & migrations](#limits--migrations)

---

## Basics

### What is http-mock-json? Can I embed it or import an API?

It is a **CLI** (`mock-server`) that starts a local HTTP mock server from JSON files. Your app calls that server over HTTP (e.g. `http://localhost:3000/...`).

The published package does **not** export an embeddable server/SDK — use JSON mocks and `mock-server start`, not an in-process API. To scaffold mocks from an OpenAPI 3.x document, use the CLI [`import`](#can-i-import-an-openapi--swagger-file) command (that is not a library import).

See [Getting started](../README.md#getting-started) and [Concepts](../README.md#concepts).

### Which Node.js version do I need?

**Node.js 22.12 or newer** (`engines` in the package).

See [Getting started](../README.md#getting-started).

### Where do the sample mocks live?

Under [`mocks/`](../mocks/) in the GitHub repository. They are **not** shipped in the npm package. Copy what you need into your project’s mocks directory.

Index: [Examples](examples.md).

### Can I expose this server beyond local development?

No. It is for **local development and testing**. Do not expose it to untrusted networks or use it as a production API.

See [SECURITY.md](../SECURITY.md).

### Is CORS enabled?

Yes. The server enables CORS by default (including exposing response headers to the browser). You do not need a separate CORS mock for typical frontend local setups.

See [CLI — start](../README.md#start) and [Concepts](../README.md#concepts).

### Does it support WebSocket, GraphQL, or HTTPS termination?

No. Only HTTP methods `GET`, `POST`, `PUT`, `PATCH`, and `DELETE` on a plain HTTP server. Put a reverse proxy in front if you need TLS locally; GraphQL/WebSocket are out of scope.

---

## CLI & config

### What’s the difference between `init`, `add`, `add --crud`, and `import`?

- **`init`** — creates the mocks directory (and optionally a first mock + npm start script).
- **`add`** — interactively scaffolds one mock file (endpoint + HTTP method).
- **`add --crud`** — scaffolds collection + item routes with store `action`s (`list` / `create` / `get` / `update` / `patch` / `delete`).
- **`import`** — generates mock JSON from an OpenAPI 3.x file or URL (stubs only; not loaded at `start` time).

`init` / `add` write into the **root** of the mocks directory (no `mock.config.json` layout). `import` does the same when there is no server/`--prefix`; with a base path it also writes `mock.config.json` + one-level folders.

See [CLI](../README.md#cli-reference).

### Can I import an OpenAPI / Swagger file?

Yes for **OpenAPI 3.x**: `mock-server import --openapi ./openapi.yaml`. It writes editable mock JSON (one file per tag by default). If `servers[0]` has a base path, it also writes `mock.config.json` with folder `prefix` so routes match the real URL (e.g. `/planetary` + `apod`). Swagger 2.0 is not supported — convert to OpenAPI 3 first. The import does not generate `request` validation or store CRUD yet.

See [CLI — import](../README.md#import). Import errors/warnings: [Troubleshooting — import](troubleshooting.md#cli-import-openapi).

### What does `-f` / `--path` mean?

It is the **mocks directory itself** (default `mocks`), not a parent folder that contains a nested `mocks/` directory. This changed in **2.0.0**.

Example: `mock-server start -f apps/folder1/mocks` (or any custom dir name).

On `start`, short `-p` is **`--port`** (not path). On `init` / `add` / `import`, `-p` is **`--path`**.

See [CLI](../README.md#cli-reference).

### How is the listen port chosen?

Priority: CLI `-p` / `--port` → `mock.config.json` `port` → **3000**. The port is checked for availability **before** mocks are loaded.

See [CLI](../README.md#cli-reference) and [Mock config](../README.md#mock-config-reference). Port conflicts: [Troubleshooting](troubleshooting.md#port-path-and-init).

### What is `mock.config.json` for?

Optional file at the **root of the mocks directory** for large sets: declare one-level subfolders, route `prefix`, default `delay` / `headers` / `proxy`, `include` / `exclude`, `port`, `strictDuplicates`, `proxyUnmatched`, and `storeNamespace`.

Without it, flat `*.json` files in the mocks directory still work. Undeclared subfolders are not loaded when `folders` is set.

See [Mock config](../README.md#mock-config-reference).

### Can I use multiple mock JSON files?

Yes. All JSON files in the mocks directory (and folders allowed by `mock.config.json`) are loaded. Point `start` at that directory with `-f` / `--path` if it is not `./mocks`.

See [Getting started](../README.md#getting-started), [CLI](../README.md#cli-reference), and [Mock config](../README.md#mock-config-reference).

---

## Matching & validation

### What’s the difference between `request` and `match`?

- **`request`** (method-level) — validates payload / query / headers **before** scenario selection. Failures serve `request.error.response` and stop.
- **`match`** (per response) — picks which named response runs when the request fits; first match wins, else `nameResponse`.

They solve different problems: reject bad input vs branch happy/error scenarios.

See [Concepts](../README.md#concepts) (pipeline) and [Body compatibility](../README.md#body-compatibility).

### How do I switch the active response / scenario?

Set `nameResponse` to a `name` in that method’s `responses` array. Watch mode reloads when the file changes. You can also branch with `match` (params, query, body, headers, multipart, call); the first match wins, otherwise `nameResponse` is the fallback.

See [Concepts](../README.md#concepts), [Getting started](../README.md#getting-started), and [Advanced examples](advanced-examples.md).

### Why didn’t my mock / response match?

Common causes: wrong method or path; `match` values compared as strings; partial `match` rules that still require every listed key; request validation failing before `match` runs; falling through to `nameResponse` when nothing matches.

See [Concepts](../README.md#concepts) (matching) and [Troubleshooting](troubleshooting.md). Recipes: [Advanced examples](advanced-examples.md).

### Can I validate multipart / form bodies or return binary files?

Yes (v4+). Use method-level `request` with `as` (`json` | `form` | `multipart` | `raw` | `text`) and `payload` rules (including `type: "file"`). For mock responses that are files or base64, set response `encoding` (`file` | `base64`) with `body` (paths stay under the mocks root).

Bodies larger than **10 MB** (including multipart) return **413**.

See [Body compatibility](../README.md#body-compatibility).

### What’s the difference between validation errors and warnings?

**Errors** block startup (or a watch restart). **Warnings** are printed but the server still starts.

See [Validation](../README.md#validation-reference). Message catalog: [Troubleshooting](troubleshooting.md).

---

## Store & proxy

### What is store? When should I use it?

Use **store** when you need mutable collections (CRUD-like `action`s, seed data, optional persist, list filters/pagination, soft delete, relations, unique conflicts). Use a fixed response `body` when the payload is static.

`action` cannot share a response with `proxy` or response `encoding`.

See [Concepts](../README.md#concepts) and [Store](../README.md#store-reference). Recipes: [Store recipes](store-recipes.md).

### Why is my store list paginated when I never set `store.list`?

Since **3.0.0**, omitting `store.list` turns the list engine **on** with the same defaults as `"list": true` (e.g. `pageSize` 10, sort `id`). Use `"list": false` for a plain full array. Invalid list query values return `400` when the engine is on.

Details and gotchas: [Store](../README.md#store-reference).

### How does proxy work?

A response can set `"proxy": true`, a URL string, or `{ "target", "path?" }`. When selected, the original request is forwarded and mock `body` / `action` is skipped.

For `"proxy": true`, the target resolves from method → folder → root `mock.config.json` → CLI `--proxy`. If none is set, the runtime responds with **502** and a clear JSON message. Unmatched routes can still be forwarded via folder `proxyUnmatched` and/or global `--proxy`. Upstream redirects are not followed; the mock returns the 3xx as-is ([CHANGELOG 4.1.0](../CHANGELOG.md)).

See [Concepts](../README.md#concepts), [Mock config](../README.md#mock-config-reference), and [CLI](../README.md#cli-reference). Orphan / failed proxy / unexpected 3xx: [Troubleshooting](troubleshooting.md#runtime-proxy).

### How do Record & Replay work?

Start with `--proxy` (or folder `proxyUnmatched`) and `--record`. Proxied JSON/binary responses are written under `.recordings/` (or `<folder>/.recordings/` when `mock.config.json` prefixes match). Stop the server, then run `mock-server start` again — recordings load by default alongside mocks.

Use `--exclude-recordings` to ignore them, or `--recordings-only` to serve only recordings. JSON, text/HTML, binary, and other proxied bodies are recorded; redirects are captured without following. See [CLI — Record & Replay](../README.md#record--replay).

---

## Watch & persist

### Does watch mode run automatically?

Yes. `mock-server start` loads mocks, then watches the mocks directory and reloads on JSON/`mock.config.json` changes. There is no separate “watch” flag.

Persist snapshot paths under `.store/` (or a custom `persist.file`) are ignored by the watcher so store writes do not loop reloads.

See [Validation](../README.md#validation-reference) (watch) and [Store](../README.md#store-reference) (persist).

### Watch said it could not restart — what do I do?

After a validation error on reload, the restart is **aborted**. The process does **not** keep waiting for a later fix. Correct the mocks and run `mock-server start` again.

See [Validation](../README.md#validation-reference) (watch) and [Troubleshooting](troubleshooting.md#watch-mode).

### Why didn’t watch mode clear my persisted store? What about `--reset-store`?

With `persist`, data survives restarts under `.store/` (or a custom `persist.file`). Persist paths are ignored by the watcher so writes do not trigger a reload. `--reset-store` clears snapshots **only on the initial** `start`, not on watch reloads.

See [Validation](../README.md#validation-reference) (watch behavior), [CLI](../README.md#cli-reference) (`--reset-store`), and [Store](../README.md#store-reference) (persist).

---

## Limits & migrations

### What happened to `request.body` in v4?

`request.body` is no longer valid. Rename it to `request.payload`. Flat `request` error keys also moved under `request.error`.

See [Body compatibility](../README.md#body-compatibility) for the live contract, [CHANGELOG](../CHANGELOG.md) (4.0.0) for the breaking rename, and [Validation](../README.md#validation-reference) for startup rejection severity.

### What else broke between major versions?

The surprises that usually hit upgrades:

| Version | Change |
|---------|--------|
| **2.0** | `-f` / `--path` is the mocks directory itself (not its parent) |
| **3.0** | Omitting `store.list` enables the list engine (use `"list": false` for a full array) |
| **4.0** | `request.body` → `request.payload`; flat error keys → `request.error.*` |

Full notes: [CHANGELOG](../CHANGELOG.md).
