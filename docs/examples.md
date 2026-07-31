# Examples

> Part of [Documentation](README.md). Related: [Advanced examples](advanced-examples.md) · [README — Concepts](../README.md#concepts) · [Real-world](real-world.md) · [Store recipes](store-recipes.md).

Sample mocks live under [`mocks/`](../mocks/) on GitHub (not published with the npm package). Copy a file into your mocks directory, or point `--path` / `-f` at the **mocks directory itself** (the folder that contains the `.json` files).

This page is an **index** of copy-worthy fixtures. Field shapes, CLI flags, and store rules live in the [README reference sections](../README.md#contents) (and in [Store recipes](store-recipes.md) / [Real-world](real-world.md) for product walkthroughs).

#### After Concepts, start here

| Fixture | Why |
|---------|-----|
| [`01-basic-multiple-responses.json`](../mocks/01-basic-multiple-responses.json) | Named responses + `nameResponse` |
| [`05-match-params.json`](../mocks/05-match-params.json) / [`07-match-body.json`](../mocks/07-match-body.json) | Branch with `match` |
| [`22-request.json`](../mocks/22-request.json) | `request` validation before `match` |
| [`25-store.json`](../mocks/25-store.json) | First mutable `store` + `action` |

| Need depth on… | Go to |
|----------------|--------|
| Endpoint / response / `match` / `request` fields | [Mock file](../README.md#mock-file-reference) |
| `mock-server` commands and flags | [CLI](../README.md#cli-reference) |
| Mutable `store` + `action` | [Store](../README.md#store-reference) |
| Store-backed product walkthroughs | [Store recipes](store-recipes.md) |
| One feature at a time (walkthroughs) | [Advanced examples](advanced-examples.md) |
| Product-style multi-feature scenarios | [Real-world projects](real-world.md) |

`mocks/invalid/` and `*-matrix.json` are test fixtures, not templates to copy.

---

### Basics

| Concept | File | What to try |
|---------|------|-------------|
| Several named responses for the same route; switch with `nameResponse`. | [`01-basic-multiple-responses.json`](../mocks/01-basic-multiple-responses.json) | `GET` / `POST` `/data/animals` with `AnimalsList` vs `AnimalsError` / `AnimalsSave`. |
| Custom response headers (CORS, auth challenge, counts). | [`02-custom-headers.json`](../mocks/02-custom-headers.json) | `GET /api/users` and inspect `X-Custom-Header` / `X-Total-Count`; try `unauthorized`. |
| `204` / `null` body and empty JSON shapes. | [`03-null-body.json`](../mocks/03-null-body.json) | `DELETE /api/users/1` → `204`; switch `nameResponse` on `GET /api/no-content`. |
| Route params plus GET/POST/PUT/PATCH/DELETE on one resource. | [`04-params-and-methods.json`](../mocks/04-params-and-methods.json) | Hit `/data/animals/1` with each method; also `GET /data/brands`. |

### Match

| Concept | File | What to try |
|---------|------|-------------|
| Branch by Express `:id` with `match.params`. | [`05-match-params.json`](../mocks/05-match-params.json) | `GET /api/profiles/1` → found; `/99` → admin; other id → `404`. |
| `match.query` plus method/response `delay`. | [`06-match-query-delay.json`](../mocks/06-match-query-delay.json) | `?status=active` (300ms), `?page=2&limit=10`, `?fast=true` (0ms), else default. |
| Partial `match.body` for login / create. | [`07-match-body.json`](../mocks/07-match-body.json) | `POST /api/login` with admin credentials vs anything else; `POST /api/orders` with the matching cart. |
| All of `params` + `query` + `body` must match. | [`08-match-combined.json`](../mocks/08-match-combined.json) | `PUT /api/accounts/1?source=web` with `{ "role": "admin" }`; incomplete combos → `403`. |
| Call-count scenarios (`match.call`, `by`, `loop`, `reset`). | [`40-match-call.json`](../mocks/40-match-call.json) | Wrong password 1→2→lock on `/api/auth/login`; correct password resets; try `api/flaky` / `api/flaky-loop`. |

### Proxy

| Concept | File | What to try |
|---------|------|-------------|
| Forward selected responses to a live host (`proxy` string / object / `true`). | [`09-proxy.json`](../mocks/09-proxy.json) | `GET /users?role=admin` (live), `?source=billing` (path rewrite), bare `/users` (local mock). |
| Runtime `502` when `"proxy": true` has no target. | [`16-runtime-proxy-orphan.json`](../mocks/16-runtime-proxy-orphan.json) | `GET /api/proxy-orphan?live=true` without `--proxy` / method proxy. |
| Upstream failure surface for proxy errors. | [`17-proxy-request-failed.json`](../mocks/17-proxy-request-failed.json) | Call the failing proxy route and inspect the error JSON. |

### Shape / status

| Concept | File | What to try |
|---------|------|-------------|
| Common HTTP status codes as static responses. | [`10-status-codes-standard.json`](../mocks/10-status-codes-standard.json) | Hit `/api/status/<code>` for the statuses you care about. |
| Non-standard codes that warn at startup but still serve. | [`11-status-codes-warnings.json`](../mocks/11-status-codes-warnings.json) | Start the server and note warnings; request the custom codes. |
| Body types: string, number, boolean, null, array, nested. | [`12-body-types.json`](../mocks/12-body-types.json) | `GET` each `/api/types/...` route and compare JSON shapes. |
| Endpoint path characters (`-`, `_`, `.`, `~`, params). | [`13-endpoint-chars.json`](../mocks/13-endpoint-chars.json) | Call the listed `/api/v1/...` paths as written. |
| HTTP method key casing in the mock file. | [`14-http-methods-case.json`](../mocks/14-http-methods-case.json) | Exercise lowercase vs mixed-case method keys. |

### Request validation & body modes

| Concept | File | What to try |
|---------|------|-------------|
| Classic `request.payload` / `query` + `error.*` before `match`. | [`22-request.json`](../mocks/22-request.json) | Invalid register → `422`; valid + `taken@example.com` → `409`; search query map errors. |
| SaaS-style validation flows (signup, members, webhooks). | [`24-request-saas.json`](../mocks/24-request-saas.json) | Drive signup / invite / webhook payloads through success vs business errors. |
| Multipart / raw / text / headers gate (`as`, `type: "file"`). | [`42-request-multipart.json`](../mocks/42-request-multipart.json) | `POST /api/upload` with FormData; try raw and text routes. |
| Response `encoding` `file` / `base64` (+ missing/escape paths). | [`41-response-encoding.json`](../mocks/41-response-encoding.json) | Fetch binary routes; trigger missing/escape to see runtime `500` JSON. |
| `request` + `match` combos across content types. | [`47-request-match-combos.json`](../mocks/47-request-match-combos.json) | Hit each `/api/combo/...` mode with matching vs non-matching bodies. |
| Profile onboarding: multipart + `encoding:file` + raw + headers / proxy. | [`44-profile-body-compat.json`](../mocks/44-profile-body-compat.json) | Create profile with FormData, download avatar bytes, raw re-upload. |
| Helpdesk multi-file multipart + encoding + tenant headers. | [`45-ticket-attachments.json`](../mocks/45-ticket-attachments.json) | Create ticket, upload screenshots/PDF, download attachments. |
| Expenses: store + soft delete + list + multipart + `match.call` + delay. | [`46-expense-reports.json`](../mocks/46-expense-reports.json) | CRUD expenses, upload receipts, trash/restore, rate-limit path. |
| OAuth2 token/revoke with `as: "form"` + `match.body` on urlencoded. | [`48-oauth-form-token.json`](../mocks/48-oauth-form-token.json) | `POST /oauth/token` (password / refresh / client_credentials) and `/oauth/revoke`. |

### Product-style (static match)

| Concept | File | What to try |
|---------|------|-------------|
| Auth login / register / logout / me / refresh scenarios. | [`15-auth-scenarios.json`](../mocks/15-auth-scenarios.json) | Walk the auth routes with success vs error credentials. |
| REST resource lifecycle (list/create/get/update/delete). | [`18-rest-resource-lifecycle.json`](../mocks/18-rest-resource-lifecycle.json) | Full CRUD against `/api/v1/products` and `/:id`. |
| Checkout / payment resilience (`402` / `429` / `503`, delays). | [`19-checkout-resilience.json`](../mocks/19-checkout-resilience.json) | Create/poll checkout sessions under failure modes. |
| Multi-tenant RBAC via params/query. | [`20-multi-tenant-rbac.json`](../mocks/20-multi-tenant-rbac.json) | Admin vs member across orgs; expect `403` when roles mismatch. |

### Store

Walkthroughs for store-backed apps: [Store recipes](store-recipes.md). Field reference: [Store](../README.md#store-reference).

| Concept | File | What to try |
|---------|------|-------------|
| Store basics: seed, unique, `action` CRUD, `notFound`. | [`25-store.json`](../mocks/25-store.json) | List/create/get/update/delete under `/api/:tenantId/users`. |
| Persist store data across restarts. | [`26-store-persist.json`](../mocks/26-store-persist.json) | Mutate notes, restart server, confirm data survived. |
| SaaS board-style store (org-scoped projects). | [`29-store-saas.json`](../mocks/29-store-saas.json) | CRUD projects; hit slug uniqueness conflicts. |
| Store + RBAC-style routes. | [`30-store-rbac.json`](../mocks/30-store-rbac.json) | Role-gated list/create against store-backed resources. |
| `store.list` sort / page / filters. | [`31-store-list.json`](../mocks/31-store-list.json) | Page, sort, and filter query params on the list route. |
| Commerce catalog store. | [`32-store-commerce.json`](../mocks/32-store-commerce.json) | Browse/filter products; create/update catalog items. |
| Helpdesk inbox store. | [`33-store-helpdesk.json`](../mocks/33-store-helpdesk.json) | List tickets with facets; patch status. |
| HR directory filters. | [`34-store-hr.json`](../mocks/34-store-hr.json) | Filter employees by salary, level, hire window, roles. |
| Composite unique / key fields. | [`35-store-unique-composite.json`](../mocks/35-store-unique-composite.json) | Create members that collide on tenant+email vs username. |
| Redundant unique field shapes (string vs object). | [`36-store-unique-redundant.json`](../mocks/36-store-unique-redundant.json) | Compare conflict behavior across the three collections. |
| Soft delete / restore. | [`37-store-soft-delete.json`](../mocks/37-store-soft-delete.json) | Delete → missing from list → restore; try `includeDeleted`. |
| Cross-store relations / expand. | [`38-store-relations.json`](../mocks/38-store-relations.json) | Create related rows; `?expand=...`; delete with restrict/cascade. |

### Folders

| Concept | Path | What to try |
|---------|------|-------------|
| Folder organization with `mock.config.json` (auth / orders / payments). | [`mocks/mock-config/`](../mocks/mock-config) | `mock-server start -f mocks/mock-config` — prefixes, delays, headers, disabled `payments-v2`. Details: [Mock config](../README.md#mock-config-reference). |

---

Next: walk through features one by one in [Advanced examples](advanced-examples.md), or jump to product scenarios in [Real-world projects](real-world.md).

