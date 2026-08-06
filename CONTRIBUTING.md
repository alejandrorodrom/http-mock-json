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
| `npm test` | Classic e2e suite (local / deterministic; required for PRs) |
| `npm run test:e2e:external` | All external e2e cases (live third-party APIs; flaky if upstream is down) |
| `npm run test:e2e:all` | Classic + external |
| `npm run dev:start` | Build, then start the CLI against local mocks |
| `npm run dev:init` | Build, then create a mocks folder (scaffold) |
| `npm run dev:add` | Build, then add a new mock interactively |

CI runs classic e2e as a required check. The full **external** suite (every live-upstream case) runs afterward as an **informational** job (`continue-on-error`) so third-party outages do not block merge.

When adding a test that calls a real remote API, register it in `externalCases` in `tests/e2e/cases/index.js` — never in the classic suite.

## Pull requests

1. Fork the repo and create a branch from `main`.
2. Keep changes focused (one concern per PR when possible).
3. Run `npm run build` and `npm test` before opening the PR.
4. Update the root [README](README.md) for guide/reference changes. Update [docs/faq.md](docs/faq.md) / [docs/troubleshooting.md](docs/troubleshooting.md) when the change is Q&A or symptom→fix help. Keep [docs/README.md](docs/README.md) in sync if section anchors move.
5. If you add or change mock behavior, add or update fixtures under `mocks/` and cases under `tests/e2e/`.

Use the [pull request template](.github/PULL_REQUEST_TEMPLATE.md) when opening a PR.

## Reporting bugs / ideas

- Bugs and features: [GitHub Issues](https://github.com/alejandrorodrom/http-mock-json/issues)
- Security vulnerabilities: see [SECURITY.md](SECURITY.md) (do not open a public issue with exploit details)

## Code of conduct

This project follows the [Contributor Covenant](CODE_OF_CONDUCT.md).
