# Contributing

Thanks for helping improve **http-mock-json**.

## Development setup

```bash
git clone https://github.com/alejandrorodrom/http-mock-json.git
cd http-mock-json
npm ci
npm run build
```

Requirements: Node.js `>= 18`.

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run build` | Compile TypeScript to `dist/` |
| `npm test` | Run the e2e suite (`tests/run-e2e.js`) |
| `npm run dev:start` | Build, then start the CLI against local mocks |
| `npm run dev:init` | Build, then create a mocks folder (scaffold) |
| `npm run dev:add` | Build, then add a new mock interactively |

## Pull requests

1. Fork the repo and create a branch from `main`.
2. Keep changes focused (one concern per PR when possible).
3. Run `npm run build` and `npm test` before opening the PR.
4. Update docs under `docs/` (and the root [README](README.md) if the landing story changes).
5. If you add or change mock behavior, add or update fixtures under `mocks/` and cases under `tests/e2e/`.

Use the [pull request template](.github/PULL_REQUEST_TEMPLATE.md) when opening a PR.

## Reporting bugs / ideas

- Bugs and features: [GitHub Issues](https://github.com/alejandrorodrom/http-mock-json/issues)
- Security vulnerabilities: see [SECURITY.md](SECURITY.md) (do not open a public issue with exploit details)

## Code of conduct

This project follows the [Contributor Covenant](CODE_OF_CONDUCT.md).
