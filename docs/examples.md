# Examples in this repository 📂

Sample mocks live under [`mocks/`](../mocks) on GitHub (not published with the npm package). Use the descriptions below to pick what you need and copy it into your project.

The numbered `.json` files are single-file samples (copy into your mocks folder). [`mocks/mock-config/`](../mocks/mock-config) is a full folder-organization tree (`mock.config.json` + service folders); point `start` at that directory with `-f` / `--path` — see [Example 11: Folder organization](body-compatibility.md#example-11-folder-organization-mockconfigjson).

| Topic | File | What it is for |
|-------|------|----------------|
| Basics | [`01-basic-multiple-responses.json`](../mocks/01-basic-multiple-responses.json) | Multiple responses / switch scenario |
| | [`02-custom-headers.json`](../mocks/02-custom-headers.json) | Custom response headers |
| | [`03-null-body.json`](../mocks/03-null-body.json) | `204` / null body |
| | [`04-params-and-methods.json`](../mocks/04-params-and-methods.json) | Route params + several HTTP methods |
| Match | [`05-match-params.json`](../mocks/05-match-params.json) | `match.params` |
| | [`06-match-query-delay.json`](../mocks/06-match-query-delay.json) | `match.query` + delay |
| | [`07-match-body.json`](../mocks/07-match-body.json) | `match.body` |
| | [`08-match-combined.json`](../mocks/08-match-combined.json) | Combined match rules |
| | [`40-match-call.json`](../mocks/40-match-call.json) | `match.call` (attempts / lockout-style) |
| Proxy | [`09-proxy.json`](../mocks/09-proxy.json) | Proxy to a live backend |
| | [`17-proxy-request-failed.json`](../mocks/17-proxy-request-failed.json) | Proxy failure surface |
| Shape / status | [`10-status-codes-standard.json`](../mocks/10-status-codes-standard.json) | Common status codes |
| | [`12-body-types.json`](../mocks/12-body-types.json) | Body type variants |
| | [`13-endpoint-chars.json`](../mocks/13-endpoint-chars.json) | Endpoint path characters |
| | [`14-http-methods-case.json`](../mocks/14-http-methods-case.json) | HTTP method casing |
| Request | [`22-request.json`](../mocks/22-request.json) | Request validation |
| | [`24-request-saas.json`](../mocks/24-request-saas.json) | SaaS-style validation flows |
| | [`41-response-encoding.json`](../mocks/41-response-encoding.json) | Response `encoding` file / base64 (+ error paths) |
| | [`44-profile-body-compat.json`](../mocks/44-profile-body-compat.json) | Real profile onboarding: multipart + `encoding:file` + raw upload + `match.headers` / proxy |
| | [`45-ticket-attachments.json`](../mocks/45-ticket-attachments.json) | Helpdesk attachments: multi-file multipart + `encoding` file/base64 + tenant headers |
| | [`46-expense-reports.json`](../mocks/46-expense-reports.json) | Expenses: `store` + soft delete + list filters + multipart receipts + `encoding` + `match.call` + `delay` |
| | [`48-oauth-form-token.json`](../mocks/48-oauth-form-token.json) | OAuth2 `/oauth/token` + `/oauth/revoke`: `as: "form"` + `match.body` on urlencoded grants |
| Product-style | [`15-auth-scenarios.json`](../mocks/15-auth-scenarios.json) | Auth scenarios |
| | [`18-rest-resource-lifecycle.json`](../mocks/18-rest-resource-lifecycle.json) | REST resource lifecycle |
| | [`19-checkout-resilience.json`](../mocks/19-checkout-resilience.json) | Checkout / payment resilience |
| | [`20-multi-tenant-rbac.json`](../mocks/20-multi-tenant-rbac.json) | Multi-tenant RBAC |
| Store | [`25-store.json`](../mocks/25-store.json) | Mutable store basics |
| | [`26-store-persist.json`](../mocks/26-store-persist.json) | Persist across restarts |
| | [`29-store-saas.json`](../mocks/29-store-saas.json) | SaaS board-style store |
| | [`30-store-rbac.json`](../mocks/30-store-rbac.json) | Store + RBAC-style routes |
| | [`31-store-list.json`](../mocks/31-store-list.json) | `store.list` sort / page / filters |
| | [`32-store-commerce.json`](../mocks/32-store-commerce.json) | Commerce catalog |
| | [`33-store-helpdesk.json`](../mocks/33-store-helpdesk.json) | Helpdesk inbox |
| | [`34-store-hr.json`](../mocks/34-store-hr.json) | HR directory filters |
| | [`37-store-soft-delete.json`](../mocks/37-store-soft-delete.json) | Soft delete / restore |
| | [`38-store-relations.json`](../mocks/38-store-relations.json) | Cross-store relations |
| Folders | [`mocks/mock-config/`](../mocks/mock-config) | Folder organization (`mock.config.json` + auth / orders / payments). Use with `-f` / `--path` — [Example 11](body-compatibility.md#example-11-folder-organization-mockconfigjson) |

`mocks/invalid/` and `*-matrix.json` are test fixtures, not templates to copy.

For walkthroughs of the same topics, see [Advanced examples](advanced-examples.md#advanced-examples), [Mutable store](store.md#mutable-store-), and [Real-world projects](real-world.md#real-world-projects-).

---

