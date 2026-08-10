# http-mock-json — brief for AI assistants

Canonical pocket manual. Prefer this over inventing APIs. Full detail: [README](../README.md). Index: [`/llms.txt`](../llms.txt).

IDEs do **not** auto-load this file; users or agents must open, `@`-mention, or fetch it (repo / `node_modules/http-mock-json`).

## Identity

| Fact | Value |
|------|--------|
| What | CLI (`mock-server`) that serves local HTTP mocks from JSON files |
| Not | Embeddable SDK / in-process server API |
| Node | `>= 22.12` |
| Default port | `3001` (CLI `-p` / `--port` → `mock.config.json` `port` → `3001`) |
| Use | Local development and testing only — not production |
| CORS | Enabled by default |

```bash
npm install http-mock-json --save-dev
npx mock-server init
npx mock-server start
```

## Mental model

- Top-level keys in a mock `.json` file are **endpoints** (HTTP paths).
- Each method (`GET` / `POST` / `PUT` / `PATCH` / `DELETE`) has `nameResponse` + `responses[]`.
- Each response has a unique `name`. `nameResponse` is the **fallback** when no `match` applies.
- Flip scenarios by changing `nameResponse` or adding `match` rules.

## Runtime pipeline

For a hit on a registered mock route (fixed order):

1. Parse body (incl. multipart) when needed  
2. **`request`** validation (if configured) → error response and stop on failure  
3. **Response selection** — first `responses[]` entry with satisfied `match`, else `nameResponse`  
4. **Delay** (method and/or response)  
5. **Fulfill exactly one:** `proxy` **or** `action` (+ store) **or** static `body` (+ optional `encoding`)

Unmatched routes may still hit folder `proxyUnmatched` / global `--proxy`.

## When to use what

| Need | Use |
|------|-----|
| Blank ready-to-curl endpoint | `add` / `init` preset `static` (default) |
| Branch by query / delay (no store) | `--preset scenarios` |
| Login + validation + 401/403 | `--preset auth-login` |
| Mutable collection + item | `--preset crud` (`--crud` alias) |
| CRUD + persist / unique / soft delete / restore | `--preset crud-full` |
| Paginated / filtered list from seed | `--preset paginated-list` |
| Parent/child FK | `--preset relations` |
| Multipart upload + download | `--preset upload` |
| Local route + proxied sibling | `--preset proxy-hybrid` |
| Bootstrap from OpenAPI 3.x | `import --openapi …` |
| Capture staging, replay offline | `start --proxy <url> --record` then `start` |

## CLI cheat sheet

| Command | Role |
|---------|------|
| `init` | Create mocks dir; optional first `static` mock + `mock:start` script |
| `add --preset <name>` | Scaffold another mock (default preset `static`) |
| `import --openapi <file\|url>` | Generate editable mock JSON from OpenAPI 3.x |
| `start` | Serve mocks (watch + startup validation) |

**Flag `-p`:** on `init` / `add` / `import` = `--path` (mocks directory). On `start`, `-p` = `--port`; mocks directory is `-f` / `--path`.

Useful `start` flags: `--proxy`, `--record`, `--exclude-recordings`, `--recordings-only`, `--reset-store`.

`add` / `init` write at the **root** of the mocks directory (no folder layout). `import` may write `mock.config.json` + folders when a server/`--prefix` path exists.

## Minimal shapes

Static method:

```json
{
  "data/animals": {
    "GET": {
      "nameResponse": "success",
      "responses": [
        { "name": "success", "statusCode": 200, "body": { "message": "ok" } },
        { "name": "error", "statusCode": 404, "body": { "message": "Not found" } }
      ]
    }
  }
}
```

Store (opt-in): endpoint may define `store` (full) or `{ "id": "…" }` (reference). Responses use `"action": "list"|"get"|"create"|"update"|"patch"|"delete"|"restore"` instead of a fixed body. `action` cannot combine with `proxy` or response `encoding` on the same response.

`request` (v4+): use `request.payload` (not `request.body`); error options under `request.error`.

## Hard limits

- HTTP only: `GET` / `POST` / `PUT` / `PATCH` / `DELETE` — no GraphQL, WebSocket, or TLS termination in-process  
- OpenAPI **3.x** only (not Swagger 2.0)  
- `import` does **not** generate `store` CRUD or `match`  
- Sample fixtures under repo `mocks/` are **not** shipped on npm  
- Do not expose the server on untrusted networks  

## Do / Don't (assistants)

**Do**

- Prefer `add --preset …` over inventing large JSON from scratch  
- Keep one fulfill mode per response (`proxy` xor `action` xor `body`)  
- Validate by running `mock-server start` (startup validation is authoritative)  
- Read [Concepts](../README.md#concepts) / [FAQ](faq.md) before guessing field names  

**Don't**

- Invent CLI flags, store fields, or `request.body`  
- Treat this package as an importable Express app/SDK  
- Assume IDEs auto-inject `llms.txt` / this file into every chat  
- Put a root `"$schema"` key inside endpoint mock files unless the runtime explicitly ignores it (today root keys are endpoints)  

## Deep links

| Topic | Link |
|-------|------|
| Getting started | [README#getting-started](../README.md#getting-started) |
| Concepts / pipeline | [README#concepts](../README.md#concepts) |
| CLI (`init` / `add` / `import` / `start`) | [README#cli-reference](../README.md#cli-reference) |
| Record & Replay | [README#record--replay](../README.md#record--replay) |
| Mock file reference | [README#mock-file-reference](../README.md#mock-file-reference) |
| Store reference | [README#store-reference](../README.md#store-reference) |
| Mock config | [README#mock-config-reference](../README.md#mock-config-reference) |
| FAQ | [faq.md](faq.md) |
| Troubleshooting | [troubleshooting.md](troubleshooting.md) |
| Examples / recipes | [examples.md](examples.md) · [store-recipes.md](store-recipes.md) · [real-world.md](real-world.md) |
| Changelog | [CHANGELOG.md](../CHANGELOG.md) |
