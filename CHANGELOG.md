# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.2] - 2026-07-28

Patch release on top of **2.0.1**. No public API or CLI contract changes.

### Previous version

**2.0.1** — mock-config sample and examples index in the README.

### Added

- README badges for CI, E2E, and npm audit (GitHub Actions status on `main`)
- README [Sponsors](./README.md#sponsors-) section with GitHub Sponsors link

### Changed

- Package / CLI version bumped to `2.0.2`

---

## [2.0.1] - 2026-07-28

Patch release on top of **2.0.0**. No public API or CLI contract changes.

### Previous version

**2.0.0** — `--path` / `-f` is the mocks directory itself (breaking).

### Added

- Runnable folder-organization sample at [`mocks/mock-config/`](./mocks/mock-config) (auth / orders / payments) for use with `-f` / `--path`
- README section [Examples in this repository](./README.md#examples-in-this-repository-) — curated index of `mocks/` samples to copy
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

[2.0.2]: https://github.com/alejandrorodrom/http-mock-json/compare/v2.0.1...v2.0.2
[2.0.1]: https://github.com/alejandrorodrom/http-mock-json/compare/v2.0.0...v2.0.1
[2.0.0]: https://github.com/alejandrorodrom/http-mock-json/compare/v1.18.1...v2.0.0
[1.18.1]: https://github.com/alejandrorodrom/http-mock-json/compare/v1.18.0...v1.18.1
[1.18.0]: https://github.com/alejandrorodrom/http-mock-json/compare/v1.17.2...v1.18.0
[1.17.2]: https://github.com/alejandrorodrom/http-mock-json/compare/v1.17.1...v1.17.2
