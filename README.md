<p align="center">
  <img src="assets/title.png" alt="http-mock-json" width="800" />
</p>

# http-mock-json

[![npm version](https://img.shields.io/npm/v/http-mock-json?style=flat-square)](https://www.npmjs.com/package/http-mock-json)
[![npm downloads](https://img.shields.io/npm/dm/http-mock-json?style=flat-square)](https://www.npmjs.com/package/http-mock-json)
[![license](https://img.shields.io/npm/l/http-mock-json?style=flat-square)](LICENSE)
[![GitHub stars](https://img.shields.io/github/stars/alejandrorodrom/http-mock-json?style=flat-square)](https://github.com/alejandrorodrom/http-mock-json/stargazers)
[![CI](https://img.shields.io/github/actions/workflow/status/alejandrorodrom/http-mock-json/ci.yml?branch=main&style=flat-square&label=CI)](https://github.com/alejandrorodrom/http-mock-json/actions/workflows/ci.yml)
[![E2E](https://img.shields.io/github/actions/workflow/status/alejandrorodrom/http-mock-json/e2e.yml?branch=main&style=flat-square&label=E2E)](https://github.com/alejandrorodrom/http-mock-json/actions/workflows/e2e.yml)
[![npm audit](https://img.shields.io/github/actions/workflow/status/alejandrorodrom/http-mock-json/npm-audit.yml?branch=main&style=flat-square&label=npm%20audit)](https://github.com/alejandrorodrom/http-mock-json/actions/workflows/npm-audit.yml)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat-square&logo=typescript&logoColor=white)
![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen?style=flat-square)

> Mock your real API in JSON — status codes, errors, validation, latency, and mutable data — so the frontend can develop and test without waiting on a backend.

Define the same endpoints your app will call. Switch success and failure scenarios, validate request shapes, persist collections, or proxy selected routes to a live server.

<p align="center">
  <img src="assets/architecture.webp" alt="Architecture: frontend talks to http-mock-json locally; optional proxy to real backend or other live APIs" width="900" />
</p>

The frontend keeps calling HTTP on your machine. Backend outages stop blocking you. Use flat `mocks/*.json` or microservice folders; proxy only the routes that should still hit a live service.

## Why http-mock-json

- **JSON-first** — describe routes and responses in plain files; no code required to mock an API
- **Frontend-ready** — status codes, headers, delays, multipart/raw bodies, and mutable CRUD stores
- **Safe by default** — startup validation catches broken mocks before they waste your time
- **Hot reload** — watch mode restarts when mock files change
- **Opt-in depth** — start static; add `match`, `request`, `store`, or `proxy` only when you need them

## Quick Start

Requires **Node.js >= 18**.

```bash
npm install http-mock-json --save-dev
npx mock-server init
npx mock-server start
```

Server defaults to `http://localhost:3000`. Full install walkthrough: [Getting started](docs/getting-started.md).

## Demo — your frontend talks to a real HTTP origin

This library is not an in-process stub: it boots a **local HTTP server** that speaks the same language as your backend (`GET`/`POST`, status codes, JSON bodies). Your app (browser, mobile, Postman) calls `http://localhost:3000/...` exactly as it would call staging.

`mocks/animals.json`:

```json
{
  "data/animals": {
    "GET": {
      "nameResponse": "success",
      "responses": [
        {
          "name": "success",
          "statusCode": "200",
          "body": { "items": [{ "id": 1, "name": "Fox" }] }
        },
        {
          "name": "error",
          "statusCode": "500",
          "body": { "message": "Upstream failed" }
        }
      ]
    }
  }
}
```

```bash
npx mock-server start
curl -i http://localhost:3000/data/animals
```

```http
HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8

{"items":[{"id":1,"name":"Fox"}]}
```

Change `"nameResponse"` to `"error"` (watch mode reloads). The same URL now returns the failure your UI must handle:

```http
HTTP/1.1 500 Internal Server Error
Content-Type: application/json; charset=utf-8

{"message":"Upstream failed"}
```

That is the “visual proof” for a backend mock: **same URL, different backend behavior**, controlled from JSON — visible in `curl`, DevTools → Network, or any API client.

## Features

| Feature | Docs |
|---------|------|
| Interactive `init` / `add` / CRUD scaffold | [CLI](docs/cli.md) |
| Multiple named responses per method | [Advanced examples](docs/advanced-examples.md) |
| Match by params, query, body, or call count | [Advanced examples](docs/advanced-examples.md) |
| Request validation (`payload` / `query` / `headers`) | [Body compatibility](docs/body-compatibility.md) |
| Multipart, form-urlencoded, raw, response `encoding` | [Body compatibility](docs/body-compatibility.md) |
| Mutable store (CRUD, filters, relations, persist) | [Mutable store](docs/store.md) |
| Proxy to a real backend | [Real-world projects](docs/real-world.md) |
| Folder organization (`mock.config.json`) | [Body compatibility](docs/body-compatibility.md#example-11-folder-organization-mockconfigjson) |
| Startup validation | [Validation](docs/validation.md) |

## Documentation

| Guide | Description |
|-------|-------------|
| [Documentation](docs/README.md) | Full docs index |
| [Getting started](docs/getting-started.md) | Install, structure, recommendations |
| [CLI](docs/cli.md) | Command reference |
| [Advanced examples](docs/advanced-examples.md) | Match, delay, validation recipes |
| [Body compatibility](docs/body-compatibility.md) | Content types, files, encoding |
| [Mutable store](docs/store.md) | CRUD collections and list APIs |
| [Real-world projects](docs/real-world.md) | Product-style scenarios |
| [Troubleshooting](docs/troubleshooting.md) | Common issues |
| [FAQ](docs/faq.md) | Short answers |
| [Changelog](CHANGELOG.md) | Release history |

## Examples in this repository

Copy-paste samples live under [`mocks/`](mocks/) (not shipped in the npm package). See the curated index: [Examples](docs/examples.md).

## Compared to

| Tool | Best when you need… |
|------|---------------------|
| **http-mock-json** | A standalone mock **HTTP server** driven by JSON files (status, match, validation, store, proxy) for local frontend work |
| **json-server** | Instant REST CRUD from a single `db.json` with little ceremony |
| **MSW** | In-process request interception in the **browser** and Node tests (no separate server) |

Use http-mock-json when your UI talks to a real HTTP origin and you want file-based scenarios without wiring service workers or writing handlers in code.

## Contributing

Contributions are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) for setup, tests, and PR guidelines.

## License

[MIT](LICENSE) — [Alejandro Rodriguez Romero](https://www.linkedin.com/in/alejandro-rodriguez-romero/) · [Project page](https://www.rodriguezrom.com/libraries/http-mock-json)

## Support

- [Project page](https://www.rodriguezrom.com/libraries/http-mock-json)
- [GitHub Issues](https://github.com/alejandrorodrom/http-mock-json/issues)
- Security: [SECURITY.md](SECURITY.md)

## Sponsors

If this project helps you, consider sponsoring:

- [GitHub Sponsors](https://github.com/sponsors/alejandrorodrom)
- [Ko-fi](https://ko-fi.com/alejandrorodriguezro)
