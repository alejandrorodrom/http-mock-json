<p align="center">
  <img src="../assets/title.png" alt="http-mock-json" width="800" />
</p>

# Documentation

Mock your real API in JSON — status codes, errors, validation, latency, and mutable data — so the frontend can develop and test without waiting on a backend.

This folder is the full manual. The [root README](../README.md) is the short landing (install + minimal example). Start here when you need depth.

## Quick path

1. [Getting started](getting-started.md) — install, `mock-server init`, mock file shape  
2. [CLI](cli.md) — `init` / `start` / `add` flags  
3. Pick a sample from [Examples in this repository](examples.md) and copy it into your project  
4. Add power only when you need it: [match & validation](advanced-examples.md), [bodies & encoding](body-compatibility.md), [mutable store](store.md)

```bash
npm install http-mock-json --save-dev
npx mock-server init
npx mock-server start
# → http://localhost:3000
```

## Guides

### Start here

| Guide | What it covers |
|-------|----------------|
| [Getting started](getting-started.md) | Install, interactive setup, mock JSON structure, recommendations |
| [CLI](cli.md) | Command reference for `init`, `start`, and `add` (including `--crud`) |
| [Validation](validation.md) | What the server checks at startup so broken mocks fail fast |
| [FAQ](faq.md) | Short answers (production use, WebSockets, TypeScript, multiple files) |

### Recipes & samples

| Guide | What it covers |
|-------|----------------|
| [Examples in this repository](examples.md) | Curated index of `mocks/*.json` (basics, match, store, binary, folders) |
| [Advanced examples](advanced-examples.md) | Named responses, headers, params, `match`, delay, request validation (Examples 1–9) |
| [Real-world projects](real-world.md) | Product-style scenarios: auth, RBAC, checkout, webhooks, food-delivery folders, binary uploads |

### Deep reference

| Guide | What it covers |
|-------|----------------|
| [Body compatibility](body-compatibility.md) | `as` (json/form/multipart/raw/text), file rules, response `encoding`, folder `mock.config.json` |
| [Mutable store](store.md) | CRUD `action`s, filters/pagination, soft delete, relations, persist, Examples A–R |
| [Troubleshooting](troubleshooting.md) | Common startup and runtime failures |

## When to read what

| You want to… | Open |
|--------------|------|
| Get a server running in minutes | [Getting started](getting-started.md) |
| Switch success vs error for the same route | [Advanced examples](advanced-examples.md) |
| Validate request body / query / headers | [Body compatibility](body-compatibility.md) + [Advanced examples — Example 9](advanced-examples.md#example-9-request-validation) |
| Upload files / multipart / form tokens | [Body compatibility](body-compatibility.md) |
| Full CRUD that survives reloads | [Mutable store](store.md) |
| Split mocks like microservices | [Body compatibility — Example 11](body-compatibility.md#example-11-folder-organization-mockconfigjson) |
| Copy a ready-made scenario | [Examples](examples.md) or [Real-world projects](real-world.md) |
| Fix a cryptic startup error | [Troubleshooting](troubleshooting.md) |

## Related

- [Changelog](../CHANGELOG.md) — release notes  
- [Contributing](../CONTRIBUTING.md) — local setup and PR checklist  
- [Security](../SECURITY.md) — how to report vulnerabilities  
- [npm package](https://www.npmjs.com/package/http-mock-json) — install from the registry  
- [GitHub repository](https://github.com/alejandrorodrom/http-mock-json) — source, issues, sponsors  
- [Project page](https://www.rodriguezrom.com/libraries/http-mock-json) — overview on rodriguezrom.com  
