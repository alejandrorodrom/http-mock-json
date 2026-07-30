# Real-world projects 🏢

The [Advanced examples](advanced-examples.md#advanced-examples) teach one feature at a time. This section shows **product-style scenarios** you can paste into your own mock JSON files and adapt to your frontend routes.

### What each scenario covers

| Scenario | Features used | Frontend focus |
|----------|---------------|----------------|
| [Todo / notes app](store.md#example-c--real-project-todo--notes-app) | `store` + `request` + `persist` | Mutable list, toggle done, survive restart |
| [SaaS projects board](store.md#example-d--real-project-saas-projects-board) | `store` + `match` + `unique` + `persist` | Org-scoped CRUD, slug conflicts, forbidden org |
| [E-commerce catalog](store.md#example-e--real-project-e-commerce-catalog) | `store` + advanced `filter` + `request` + `match` + `delay` | Admin table, price/stock/warehouse filters, checkout |
| [Multi-tenant helpdesk](store.md#example-f--real-project-multi-tenant-helpdesk) | `store` + page/cursor + date/channel filters + `or` | Inbox facets, SLA, activity feed |
| [HR employee directory](store.md#example-g--real-project-hr-employee-directory) | All filter ops + nested + `or` + search | People admin: salary, level, hire window, roles |
| [Blog CMS with authors](store.md#example-h--real-project-blog-cms-with-authors) | `relations` + `softDelete` + `list` + `request` + `unique` + `persist` | Expand, trash/restore, FK + restrict delete |
| [Multi-tenant orders](store.md#example-i--real-project-multi-tenant-orders) | Composite `join` + `cascade` + `list` + `request` + `persist` | Order + line items, tenant routes, expand parent |
| [Auth lockout + sessions](store.md#example-j--real-project-auth-lockout--sessions) | `match.call` + `request` + `delay` + headers + `store` + `persist` | Per-email lockout, reset on success, session revoke |
| [JWT access + refresh](store.md#example-k--real-project-jwt-access--refresh-tokens) | `request` + `match.body` + `match.call` + `match.query` | Login / refresh rotation / reuse / logout / `/me` |
| [Password reset](store.md#example-l--real-project-password-reset) | `request` + `match.params` + `match.body` + `delay` | Forgot / validate token / set password |
| [Async export job](store.md#example-m--real-project-async-export-job) | `match.call` + `202` + `Retry-After` + `delay` | Create job, poll queued→ready, download |
| [Notifications inbox](store.md#example-n--real-project-notifications-inbox) | `store` + `list` filter + `patch` + `persist` | Unread filter, mark read, mark-all ack |
| [Signed URL upload](store.md#example-o--real-project-signed-url-upload) | `request` + `match` + `delay` + `413`/`410` | Initiate → PUT content → complete → asset |
| [Profile onboarding (multipart + binary)](#example-profile-onboarding-multipart--binary) | `as` multipart/raw + `type: "file"` + `encoding: "file"` + `match.headers` / `match.multipart` + `proxy` | Create profile with FormData, serve avatar bytes, raw re-upload, admin vs public |
| [Ticket attachments (multi-file + download)](#example-ticket-attachments-multi-file--download) | Multi-file `type: "file"` + `encoding` file/base64 + `request.headers` tenant + `match.multipart` | Helpdesk: create ticket, upload screenshots/PDF, download bytes |
| [Expense reports (store + binary)](#example-expense-reports-store--binary) | `store` + soft delete/restore + `list` filters + multipart `type: "file"` + `encoding` + `match.call` + `delay` + `match.multipart` | Create/list/patch expenses, upload receipts with rate limit, preview bytes, trash/restore |
| [OAuth2 token (form-urlencoded)](#example-oauth2-token-form-urlencoded) | `as: "form"` + `request.payload` + `match.body` on urlencoded fields | Password / refresh / client_credentials grants + revoke (not JSON login) |
| [Feature flags / config](store.md#example-p--real-project-feature-flags--app-config) | `match.query` + `match.params` + `delay` | Boot config, tenant flags, maintenance |
| [Billing / subscription](store.md#example-q--real-project-billing--subscription) | `request` + `match` + `402`/`403`/`409` | Plans, trial, past_due, upgrade, pay invoice |
| [Onboarding wizard](store.md#example-r--real-project-onboarding-wizard) | `request` + `match` + `409` | Multi-step save, resume, complete |
| SaaS signup + org invite | `request` + `match` | Form validation vs business errors (`409`, `403`) |
| Checkout resilience | `match` + `delay` + headers | `402` / `429` / `503`, retries, idempotency |
| Multi-tenant RBAC | `match.params` + `match.query` | Admin vs member, `403` across orgs |
| REST CRUD + pagination | `match` + headers | Tables, create/update/delete, `404` / `409` / `410` |
| Request + proxy | `request` + `proxy` | Validate locally, forward only when valid |
| Global `--proxy` | CLI `--proxy` | Unmocked routes go to a real backend |
| Webhooks | `request` (array + enum) | Register callback URLs and event lists |
| [Food delivery — simple folders](#example-food-delivery-simple-folder-mocks) | `mock.config.json` + `prefix` + `delay` + `headers` | Split auth / restaurants like microservices |
| [Food delivery — cart + store](#example-food-delivery-cart--store-namespaces) | folders + `store` + `storeNamespace` + `request` + `persist` | Mutable cart per service namespace |
| [Food delivery — hybrid live payments](#example-food-delivery-hybrid-live-payments) | `proxyUnmatched` + `stripPrefix` + `match` + `enabled` + `strictDuplicates` | Mock catalog/orders; live payment gateway |

### Example: SaaS signup + org invite

Validate the payload first, then branch with `match` for business errors (`409` email taken, `403` insufficient role).

```json
{
  "api/saas/signup": {
    "POST": {
      "nameResponse": "created",
      "request": {
        "payload": {
          "email": { "type": "string", "format": "email", "message": "Use a valid work email" },
          "password": { "type": "string", "minLength": 10, "maxLength": 128 },
          "company": { "type": "string", "minLength": 2 },
          "plan": { "type": "string", "enum": ["free", "pro", "business"] },
          "seats?": { "type": "number", "min": 1, "max": 500 },
          "billing": {
            "type": "object",
            "properties": {
              "country": { "type": "string", "minLength": 2, "maxLength": 2 },
              "vat?": { "type": "string", "pattern": "^[A-Z]{2}[A-Z0-9]{8,12}$" }
            }
          }
        },
        "error": {
          "response": "validation-error"
        }
      },
      "responses": [
        { "name": "created", "statusCode": 201, "body": { "orgId": "org_1", "status": "active" } },
        {
          "name": "email-taken",
          "statusCode": 409,
          "match": { "body": { "email": "taken@acme.com" } },
          "body": { "code": "EMAIL_TAKEN" }
        },
        {
          "name": "validation-error",
          "statusCode": 422,
          "body": { "message": "Signup validation failed", "errors": [] }
        }
      ]
    }
  },
  "api/saas/orgs/:orgId/members": {
    "POST": {
      "nameResponse": "not-found",
      "request": {
        "payload": {
          "email": { "type": "string", "format": "email" },
          "role": { "type": "string", "enum": ["owner", "admin", "member"] }
        },
        "error": {
          "response": "validation-error"
        }
      },
      "responses": [
        {
          "name": "invited",
          "statusCode": 201,
          "match": { "params": { "orgId": "org_1" } },
          "body": { "inviteId": "inv_1", "status": "pending" }
        },
        {
          "name": "forbidden",
          "statusCode": 403,
          "match": {
            "params": { "orgId": "org_2" },
            "body": { "role": "owner" }
          },
          "body": { "code": "INSUFFICIENT_ROLE" }
        },
        { "name": "not-found", "statusCode": 404, "body": { "code": "ORG_NOT_FOUND" } },
        { "name": "validation-error", "statusCode": 422, "body": { "message": "Invalid request", "errors": [] } }
      ]
    }
  }
}
```

| Call | Result |
|------|--------|
| Invalid signup body | `422 validation-error` (`request` fails before `match`) |
| Valid signup + `taken@acme.com` | `409 EMAIL_TAKEN` |
| Invite member on `org_1` | `201` invite |
| Invite `owner` on `org_2` | `403 INSUFFICIENT_ROLE` |

### Example: Checkout resilience (payments UI)

Drive edge cases with `match.query` / `match.body` — useful for retry banners, idempotent pay buttons, and `Retry-After` handling.

```json
{
  "api/v1/checkout/sessions": {
    "POST": {
      "nameResponse": "created",
      "delay": 80,
      "responses": [
        {
          "name": "rate-limited",
          "statusCode": 429,
          "delay": 200,
          "match": { "query": { "scenario": "rate_limit" } },
          "headers": {
            "Retry-After": "2",
            "X-RateLimit-Remaining": "0"
          },
          "body": {
            "title": "Too Many Requests",
            "code": "RATE_LIMITED"
          }
        },
        {
          "name": "maintenance",
          "statusCode": 503,
          "match": { "query": { "scenario": "maintenance" } },
          "headers": { "Retry-After": "30" },
          "body": { "title": "Service Unavailable", "code": "PROVIDER_UNAVAILABLE" }
        },
        {
          "name": "card-declined",
          "statusCode": 402,
          "match": {
            "body": {
              "paymentMethod": "card",
              "card": { "number": "4000000000000002" }
            }
          },
          "body": { "code": "CARD_DECLINED", "detail": "The card was declined" }
        },
        {
          "name": "idempotent-replay",
          "statusCode": 409,
          "match": { "body": { "idempotencyKey": "pay_dup_1" } },
          "body": { "code": "IDEMPOTENCY_CONFLICT", "detail": "Already processed" }
        },
        {
          "name": "created",
          "statusCode": 201,
          "body": { "sessionId": "cs_1", "status": "open" }
        }
      ]
    }
  }
}
```

| Trigger | Status | Frontend focus |
|---------|--------|----------------|
| `?scenario=rate_limit` | `429` + `Retry-After` | Backoff / disable CTA |
| `?scenario=maintenance` | `503` | Maintenance banner |
| Declined test card | `402` | Payment error copy |
| Duplicate idempotency key | `409` | “Already processed” |

### Example: Multi-tenant RBAC

Same route shape (`/orgs/:orgId/...`), different outcomes by `params` + `query.role`.

```json
{
  "api/v1/orgs/:orgId/projects": {
    "GET": {
      "nameResponse": "unauthorized",
      "responses": [
        {
          "name": "list-admin",
          "statusCode": 200,
          "match": {
            "params": { "orgId": "org_1" },
            "query": { "role": "admin" }
          },
          "headers": { "X-Org-Id": "org_1", "X-Total-Count": "2" },
          "body": {
            "data": [
              { "id": "prj_1", "name": "Website", "role": "admin" },
              { "id": "prj_2", "name": "Mobile", "role": "admin" }
            ]
          }
        },
        {
          "name": "list-member",
          "statusCode": 200,
          "match": {
            "params": { "orgId": "org_1" },
            "query": { "role": "member" }
          },
          "body": {
            "data": [{ "id": "prj_1", "name": "Website", "role": "viewer" }]
          }
        },
        {
          "name": "forbidden",
          "statusCode": 403,
          "match": {
            "params": { "orgId": "org_2" },
            "query": { "role": "member" }
          },
          "body": { "title": "Forbidden", "code": "FORBIDDEN" }
        },
        {
          "name": "unauthorized",
          "statusCode": 401,
          "body": { "title": "Unauthorized", "code": "UNAUTHORIZED" }
        }
      ]
    }
  }
}
```

| Request | Result |
|---------|--------|
| `GET /api/v1/orgs/org_1/projects?role=admin` | Admin project list |
| `GET /api/v1/orgs/org_1/projects?role=member` | Restricted list |
| `GET /api/v1/orgs/org_2/projects?role=member` | `403` forbidden |
| Missing match (no role / unknown org) | `401` via `nameResponse` |

### Example: Auth login with validation + business match

For **per-email lockout**, `Retry-After`, `call.reset` on success, and a **sessions** store after login, use the full pasteable mock in [Example J — Auth lockout + sessions](store.md#example-j--real-project-auth-lockout--sessions).

That scenario combines `request` (invalid payload never advances the counter), `match.call` (`index` / `by` / `reset`), `delay`, custom headers, and `store` + `persist`.

For **access + refresh token** flows (rotation, reuse detection, logout, protected `/me`), see [Example K — JWT access + refresh tokens](store.md#example-k--real-project-jwt-access--refresh-tokens).

For **forgot / reset password** (no email enumeration, expired/used tokens), see [Example L — Password reset](store.md#example-l--real-project-password-reset).

### Example: REST CRUD + pagination

Typical resource UI: list with filters/pages, get by id, create, update conflict, soft-delete gone.

```json
{
  "api/v1/products": {
    "GET": {
      "nameResponse": "empty",
      "responses": [
        {
          "name": "page-1-active",
          "statusCode": 200,
          "match": { "query": { "page": "1", "status": "active" } },
          "headers": { "X-Total-Count": "2" },
          "body": {
            "data": [
              { "id": "prod_1", "name": "Starter", "status": "active", "price": 990 },
              { "id": "prod_2", "name": "Pro", "status": "active", "price": 2990 }
            ],
            "page": 1,
            "total": 2
          }
        },
        {
          "name": "page-2",
          "statusCode": 200,
          "match": { "query": { "page": "2" } },
          "headers": { "X-Total-Count": "12" },
          "body": {
            "data": [{ "id": "prod_11", "name": "Enterprise", "status": "active" }],
            "page": 2,
            "total": 12
          }
        },
        {
          "name": "empty",
          "statusCode": 200,
          "headers": { "X-Total-Count": "0" },
          "body": { "data": [], "page": 1, "total": 0 }
        }
      ]
    },
    "POST": {
      "nameResponse": "created",
      "request": {
        "payload": {
          "name": { "type": "string", "minLength": 1 },
          "sku": { "type": "string", "minLength": 3 },
          "price": { "type": "number", "min": 0 }
        },
        "error": {
          "response": "validation-error"
        }
      },
      "responses": [
        {
          "name": "duplicate-sku",
          "statusCode": 409,
          "match": { "body": { "sku": "SKU-EXISTS" } },
          "body": { "code": "DUPLICATE_SKU", "detail": "SKU already exists" }
        },
        {
          "name": "created",
          "statusCode": 201,
          "headers": { "Location": "/api/v1/products/prod_99" },
          "body": { "id": "prod_99", "name": "New Product", "sku": "SKU-NEW", "status": "draft" }
        },
        {
          "name": "validation-error",
          "statusCode": 422,
          "body": { "message": "Invalid request", "errors": [] }
        }
      ]
    }
  },
  "api/v1/products/:id": {
    "GET": {
      "nameResponse": "not-found",
      "responses": [
        {
          "name": "found",
          "statusCode": 200,
          "match": { "params": { "id": "prod_1" } },
          "body": { "id": "prod_1", "name": "Starter", "status": "active", "price": 990, "version": 3 }
        },
        {
          "name": "gone",
          "statusCode": 410,
          "match": { "params": { "id": "prod_gone" } },
          "body": { "code": "PRODUCT_GONE", "detail": "Permanently deleted" }
        },
        {
          "name": "not-found",
          "statusCode": 404,
          "body": { "code": "PRODUCT_NOT_FOUND" }
        }
      ]
    },
    "PATCH": {
      "nameResponse": "not-found",
      "responses": [
        {
          "name": "version-conflict",
          "statusCode": 409,
          "match": {
            "params": { "id": "prod_1" },
            "body": { "version": 2 }
          },
          "body": { "code": "VERSION_CONFLICT", "currentVersion": 3 }
        },
        {
          "name": "updated",
          "statusCode": 200,
          "match": { "params": { "id": "prod_1" } },
          "body": { "id": "prod_1", "name": "Starter Plus", "version": 4 }
        },
        { "name": "not-found", "statusCode": 404, "body": { "code": "PRODUCT_NOT_FOUND" } }
      ]
    },
    "DELETE": {
      "nameResponse": "not-found",
      "responses": [
        {
          "name": "deleted",
          "statusCode": 204,
          "match": { "params": { "id": "prod_1" } },
          "body": null
        },
        { "name": "not-found", "statusCode": 404, "body": { "code": "PRODUCT_NOT_FOUND" } }
      ]
    }
  }
}
```

| Call | Result |
|------|--------|
| `GET .../products?page=1&status=active` | Page 1 list + `X-Total-Count` |
| `GET .../products?page=2` | Page 2 |
| `POST` with `sku: "SKU-EXISTS"` | `409` duplicate |
| `GET .../products/prod_gone` | `410` gone |
| `PATCH` with stale `version: 2` | `409` conflict |
| `DELETE .../products/prod_1` | `204` |

### Example: Request validation + proxy (mock vs live)

Validate first. Invalid bodies never hit the upstream. Valid bodies can stay local or forward with `proxy`.

```json
{
  "api/v1/posts": {
    "POST": {
      "nameResponse": "mock",
      "proxy": "https://jsonplaceholder.typicode.com",
      "request": {
        "payload": {
          "title": { "type": "string", "minLength": 3 },
          "body?": { "type": "string", "minLength": 1 }
        },
        "error": {
          "response": "validation-error"
        }
      },
      "responses": [
        {
          "name": "live",
          "proxy": {
            "target": "https://jsonplaceholder.typicode.com",
            "path": "/posts"
          },
          "match": { "body": { "title": "live-post" } }
        },
        {
          "name": "mock",
          "statusCode": 200,
          "body": { "source": "mock", "id": 0 }
        },
        {
          "name": "validation-error",
          "statusCode": 422,
          "body": { "message": "Invalid request", "errors": [] }
        }
      ]
    }
  }
}
```

| Call | Result |
|------|--------|
| `{ "title": "x" }` | `422` — blocked by `request` |
| `{ "title": "local-draft" }` | Local mock body |
| `{ "title": "live-post" }` | Proxied to upstream `/posts` |

### Example: Global `--proxy` for unmocked routes

Mock only the routes you care about. Everything else can fall through to a real API:

```bash
mock-server start --proxy https://api.staging.com
```

```json
{
  "api/v1/feature-flags": {
    "GET": {
      "nameResponse": "defaults",
      "responses": [
        {
          "name": "defaults",
          "statusCode": 200,
          "body": { "newCheckout": true, "darkMode": false }
        }
      ]
    }
  }
}
```

| Call | Result |
|------|--------|
| `GET /api/v1/feature-flags` | Local mock |
| `GET /api/v1/users/me` (no mock) | Forwarded to `https://api.staging.com/api/v1/users/me` |
| `POST /billing/invoices` (no mock) | Forwarded with the original path + query |

Use this when the frontend needs one or two controlled responses and the rest of the backend already works in staging.

### Example: Webhooks registration

Validate callback URL, event list, and secret before returning a webhook id.

```json
{
  "api/saas/webhooks": {
    "POST": {
      "nameResponse": "created",
      "request": {
        "payload": {
          "url": { "type": "string", "format": "url" },
          "events": {
            "type": "array",
            "minItems": 1,
            "maxItems": 10,
            "items": {
              "type": "string",
              "enum": ["invoice.paid", "invoice.failed", "member.joined"]
            }
          },
          "secret": { "type": "string", "minLength": 16 }
        },
        "error": {
          "format": "map",
          "key": "errors"
        }
      },
      "responses": [
        {
          "name": "created",
          "statusCode": 201,
          "body": { "webhookId": "wh_1", "status": "active" }
        }
      ]
    }
  },
  "api/saas/webhooks/:id/deliveries": {
    "GET": {
      "nameResponse": "empty",
      "responses": [
        {
          "name": "recent",
          "statusCode": 200,
          "match": { "params": { "id": "wh_1" } },
          "body": {
            "data": [
              { "event": "invoice.paid", "status": "delivered", "attempts": 1 },
              { "event": "invoice.failed", "status": "failed", "attempts": 3 }
            ]
          }
        },
        {
          "name": "empty",
          "statusCode": 200,
          "body": { "data": [] }
        }
      ]
    }
  }
}
```

| Call | Result |
|------|--------|
| Invalid `url` / empty `events` / short `secret` | `400` with `errors` map |
| Valid registration | `201` + `webhookId` |
| `GET .../webhooks/wh_1/deliveries` | Delivery history for UI |

### Example: Profile onboarding (multipart + binary)

**App:** signup / profile UI that uploads `FormData` (fields + avatar), shows the avatar from a binary GET, and later replaces it with a raw `PUT`. Optional header switches admin view or live proxy.

Full sample on GitHub: [`mocks/44-profile-body-compat.json`](../mocks/44-profile-body-compat.json) (put a PNG at `assets/sample.png` under your mocks root for `encoding: "file"`).

See also [Body compatibility](body-compatibility.md#body-compatibility-request--response-) for the `as` / `file` / `encoding` rules.

```json
{
  "api/profiles": {
    "POST": {
      "nameResponse": "created",
      "request": {
        "as": "multipart",
        "payload": {
          "name": { "type": "string", "minLength": 2, "maxLength": 80 },
          "email": { "type": "string", "format": "email", "message": "Use a valid work email" },
          "age?": { "type": "number", "min": 18, "max": 120 },
          "role": { "type": "string", "enum": ["member", "admin"] },
          "avatar": {
            "type": "file",
            "format": ["png", "jpeg"],
            "maxSize": 2000000,
            "minSize": 8,
            "requireFilename": true,
            "messages": {
              "format": "Avatar must be PNG or JPEG",
              "maxSize": "Avatar must be under 2MB"
            }
          },
          "cv?": { "type": "file", "format": "pdf", "maxSize": 5000000 }
        },
        "error": {
          "response": "validation-error",
          "format": "map",
          "key": "fields"
        }
      },
      "responses": [
        {
          "name": "created",
          "statusCode": 201,
          "body": {
            "id": "prof_1",
            "status": "pending_review",
            "avatarUrl": "/api/profiles/prof_1/avatar"
          }
        },
        {
          "name": "duplicate-email",
          "statusCode": 409,
          "match": { "multipart": { "email": "taken@example.com" } },
          "body": { "code": "EMAIL_TAKEN", "message": "A profile with this email already exists" }
        },
        {
          "name": "live",
          "proxy": {
            "target": "https://jsonplaceholder.typicode.com",
            "path": "/users"
          },
          "match": { "headers": { "x-mock-mode": "live" } }
        },
        {
          "name": "validation-error",
          "statusCode": 422,
          "body": { "message": "Profile validation failed", "fields": {} }
        }
      ]
    }
  },
  "api/profiles/:id": {
    "GET": {
      "nameResponse": "public",
      "responses": [
        {
          "name": "admin",
          "statusCode": 200,
          "match": { "headers": { "x-role": "admin" } },
          "body": {
            "id": "prof_1",
            "email": "ada@example.com",
            "role": "admin",
            "internalNotes": "Priority onboard"
          }
        },
        {
          "name": "public",
          "statusCode": 200,
          "body": {
            "id": "prof_1",
            "name": "Ada",
            "role": "member",
            "avatarUrl": "/api/profiles/prof_1/avatar"
          }
        },
        {
          "name": "not-found",
          "statusCode": 404,
          "match": { "params": { "id": "missing" } },
          "body": { "code": "PROFILE_NOT_FOUND" }
        }
      ]
    }
  },
  "api/profiles/:id/avatar": {
    "GET": {
      "nameResponse": "png",
      "responses": [
        {
          "name": "png",
          "statusCode": 200,
          "headers": {
            "Content-Type": "image/png",
            "Cache-Control": "public, max-age=60"
          },
          "encoding": "file",
          "body": "assets/sample.png"
        },
        {
          "name": "gone",
          "statusCode": 404,
          "match": { "params": { "id": "missing" } },
          "body": { "code": "AVATAR_NOT_FOUND" }
        }
      ]
    },
    "PUT": {
      "nameResponse": "updated",
      "request": {
        "as": "raw",
        "payload": {
          "type": "file",
          "format": "image/*",
          "minSize": 8,
          "maxSize": 2000000
        },
        "headers": {
          "x-upload-token": { "type": "string", "minLength": 8 }
        },
        "error": { "response": "invalid-upload" }
      },
      "responses": [
        {
          "name": "updated",
          "statusCode": 200,
          "body": {
            "id": "prof_1",
            "avatarUrl": "/api/profiles/prof_1/avatar",
            "updated": true
          }
        },
        {
          "name": "invalid-upload",
          "statusCode": 415,
          "body": {
            "code": "INVALID_AVATAR",
            "message": "Send a raw image body with x-upload-token"
          }
        }
      ]
    }
  }
}
```

| Call | Result |
|------|--------|
| `POST /api/profiles` with valid `FormData` (name, email, role, avatar PNG) | `201` + `avatarUrl` |
| Same + `email=taken@example.com` | `409 EMAIL_TAKEN` (`match.multipart` after `request` passes) |
| Invalid fields / missing avatar / wrong MIME | `422` map under `fields` |
| `POST` with header `x-mock-mode: live` (and valid multipart) | Proxied upstream (`proxy`; no `encoding` on that response) |
| `GET /api/profiles/prof_1` | Public profile JSON |
| `GET /api/profiles/prof_1` + `x-role: admin` | Admin payload with `internalNotes` |
| `GET /api/profiles/prof_1/avatar` | PNG bytes (`encoding: "file"`) |
| `PUT .../avatar` raw `image/png` + `x-upload-token` | `200` updated |
| `PUT .../avatar` with `Content-Type: application/json` | `415` (`as: "raw"` mismatch) |

Frontend sketch:

```js
const form = new FormData();
form.append('name', 'Ada');
form.append('email', 'ada@example.com');
form.append('role', 'member');
form.append('avatar', pngFile);
await fetch('/api/profiles', { method: 'POST', body: form });

const img = await fetch('/api/profiles/prof_1/avatar');
const blob = await img.blob(); // real image bytes for <img>

await fetch('/api/profiles/prof_1/avatar', {
  method: 'PUT',
  headers: {
    'Content-Type': 'image/png',
    'x-upload-token': 'token-ok'
  },
  body: pngFile
});
```

### Example: Ticket attachments (multi-file + download)

**App:** helpdesk UI — create a ticket (JSON + tenant header), upload several screenshots (+ optional PDF) via `FormData`, then download attachment bytes for the inbox preview.

Full sample: [`mocks/45-ticket-attachments.json`](../mocks/45-ticket-attachments.json) (PNG at `assets/sample.png` for `encoding: "file"`).

```json
{
  "api/tickets": {
    "POST": {
      "nameResponse": "created",
      "request": {
        "as": "json",
        "payload": {
          "subject": { "type": "string", "minLength": 5, "maxLength": 120 },
          "channel": { "type": "string", "enum": ["email", "chat", "phone"] },
          "priority?": { "type": "string", "enum": ["low", "normal", "high"] }
        },
        "headers": {
          "x-tenant": { "type": "string", "minLength": 2 }
        },
        "error": { "response": "validation-error", "format": "map", "key": "fields" }
      },
      "responses": [
        {
          "name": "created",
          "statusCode": 201,
          "body": {
            "id": "tkt_1",
            "status": "open",
            "attachmentsUrl": "/api/tickets/tkt_1/attachments"
          }
        },
        {
          "name": "duplicate",
          "statusCode": 409,
          "match": { "body": { "subject": "Duplicate subject" } },
          "body": { "code": "TICKET_DUPLICATE" }
        },
        {
          "name": "validation-error",
          "statusCode": 422,
          "body": { "message": "Ticket validation failed", "fields": {} }
        }
      ]
    }
  },
  "api/tickets/:id/attachments": {
    "POST": {
      "nameResponse": "uploaded",
      "request": {
        "as": "multipart",
        "payload": {
          "note?": { "type": "string", "maxLength": 200 },
          "screenshots": {
            "type": "file",
            "format": "image/*",
            "minItems": 1,
            "maxItems": 3,
            "maxSize": 1500000,
            "requireFilename": true,
            "messages": {
              "minItems": "Attach at least one screenshot",
              "maxItems": "At most 3 screenshots",
              "format": "Screenshots must be images"
            }
          },
          "report?": {
            "type": "file",
            "format": "pdf",
            "maxSize": 5000000,
            "requireFilename": true
          }
        },
        "headers": {
          "x-tenant": { "type": "string", "minLength": 2 }
        },
        "error": { "response": "validation-error", "format": "array" }
      },
      "responses": [
        {
          "name": "uploaded",
          "statusCode": 201,
          "body": {
            "ticketId": "tkt_1",
            "files": [
              { "id": "att_img", "kind": "screenshot", "url": "/api/tickets/tkt_1/attachments/att_img" },
              { "id": "att_pdf", "kind": "report", "url": "/api/tickets/tkt_1/attachments/att_pdf" }
            ]
          }
        },
        {
          "name": "quota",
          "statusCode": 413,
          "match": { "multipart": { "note": "quota" } },
          "body": { "code": "ATTACHMENT_QUOTA" }
        },
        {
          "name": "live",
          "proxy": { "target": "https://jsonplaceholder.typicode.com", "path": "/posts" },
          "match": { "headers": { "x-mock-mode": "live" } }
        },
        {
          "name": "validation-error",
          "statusCode": 422,
          "body": { "message": "Attachment validation failed", "errors": [] }
        }
      ]
    }
  },
  "api/tickets/:id/attachments/:fileId": {
    "GET": {
      "nameResponse": "not-found",
      "responses": [
        {
          "name": "png",
          "statusCode": 200,
          "headers": { "Content-Type": "image/png" },
          "encoding": "file",
          "body": "assets/sample.png",
          "match": { "params": { "fileId": "att_img" } }
        },
        {
          "name": "pdf",
          "statusCode": 200,
          "headers": { "Content-Type": "application/pdf" },
          "encoding": "base64",
          "body": "JVBERi0xLjQK...",
          "match": { "params": { "fileId": "att_pdf" } }
        },
        {
          "name": "not-found",
          "statusCode": 404,
          "body": { "code": "ATTACHMENT_NOT_FOUND" }
        }
      ]
    }
  }
}
```

| Call | Result |
|------|--------|
| `POST /api/tickets` + `x-tenant` | `201` ticket |
| Missing `x-tenant` / short subject | `422` under `fields` |
| `POST .../attachments` with 1–3 screenshots (+ optional PDF) | `201` + download URLs |
| No screenshots | `422` (`minItems`) |
| `note=quota` (valid files) | `413 ATTACHMENT_QUOTA` (`match.multipart`) |
| `GET .../attachments/att_img` | PNG bytes (`encoding: "file"`) |
| `GET .../attachments/att_pdf` | PDF bytes (`encoding: "base64"`) |
| Unknown `fileId` | `404` |

Frontend sketch:

```js
await fetch('/api/tickets', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'x-tenant': 'acme' },
  body: JSON.stringify({ subject: 'Cannot login', channel: 'chat' })
});

const form = new FormData();
form.append('note', 'from ios');
form.append('screenshots', pngFileA);
form.append('screenshots', pngFileB);
form.append('report', pdfFile);
await fetch('/api/tickets/tkt_1/attachments', {
  method: 'POST',
  headers: { 'x-tenant': 'acme' },
  body: form
});

const preview = await fetch('/api/tickets/tkt_1/attachments/att_img');
const blob = await preview.blob();
```

### Example: Expense reports (store + binary)

**App:** employee expense UI — mutable reports in a `store` (create / list / filter / soft-delete / restore), then attach a receipt image via multipart, hit upload rate limits with `match.call`, OCR delay with `match.multipart`, and serve preview bytes with `encoding`.

Full sample: [`mocks/46-expense-reports.json`](../mocks/46-expense-reports.json) (PNG at `assets/sample.png` for `encoding: "file"`).

Highlights from that file:

```json
{
  "api/expenses": {
    "store": {
      "id": "expenses",
      "softDelete": true,
      "unique": {
        "fields": ["reference"],
        "conflict": { "response": "duplicate-reference" }
      },
      "list": {
        "filter": {
          "fields": [
            "status",
            "category",
            { "field": "amount", "op": "gte", "query": "minAmount" }
          ],
          "search": { "query": "q", "fields": ["title", "reference"] }
        }
      }
    },
    "POST": {
      "request": {
        "as": "json",
        "payload": {
          "reference": { "type": "string", "minLength": 3 },
          "title": { "type": "string", "minLength": 3 },
          "category": { "type": "string", "enum": ["travel", "meals", "equipment", "other"] },
          "amount": { "type": "number", "min": 0.01 }
        },
        "headers": { "x-tenant": { "type": "string", "minLength": 2 } },
        "error": { "response": "validation-error", "format": "map", "key": "fields" }
      },
      "responses": [
        { "name": "duplicate-reference", "statusCode": 409, "body": { "code": "DUPLICATE_REFERENCE", "conflicts": "{{conflicts}}" } },
        { "name": "create", "statusCode": 201, "action": "create" },
        { "name": "validation-error", "statusCode": 422, "body": { "message": "Expense validation failed", "fields": {} } }
      ]
    }
  },
  "api/expenses/:id/receipts": {
    "POST": {
      "delay": 40,
      "request": {
        "as": "multipart",
        "payload": {
          "note?": { "type": "string", "maxLength": 200 },
          "receipt": {
            "type": "file",
            "format": "image/*",
            "minItems": 1,
            "maxItems": 1,
            "maxSize": 2000000,
            "requireFilename": true
          }
        },
        "headers": { "x-tenant": { "type": "string", "minLength": 2 } }
      },
      "responses": [
        {
          "name": "rate-limited",
          "statusCode": 429,
          "match": { "call": { "index": 3, "by": { "params": "id" } } },
          "body": { "code": "RECEIPT_RATE_LIMIT" }
        },
        {
          "name": "ocr-processing",
          "statusCode": 202,
          "delay": 100,
          "match": { "multipart": { "note": "ocr" } },
          "body": { "status": "processing" }
        },
        { "name": "uploaded", "statusCode": 201, "body": { "receiptId": "rcpt_1", "status": "stored" } }
      ]
    }
  }
}
```

| Call | Result |
|------|--------|
| `GET /api/expenses` | Paginated list from `store` (`{{items}}` / `{{total}}`) |
| `POST /api/expenses` + `x-tenant` | `201` create; duplicate `reference` → `409` |
| Missing tenant / short fields | `422` map under `fields` |
| `?status=draft&category=travel` | Filtered list |
| `PATCH /api/expenses/:id` | Update status / title / amount |
| `DELETE` then `POST` on `:id` | Soft delete (`204`) + restore (`200`) |
| `POST .../receipts` with image | `201` (method `delay: 40`) |
| Same + `note=ocr` | `202 processing` (`delay: 100`, `match.multipart`) |
| 3rd upload for same `:id` | `429 RECEIPT_RATE_LIMIT` (`match.call` by `params.id`) |
| `GET .../receipts/preview` | PNG bytes (`encoding: "file"`) |
| `?format=base64` | Tiny PNG from `encoding: "base64"` |

Frontend sketch:

```js
const expense = await fetch('/api/expenses', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'x-tenant': 'acme' },
  body: JSON.stringify({
    reference: 'EXP-200',
    title: 'Airport taxi',
    category: 'travel',
    amount: 42.75
  })
}).then((r) => r.json());

const form = new FormData();
form.append('note', 'taxi');
form.append('receipt', pngFile);
await fetch(`/api/expenses/${expense.id}/receipts`, {
  method: 'POST',
  headers: { 'x-tenant': 'acme' },
  body: form
});

const preview = await fetch(`/api/expenses/${expense.id}/receipts/preview`);
const blob = await preview.blob();

await fetch(`/api/expenses/${expense.id}`, { method: 'DELETE' });
await fetch(`/api/expenses/${expense.id}`, { method: 'POST' }); // restore
```

### Example: OAuth2 token (form-urlencoded)

**App:** any client that talks to a real OAuth2 `/oauth/token` (SPA auth code exchange helpers, mobile ROPC in staging, machine-to-machine `client_credentials`, or a BFF). Bodies are **`application/x-www-form-urlencoded`**, not JSON — use `as: "form"` + `match.body` on the same fields the IdP expects.

This is different from [JWT access + refresh](store.md#example-k--real-project-jwt-access--refresh-tokens) (JSON login) and from multipart `FormData` uploads.

Full sample: [`mocks/48-oauth-form-token.json`](../mocks/48-oauth-form-token.json).

```json
{
  "oauth/token": {
    "POST": {
      "nameResponse": "ok",
      "request": {
        "as": "form",
        "payload": {
          "grant_type": {
            "type": "string",
            "enum": ["password", "refresh_token", "client_credentials"]
          },
          "client_id": { "type": "string", "minLength": 3 },
          "client_secret?": { "type": "string", "minLength": 8 },
          "username?": { "type": "string", "minLength": 2 },
          "password?": { "type": "string", "minLength": 4 },
          "refresh_token?": { "type": "string", "minLength": 8 },
          "scope?": { "type": "string", "minLength": 3 }
        },
        "error": {
          "response": "invalid_request",
          "format": "map",
          "key": "errors"
        }
      },
      "responses": [
        {
          "name": "password-ok",
          "statusCode": 200,
          "match": {
            "body": {
              "grant_type": "password",
              "username": "ada",
              "password": "secret"
            }
          },
          "body": {
            "token_type": "Bearer",
            "access_token": "access_ada_ok",
            "refresh_token": "rt_ada_ok",
            "expires_in": 3600
          }
        },
        {
          "name": "password-bad",
          "statusCode": 401,
          "match": { "body": { "grant_type": "password" } },
          "body": {
            "error": "invalid_grant",
            "error_description": "Invalid username or password"
          }
        },
        {
          "name": "refresh-reuse",
          "statusCode": 401,
          "match": {
            "body": {
              "grant_type": "refresh_token",
              "refresh_token": "rt_reused"
            }
          },
          "body": {
            "error": "invalid_grant",
            "error_description": "Refresh token already used"
          }
        },
        {
          "name": "refresh-ok",
          "statusCode": 200,
          "match": { "body": { "grant_type": "refresh_token" } },
          "body": {
            "token_type": "Bearer",
            "access_token": "access_rotated",
            "refresh_token": "rt_rotated",
            "expires_in": 3600
          }
        },
        {
          "name": "client-ok",
          "statusCode": 200,
          "match": {
            "body": {
              "grant_type": "client_credentials",
              "client_id": "svc_payments"
            }
          },
          "body": {
            "token_type": "Bearer",
            "access_token": "access_svc_payments",
            "expires_in": 900
          }
        },
        {
          "name": "ok",
          "statusCode": 200,
          "body": {
            "token_type": "Bearer",
            "access_token": "access_fallback",
            "expires_in": 3600
          }
        },
        {
          "name": "invalid_request",
          "statusCode": 400,
          "body": { "error": "invalid_request", "errors": {} }
        }
      ]
    }
  }
}
```

| Request | Result |
|---------|--------|
| Valid urlencoded `grant_type=password` + `ada` / `secret` | `200` + tokens (`match.body`) |
| Same grant, wrong password | `401 invalid_grant` (broader `match.body` after the specific one) |
| `refresh_token=rt_reused` | `401` reuse detection |
| Other refresh | `200` rotated tokens |
| `client_credentials` + `client_id=svc_payments` | M2M token |
| Bad `grant_type` / missing `client_id` | `400` + `errors` map (`request` before match) |
| JSON body instead of form | `400` (`as: "form"` Content-Type gate) |

Frontend sketch:

```js
const token = await fetch('/oauth/token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({
    grant_type: 'password',
    client_id: 'web_app',
    username: 'ada',
    password: 'secret',
    scope: 'openid profile'
  })
}).then((r) => r.json());

await fetch('/oauth/revoke', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({
    token: token.access_token,
    token_type_hint: 'access_token',
    client_id: 'web_app'
  })
});
```

### Example: Food delivery — simple folder mocks

**App:** a food-delivery frontend that already talks to gateway paths (`/api/auth/...`, `/api/restaurants/...`). Start by mirroring two microservices with `mock.config.json` — no store yet.

```text
mocks/
  mock.config.json
  auth/
    login.json
  restaurants/
    list.json
```

`mocks/mock.config.json`:

```json
{
  "port": 3100,
  "headers": {
    "X-Mock-App": "food-delivery"
  },
  "folders": {
    "auth": {
      "prefix": "/api/auth",
      "delay": 120,
      "headers": { "X-Service": "auth" }
    },
    "restaurants": {
      "prefix": "/api/restaurants",
      "delay": 80,
      "headers": { "X-Service": "restaurants" }
    }
  }
}
```

`mocks/auth/login.json`:

```json
{
  "login": {
    "POST": {
      "nameResponse": "ok",
      "request": {
        "payload": {
          "email": { "type": "string", "format": "email" },
          "password": { "type": "string", "minLength": 6 }
        },
        "error": {
          "response": "invalid"
        }
      },
      "responses": [
        {
          "name": "ok",
          "statusCode": 200,
          "body": { "token": "tok_demo", "userId": "u_1" }
        },
        {
          "name": "invalid",
          "statusCode": 422,
          "body": { "message": "Invalid login", "errors": [] }
        }
      ]
    }
  }
}
```

`mocks/restaurants/list.json`:

```json
{
  "nearby": {
    "GET": {
      "nameResponse": "ok",
      "responses": [
        {
          "name": "ok",
          "statusCode": 200,
          "body": {
            "data": [
              { "id": "r_1", "name": "Pasta Place", "etaMin": 25 },
              { "id": "r_2", "name": "Burger Lab", "etaMin": 35 }
            ]
          }
        },
        {
          "name": "empty-area",
          "statusCode": 200,
          "match": { "query": { "area": "desert" } },
          "body": { "data": [] }
        }
      ]
    }
  }
}
```

| Call | Result |
|------|--------|
| `POST /api/auth/login` (valid) | `200` + token, ~120ms, headers `X-Mock-App` + `X-Service: auth` |
| Invalid login body | `422` from `request` |
| `GET /api/restaurants/nearby` | Restaurant list (~80ms) |
| `GET /api/restaurants/nearby?area=desert` | Empty list via `match.query` |
| `mock-server start` (no `-p`) | Listens on **3100** from config |

### Example: Food delivery — cart + store namespaces

**Next step:** add an orders microservice with a mutable cart. Use `storeNamespace` so `cart` in orders does not collide with a future `cart` in another service.

```text
mocks/
  mock.config.json
  auth/
    login.json
  restaurants/
    list.json
  orders/
    cart.json
```

`mocks/mock.config.json`:

```json
{
  "port": 3100,
  "strictDuplicates": true,
  "headers": { "X-Mock-App": "food-delivery" },
  "folders": {
    "auth": {
      "prefix": "/api/auth",
      "delay": 120
    },
    "restaurants": {
      "prefix": "/api/restaurants",
      "delay": 80
    },
    "orders": {
      "prefix": "/api/orders",
      "delay": 100,
      "headers": { "X-Service": "orders" },
      "storeNamespace": "orders",
      "include": ["cart.json"]
    }
  }
}
```

`mocks/orders/cart.json`:

```json
{
  "cart/items": {
    "store": {
      "id": "cart",
      "key": "id",
      "persist": true,
      "unique": {
        "fields": ["menuItemId"],
        "conflict": { "response": "duplicate" }
      },
      "seed": [
        { "id": 1, "menuItemId": "m_pasta", "qty": 1, "name": "Carbonara" }
      ]
    },
    "GET": {
      "nameResponse": "ok",
      "responses": [
        { "name": "ok", "statusCode": 200, "action": "list", "body": [] }
      ]
    },
    "POST": {
      "nameResponse": "created",
      "request": {
        "payload": {
          "menuItemId": { "type": "string", "minLength": 1 },
          "qty": { "type": "number", "min": 1, "max": 20 },
          "name": { "type": "string", "minLength": 1 }
        },
        "error": {
          "response": "invalid"
        }
      },
      "responses": [
        {
          "name": "created",
          "statusCode": 201,
          "action": "create",
          "body": {}
        },
        {
          "name": "duplicate",
          "statusCode": 409,
          "body": { "code": "ITEM_ALREADY_IN_CART" }
        },
        {
          "name": "invalid",
          "statusCode": 422,
          "body": { "message": "Invalid cart item", "errors": [] }
        }
      ]
    }
  },
  "cart/items/:id": {
    "store": { "id": "cart" },
    "PATCH": {
      "nameResponse": "ok",
      "request": {
        "payload": {
          "qty": { "type": "number", "min": 1, "max": 20 }
        },
        "error": {
          "response": "invalid"
        }
      },
      "responses": [
        { "name": "ok", "statusCode": 200, "action": "patch", "body": {} },
        { "name": "invalid", "statusCode": 422, "body": { "message": "Invalid qty", "errors": [] } }
      ]
    },
    "DELETE": {
      "nameResponse": "ok",
      "responses": [
        { "name": "ok", "statusCode": 200, "action": "delete", "body": { "deleted": true } }
      ]
    }
  }
}
```

With `storeNamespace: "orders"`, the runtime store id is `orders:cart` while JSON still uses `"id": "cart"`.

| Call | Result |
|------|--------|
| `GET /api/orders/cart/items` | Seeded cart lines (store list) |
| `POST` new item | `201` create; survives restart (`persist`) |
| `POST` same `menuItemId` again | `409` unique conflict (`duplicate`) |
| Invalid `qty` | `422` from `request` |
| Duplicate final routes across folders | Blocked by `strictDuplicates` |

### Example: Food delivery — hybrid live payments

**Full flow for the payments UI:** keep auth/restaurants/orders mocked locally; only the payments microservice is partially live. Draft mocks stay on disk but out of the load set.

```text
mocks/
  mock.config.json
  auth/
    login.json
  restaurants/
    list.json
  orders/
    cart.json
  payments/
    intent.json
    intent-draft.json
  payments-v2/
    intent.json
```

`mocks/mock.config.json`:

```json
{
  "port": 3100,
  "strictDuplicates": true,
  "headers": { "X-Mock-App": "food-delivery" },
  "folders": {
    "auth": {
      "prefix": "/api/auth",
      "delay": 120
    },
    "restaurants": {
      "prefix": "/api/restaurants",
      "delay": 80
    },
    "orders": {
      "prefix": "/api/orders",
      "storeNamespace": "orders",
      "include": ["cart.json"]
    },
    "payments": {
      "prefix": "/api/payments",
      "delay": 150,
      "headers": { "X-Service": "payments" },
      "include": ["intent.json"],
      "exclude": ["*-draft.json"],
      "stripPrefix": true,
      "proxyUnmatched": "http://localhost:3005",
      "proxy": "http://localhost:3005"
    },
    "payments-v2": {
      "prefix": "/api/payments",
      "enabled": false
    }
  }
}
```

`mocks/payments/intent.json` — controlled local scenarios, then proxy when you want the real gateway:

```json
{
  "intents": {
    "POST": {
      "nameResponse": "created",
      "delay": 200,
      "request": {
        "payload": {
          "orderId": { "type": "string", "minLength": 1 },
          "amount": { "type": "number", "min": 1 },
          "currency": { "type": "string", "enum": ["USD", "EUR", "MXN"] }
        },
        "error": {
          "response": "invalid"
        }
      },
      "responses": [
        {
          "name": "card-declined",
          "statusCode": 402,
          "match": {
            "body": { "orderId": "ord_declined" }
          },
          "body": { "code": "CARD_DECLINED" }
        },
        {
          "name": "rate-limited",
          "statusCode": 429,
          "match": { "query": { "scenario": "rate_limit" } },
          "headers": { "Retry-After": "3" },
          "body": { "code": "RATE_LIMITED" }
        },
        {
          "name": "live",
          "proxy": true,
          "match": { "query": { "mode": "live" } }
        },
        {
          "name": "created",
          "statusCode": 201,
          "body": {
            "intentId": "pi_mock_1",
            "status": "requires_confirmation"
          }
        },
        {
          "name": "invalid",
          "statusCode": 422,
          "body": { "message": "Invalid payment intent", "errors": [] }
        }
      ]
    }
  }
}
```

| Call | Result |
|------|--------|
| `POST /api/payments/intents` (happy path) | Local `201` mock intent |
| Body `orderId: "ord_declined"` | Local `402 CARD_DECLINED` |
| `?scenario=rate_limit` | Local `429` + `Retry-After` |
| `?mode=live` | Proxied to `http://localhost:3005/intents` (`stripPrefix`) |
| `GET /api/payments/methods` (no mock) | `proxyUnmatched` → `http://localhost:3005/methods` |
| `payments/intent-draft.json` | Ignored (`exclude`) |
| `payments-v2/` | Ignored (`enabled: false`), no clash with `strictDuplicates` |

This is the usual frontend setup while payments is still owned by another team: you own auth/catalog/cart mocks, and only open a pipe to the real payments service when needed.

### Tips for your project

1. Paste the JSON into a mock JSON file in the directory created by `mock-server init` (or the path you pass to `start`).
2. For microservices, prefer folders + `mocks/mock.config.json` (see the food-delivery examples above) instead of one giant flat file.
3. Rename route prefixes (`api/saas/...`, `/api/auth`) to match your frontend base URL.
4. Keep `request` for contract checks and `match` for business branches — they stack, they don’t replace each other.
5. Prefer one JSON file per product area (auth, billing, orgs) so hot reload stays fast while editing.

---

