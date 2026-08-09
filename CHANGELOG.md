# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [5.1.0] - 2026-08-09

Minor release on top of **5.0.0**.

### Previous version

**5.0.0** — Node.js ≥ 22.12 and dependency floor.

### Added

- **`mock-server import`:** generate mock JSON from an OpenAPI 3.x file or URL (`--openapi`, `-p/--path`, `--out`, `--no-split-tags`, `--prefix`, `--no-server-prefix`, `--overwrite`)
- Maps paths (`{id}` → `:id`), supported methods, and documented responses (`nameResponse` = first 2xx; error statuses kept inactive until switched)
- Response bodies from `example` / `examples` / schema examples (minimal schema fallback)
- Server base path (`servers[0]` or `--prefix`) → `mock.config.json` folders with shared `prefix`; tag files live under those folders; `--no-server-prefix` keeps a flat layout
- Clear rejection of Swagger 2.0; skips unsupported methods/paths with warnings
- E2E: `unit/import-openapi`, `unit/import-openapi-errors`, `system/import-cli-flags`, `system/import-cli-errors`, `runtime/import-openapi-public` (fixtures under `tests/e2e/fixtures/openapi/`)

### Changed

- Route params may include `-` (e.g. `:item-id` / OpenAPI `{item-id}`), matching literal path segments; `.` in param names remains invalid
- Clearer invalid-path error: literals vs `:param` character rules
- Package / CLI version bumped to `5.1.0`
- Docs: CLI `import` reference, FAQ; OpenAPI import removed from “out of scope”

### Dependencies

- `@apidevtools/swagger-parser`, `openapi-types`

---

## [5.0.0] - 2026-08-08

Major release on top of **4.1.1**.

### Previous version

**4.1.1** — email validation limits and e2e console matching.

### Changed

- **Breaking:** requires **Node.js >= 22.12** (previously `>= 18`). Node 18 and 20 are no longer supported. Aligns `engines` with the oldest Node.js release line that still receives official security updates, and with Commander 15’s runtime floor.
- Dependencies: `commander` 14 → 15 (ESM; needs Node `>=22.12`), `sisteransi` 1 → 2 (ESM)
- Dev toolchain: `typescript` 5.9 → 7; `@types/node` raised to the 22.x line (not 26) to match the runtime floor
- Package / CLI version bumped to `5.0.0`
- CI classic/e2e/audit jobs run on Node 22 (publish remains on Node 24)

---

## [4.1.1] - 2026-08-08

Patch release on top of **4.1.0**. No public API or CLI contract changes.

### Previous version

**4.1.0** — Record & Replay.

### Fixed

- **`format: "email"`:** enforce RFC-practical limits (overall ≤ 254 chars; local ≤ 64; domain/label bounds) so oversized or malformed addresses are rejected
- E2E console matching: allow stable message prefixes so `JSON.parse` wording differences across Node versions do not fail `file.syntax-error` / error-catalog checks

### Changed

- Package / CLI version bumped to `4.1.1`

---

## [4.1.0] - 2026-08-05

Minor release on top of **4.0.3**.

### Previous version

**4.0.3** — docs model under `docs/` and README cleanup.

### Added

- **Record & Replay:** `mock-server start --record` captures proxied JSON/binary responses into `.recordings/` (folder-aware with `mock.config.json` prefixes)
- Load modes: default loads mocks + recordings; `--exclude-recordings` (mocks only); `--recordings-only`
- Startup log groups routes under **Mocks** / **Recordings** with load mode and counts
- Path normalization on record: numeric segments → `:id` / `:id2`…; `v1`/`v2` kept literal; purely numeric paths (e.g. Picsum `/200/300`) stay literal so endpoints remain valid
- Binary responses recorded with `encoding: "file"` under `.recordings/files/`
- Proxy failures logged as `[proxy:error]` and never recorded
- Record stores proxied bodies of any common shape: JSON, `text/*` / xml / csv (string + Content-Type), binary (`encoding: "file"`), invalid JSON kept as raw text; replay sends non-JSON string bodies with `.send()`
- E2E coverage: `runtime/record-replay`, `runtime/record-replay-mock-config`, `runtime/record-replay-collision-dedupe`, `runtime/record-replay-multipart`, `unit/record-path` / `unit/record-match`; live public-API suite `runtime/record-replay-public-apis` under `--suite external`
- Record `match.body` skips empty objects so multipart/raw proxied POSTs do not vacuous-match every JSON body
- Record stores `match.headers` for `authorization` / `cookie` so auth and cookie variants of the same route replay correctly
- Record parses multipart while proxying and stores `match.multipart` (fields + file metadata) so distinct uploads replay correctly

### Changed

- **Proxy redirects:** upstream redirects are no longer followed (`redirect: "manual"`). The mock returns the 3xx (+ `Location`) as-is for all proxy paths (response `proxy`, folder/`--proxy`, `proxyUnmatched`) — not only when `--record` is on. If you previously relied on fetch following redirects to a final 2xx, update clients or upstream URLs accordingly.
- Package / CLI version bumped to `4.1.0`
- E2E suites split: `npm test` / `test:e2e` run **classic** (local) only; **all** live-upstream cases (`proxy-live`, `global-proxy-unmatched`, `record-replay-public-apis`, …) via `test:e2e:external` (`--suite external`)
- CI: classic e2e remains required; informational job/workflow `E2E External` runs the full external suite after classic (`continue-on-error`) so upstream outages do not fail the pipeline

---

## [4.0.3] - 2026-07-30

Patch release on top of **4.0.2**. No public API or CLI contract changes.

### Previous version

**4.0.2** — README heading cleanup.

### Changed

- **Docs model:** root [README](./README.md) holds getting started, concepts, and reference; [`docs/`](./docs/) holds [Examples](./docs/examples.md), [Advanced examples](./docs/advanced-examples.md), [Store recipes](./docs/store-recipes.md), [Real-world](./docs/real-world.md), [FAQ](./docs/faq.md), [Troubleshooting](./docs/troubleshooting.md), and the [index](./docs/README.md)
- README: Learn / Reference / Recipes contents; Concepts glossary; CLI `-p` callout; CORS and 10 MiB / 413 body limit; store recipes vs real-world boundary; fix `mocks/` links from the repo root
- Advanced examples: example map (1–10) at the top
- CONTRIBUTING / PR template / issue config aligned to the README + docs layout
- Package / CLI version bumped to `4.0.3`

---

## [4.0.2] - 2026-07-30

Patch release on top of **4.0.1**. No public API or CLI contract changes.

### Previous version

**4.0.1** — docs set and community files.

### Changed

- README: remove duplicate `# http-mock-json` heading (banner already shows the title)
- Package / CLI version bumped to `4.0.2`

---

## [4.0.1] - 2026-07-30

Patch release on top of **4.0.0**. No public API or CLI contract changes.

### Previous version

**4.0.0** — body compatibility, response encoding, and `request.payload` / `request.error`.

### Added

- Full docs set under [`docs/`](./docs/) (getting started, CLI, store, validation, troubleshooting, FAQ, real-world)
- Community files: `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`
- GitHub issue / PR templates and Dependabot config
- Architecture diagram in README (`assets/architecture.webp`)
- Project page link ([rodriguezrom.com](https://www.rodriguezrom.com/libraries/http-mock-json))

### Changed

- README restructured as a short landing; deep guides live in `docs/`
- Expanded npm `keywords` for discoverability
- Package / CLI version bumped to `4.0.1`

---

## [4.0.0] - 2026-07-29

Major release on top of **3.0.0**.

### Previous version

**3.0.0** — list-on-by-default for `store.list`.

### Breaking Changes

- `request.body` is no longer valid — use `request.payload`
- Flat error keys (`invalidResponse`, `errorFormat`, `errorDetail`, `errorDetailsKey`) are no longer valid — use `request.error.{ response, format, detail, key }`
- Config validation error paths use `request.payload.*` and `request.error.*`
- Repo mocks, e2e fixtures, and README examples migrate in this major (no alias / dual-read period)

### Added

- Tolerant body intake (`rawBody`) so multipart / binary requests survive to proxy and validators
- Response `encoding: "file" | "base64"` with safe file paths under the mocks root
- Request `as` (`json` | `form` | `multipart` | `raw` | `text`) with Content-Type mismatch → `error.response`
- Multipart / form / raw / text validation, including `type: "file"` + `format` / size rules (`busboy`)
- `match.headers` and `match.multipart` for scenario selection
- Real-project sample: OAuth2 `/oauth/token` with `as: "form"` + `match.body` on urlencoded grants (`48-oauth-form-token`)

### Migration

- Rename `request.body` → `request.payload`
- Nest flat error options under `request.error`
- Prefer `as: "multipart"` (or omit for auto) when validating uploads; use `{ "type": "file", "format": ... }` for files
- Use `encoding: "file"` / `"base64"` for binary mock responses instead of forcing JSON

### Changed

- Package / CLI version bumped to `4.0.0`

---

## [3.0.0] - 2026-07-28

Major release on top of **2.1.0**.

### Previous version

**2.1.0** — `add --crud` scaffold and overwrite confirm.

### Breaking Changes

- Omitting `store.list` now enables the list engine with the same page-mode defaults as `"list": true` (default `pageSize` 10, sort `id`, etc.). Previously, omitting `list` returned a plain full array.
- `"list": false` is the explicit opt-out for a plain full array (previously the same as omitting `list`)
- Invalid list query values (e.g. `?page=abc`) now return `400` when the engine is on (previously ignored when `list` was omitted)
- A `body` on `action: "list"` (including a dummy `[]`) is applied as a list template when the engine is on; omit `body` to return the items array

### Migration

- If you relied on `action: "list"` returning every item with no pagination, set `"list": false` on the full store definition
- Remove dummy `body` values on list responses (e.g. `[]`) unless you intend them as templates

### Changed

- Package / CLI version bumped to `3.0.0`

---

## [2.1.0] - 2026-07-28

Minor release on top of **2.0.2**.

### Previous version

**2.0.2** — README badges and Sponsors section.

### Added

- `mock-server add --crud` scaffolds collection + item route with store actions (`list` / `create` / `get` / `update` / `patch` / `delete`)
- E2E coverage for `--crud` edges, errors, overwrite confirm, and `--path` / `--crud` flag combinations (`unit/add-crud-mock`, `system/add-cli-flags`)

### Changed

- `add` asks before overwriting an existing mock JSON file
- CRUD scaffold keeps a trailing `/:param` name (e.g. `users/:userId`) instead of forcing `:id`
- Basic and CRUD scaffolds share endpoint normalization; generated `statusCode` values are numbers
- Package / CLI version bumped to `2.1.0`

---

## [2.0.2] - 2026-07-28

Patch release on top of **2.0.1**. No public API or CLI contract changes.

### Previous version

**2.0.1** — mock-config sample and examples index in the README.

### Added

- README badges for CI, E2E, and npm audit (GitHub Actions status on `main`)
- README [Sponsors](./README.md#sponsors) section with GitHub Sponsors link

### Changed

- Package / CLI version bumped to `2.0.2`

---

## [2.0.1] - 2026-07-28

Patch release on top of **2.0.0**. No public API or CLI contract changes.

### Previous version

**2.0.0** — `--path` / `-f` is the mocks directory itself (breaking).

### Added

- Runnable folder-organization sample at [`mocks/mock-config/`](./mocks/mock-config) (auth / orders / payments) for use with `-f` / `--path`
- README section [Examples in this repository](./README.md#examples) — curated index of `mocks/` samples to copy
- E2E harness `copyTree` to seed workspaces from a fixture directory (used by mock-config cases)

### Changed

- Mock-config e2e cases load [`mocks/mock-config/`](./mocks/mock-config) via `--path` instead of building trees inline
- Package / CLI version bumped to `2.0.1`

---

## [2.0.0] - 2026-07-28

### Previous version

**1.18.1** — CLI coverage for path/init/add; `--path` still meant *parent of* a folder named `mocks`.

### Breaking Changes

- `--path` / `-f` (and `init` / `add` `--path`) is now the **mocks directory itself**, not a parent folder.
  - **Before (≤ 1.18.1):** `start -f apps/folder1` → `apps/folder1/mocks`
  - **After (≥ 2.0.0):** `start -f apps/folder1` → `apps/folder1`
  - **Migration:** use `-f apps/folder1/mocks` (or any custom name, e.g. `-f api-mocks`)
- Default remains `mocks` when the flag is omitted → `./mocks` (unchanged for default users)

### Added

- `resolveMocksDir` / `DEFAULT_MOCKS_DIR` shared by `start`, `init`, and `add`
- Custom mocks directory names (e.g. `api-mocks`) without nesting an extra `mocks/` folder
- E2E coverage for custom directory name + nested full path (`system/start-custom-path`)

### Changed

- CLI messages no longer assume the directory is literally named `mocks`:
  - `The mocks directory does not exist`
  - `The mocks directory was created successfully`
  - `The mocks directory already exists`
- Package / CLI version bumped to `2.0.0`

---

## [1.18.1] - 2026-07-28

Patch release on top of **1.18.0**. No public API or CLI contract changes.

### Previous version

**1.18.0** introduced optional folder organization via `mocks/mock.config.json` (see below).

### Added

- E2E / unit coverage for CLI flows that were lightly tested before:
  - `start -f` / `--path` with a custom parent folder (`system/start-custom-path`)
  - `init` flags: default path, custom `--path`, `--mock` / `--script`, idempotent mocks dir (`system/init-cli`)
  - `add` under a custom `--path`, including abort on confirm (`unit/add-mock`)
  - `init` with `--mock true` + prompts under a custom path (`unit/init-with-mock`)
  - `--reset-store` invalid values (`system/reset-store-invalid`)
  - `-v` / `--version` and `-h` / `--help` (`system/cli-version-help`)
  - Commander parse / option errors (`system/cli-commander-errors`)
  - IO failure paths for init / add helpers (`unit/cli-io-errors`)
- Error-catalog entries for the new CLI coverage messages

### Changed

- Package / CLI version bumped to `1.18.1`

### Notes

- Custom `--path` / `-f` still means **parent of a folder named `mocks`**  
  (e.g. `start -f apps/folder1` → `apps/folder1/mocks`).  
  Renaming the leaf directory away from `mocks` is **not** supported in this release.

---

## [1.18.0] - 2026-07-28

### Previous version

**1.17.2** — last release before folder organization (docs / package positioning; no `mock.config.json`).

### Added

- Optional **folder organization** when `mocks/mock.config.json` exists (opt-in; flat `mocks/*.json` unchanged if the file is absent)
- Root / folder options:
  - `folders`, `prefix`, `delay`, `proxy`, `headers`
  - `enabled` (default `true`)
  - `include` / `exclude` (basename patterns)
  - `strictDuplicates` (default `false`)
  - `stripPrefix` (folder; requires `prefix`)
  - `proxyUnmatched` (folder catch-all for unmocked routes under `prefix`)
  - `storeNamespace` (folder; prefixes store ids, `:` sanitized in persist filenames)
  - `port` (root; default listen port)
- Priority / cascades:
  - **port:** CLI `-p` → config `port` → `3000`
  - **delay:** response → method → folder → root → `0`
  - **proxy** (`true` on a response): method → folder → root config → CLI `--proxy`
  - **headers:** merge `{ ...root, ...folder, ...response }` (more specific wins on key clash)
- README Example 11, override walkthroughs, and food-delivery real-world progressions
- E2E / unit suites for validation errors, discovery, filters, cascades, exhaustive HTTP paths, and `proxyUnmatched`

### Changed

- CLI `-p` / `--port` is optional: when omitted, port comes from `mock.config.json` or `3000` (no longer a hardcoded Commander default of `3000` that would always override config)
- Package / CLI version bumped to `1.18.0`

### Migration from 1.17.x

- No action required if you do not add `mocks/mock.config.json`
- To enable folders: create `mocks/mock.config.json`, declare `folders`, and move JSON under those subfolders (one level only)
- Root-level JSON files under `mocks/` still load and receive root `delay` / `proxy` / `headers` defaults

---

## [1.17.2] - 2026-07-28

### Changed

- Package positioning and README examples updates

## [1.17.1] - 2026-07-28

### Changed

- Clearer package description / positioning

## [1.17.0] - 2026-07-28

### Added

- `match.call` response sequencing

## [1.16.0] - 2026-07-28

### Added

- Customizable `store.notFound` responses

## [1.15.0] - 2026-07-28

### Added

- Cross-store `relations` (FK, expand, onDelete)

## [1.14.0] - 2026-07-27

### Added

- Store soft delete (`softDelete`, `restore`, `includeDeleted`)

## [1.13.0] - 2026-07-27

### Added

- Composite unique constraints on store

## [1.12.0] - 2026-07-27

### Added

- `store.list` (sort, filters, pagination / cursor)

## [1.11.0] - 2026-07-26

### Added

- Mutable in-memory store with optional disk `persist` and `--reset-store`

## [1.10.1] - 2026-07-24

### Fixed

- Skip non-array `responses` after validation

## [1.10.0] - 2026-07-21

### Added

- Request body / query validation (`request`)

## Older

See git tags (`v1.9.0` … `v1.2.9`) for earlier history (proxy, match, delay, status codes, etc.).

---

[5.1.0]: https://github.com/alejandrorodrom/http-mock-json/compare/v5.0.0...v5.1.0
[5.0.0]: https://github.com/alejandrorodrom/http-mock-json/compare/v4.1.1...v5.0.0
[4.1.1]: https://github.com/alejandrorodrom/http-mock-json/compare/v4.1.0...v4.1.1
[4.1.0]: https://github.com/alejandrorodrom/http-mock-json/compare/v4.0.3...v4.1.0
[4.0.3]: https://github.com/alejandrorodrom/http-mock-json/compare/v4.0.2...v4.0.3
[4.0.2]: https://github.com/alejandrorodrom/http-mock-json/compare/v4.0.1...v4.0.2
[4.0.1]: https://github.com/alejandrorodrom/http-mock-json/compare/v4.0.0...v4.0.1
[4.0.0]: https://github.com/alejandrorodrom/http-mock-json/compare/v3.0.0...v4.0.0
[3.0.0]: https://github.com/alejandrorodrom/http-mock-json/compare/v2.1.0...v3.0.0
[2.1.0]: https://github.com/alejandrorodrom/http-mock-json/compare/v2.0.2...v2.1.0
[2.0.2]: https://github.com/alejandrorodrom/http-mock-json/compare/v2.0.1...v2.0.2
[2.0.1]: https://github.com/alejandrorodrom/http-mock-json/compare/v2.0.0...v2.0.1
[2.0.0]: https://github.com/alejandrorodrom/http-mock-json/compare/v1.18.1...v2.0.0
[1.18.1]: https://github.com/alejandrorodrom/http-mock-json/compare/v1.18.0...v1.18.1
[1.18.0]: https://github.com/alejandrorodrom/http-mock-json/compare/v1.17.2...v1.18.0
[1.17.2]: https://github.com/alejandrorodrom/http-mock-json/compare/v1.17.1...v1.17.2
