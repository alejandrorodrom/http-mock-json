# Store recipes

> Part of [Documentation](README.md). Related: [Real-world](real-world.md) · [Examples](examples.md) · [Advanced examples](advanced-examples.md) · [Store reference](../README.md#store-reference).

Product-oriented **store-backed** walkthroughs (Examples C–R) you can copy and adapt. These are recipes, not the field reference.

**Boundary:** use this section when the core of the scenario is a mutable `store` (CRUD, persist, list filters, relations, auth lockout, JWT, billing, …). For multi-feature product demos (multipart uploads, OAuth form grants, folder layouts, hybrid proxy), use [Real-world](real-world.md) instead.

| Need | Doc |
|------|-----|
| Store fields, actions, list modes, filters, relations, soft delete | [Store](../README.md#store-reference) (Examples A–B + reference) |
| Product UI scenarios (auth, RBAC, multipart, folders) | [Real-world projects](real-world.md) |
| `request` / `match` / delay building blocks | [Advanced examples](advanced-examples.md) |
| Multipart / file / encoding rules | [Body compatibility](../README.md#body-compatibility) |
| Folder layouts + `mock.config.json` | [Mock config](../README.md#mock-config-reference) |

Examples **A** (simple notes) and **B** (multi-tenant users) stay in [Store reference](../README.md#example-a--simple-notes-crud) as the minimal reference shapes.

#### Recipe map

| Frontend you are building | Start from | What to steal | Fixture (when available) |
|---------------------------|------------|---------------|--------------------------|
| Todo / notes app | [Example C](#example-c--real-project-todo--notes-app) | Persist + toggle-style `patch` | `mocks/26-store-persist.json` |
| Org projects / board | [Example D](#example-d--real-project-saas-projects-board) | Slug unique + forbidden org `match` | `mocks/29-store-saas.json` |
| Admin catalog + checkout | [Example E](#example-e--real-project-e-commerce-catalog) | Price/stock/`in`/warehouse/`or` + `402`/`429` | [`mocks/32-store-commerce.json`](../mocks/32-store-commerce.json) |
| Support inbox + activity | [Example F](#example-f--real-project-multi-tenant-helpdesk) | Page + cursor + date/channel filters | [`mocks/33-store-helpdesk.json`](../mocks/33-store-helpdesk.json) |
| People directory / HR | [Example G](#example-g--real-project-hr-employee-directory) | All filter ops + nested + combined query | [`mocks/34-store-hr.json`](../mocks/34-store-hr.json) |
| Blog / CMS authors + articles | [Example H](#example-h--real-project-blog-cms-with-authors) | `relations` + soft delete + expand + restrict | `mocks/38-store-relations.json` (related) |
| Multi-tenant orders + line items | [Example I](#example-i--real-project-multi-tenant-orders) | Composite `join` + cascade + tenant routes | — |
| Auth lockout + sessions | [Example J](#example-j--real-project-auth-lockout--sessions) | `match.call` + `request` + `store` + headers | `mocks/40-match-call.json` (related) |
| JWT access + refresh | [Example K](#example-k--real-project-jwt-access--refresh-tokens) | Login / refresh / logout + reuse detection | — |
| Password reset | [Example L](#example-l--real-project-password-reset) | Forgot / validate token / set new password | — |
| Async export job | [Example M](#example-m--real-project-async-export-job) | `202` + poll with `match.call` until ready | — |
| Notifications inbox | [Example N](#example-n--real-project-notifications-inbox) | Unread filter + mark read / mark all | — |
| Signed URL upload | [Example O](#example-o--real-project-signed-url-upload) | Initiate → complete → fetch asset metadata | — |
| Feature flags / config | [Example P](#example-p--real-project-feature-flags--app-config) | Boot flags + tenant overrides | — |
| Billing / subscription | [Example Q](#example-q--real-project-billing--subscription) | Plans, upgrade, trial, past_due | — |
| Onboarding wizard | [Example R](#example-r--real-project-onboarding-wizard) | Multi-step save + resume | — |

More product scenarios (multipart, OAuth form, food-delivery folders, RBAC) live under [Real-world projects](real-world.md).

---

#### Example C — Real project: Todo / notes app

Typical SPA: list, create with validation, toggle done (`patch`), delete. Persist so a browser refresh after server restart still sees data.

Related seed shape: `mocks/26-store-persist.json` (notes CRUD + persist).

```json
{
  "api/todos": {
    "store": {
      "id": "todos",
      "seed": [
        { "id": 1, "title": "Ship landing page", "done": false },
        { "id": 2, "title": "Write README", "done": true }
      ],
      "template": { "id": 0, "title": "", "done": false },
      "unique": {
        "fields": ["title"],
        "conflict": {
          "response": "duplicate-title",
          "detail": { "field": "{{field}}", "value": "{{value}}" }
        }
      },
      "persist": true
    },
    "GET": {
      "nameResponse": "list",
      "responses": [
        { "name": "list", "statusCode": 200, "action": "list" }
      ]
    },
    "POST": {
      "nameResponse": "create",
      "request": {
        "payload": {
          "title": { "type": "string", "minLength": 1, "maxLength": 120 }
        },
        "error": {
          "response": "validation-error"
        }
      },
      "responses": [
        {
          "name": "validation-error",
          "statusCode": 422,
          "body": { "message": "Invalid todo", "errors": [] }
        },
        {
          "name": "duplicate-title",
          "statusCode": 409,
          "body": { "code": "TITLE_TAKEN", "conflicts": "{{conflicts}}" }
        },
        { "name": "create", "statusCode": 201, "action": "create" }
      ]
    }
  },
  "api/todos/:id": {
    "store": { "id": "todos" },
    "PATCH": {
      "nameResponse": "patch",
      "request": {
        "payload": {
          "title?": { "type": "string", "minLength": 1, "maxLength": 120 },
          "done?": { "type": "boolean" }
        },
        "error": {
          "response": "validation-error"
        }
      },
      "responses": [
        {
          "name": "validation-error",
          "statusCode": 422,
          "body": { "message": "Invalid patch", "errors": [] }
        },
        {
          "name": "duplicate-title",
          "statusCode": 409,
          "body": { "code": "TITLE_TAKEN", "conflicts": "{{conflicts}}" }
        },
        { "name": "patch", "statusCode": 200, "action": "patch" }
      ]
    },
    "DELETE": {
      "nameResponse": "remove",
      "responses": [
        { "name": "remove", "statusCode": 204, "action": "delete" }
      ]
    }
  }
}
```

Frontend flow: load board → `POST` new todo → `PATCH` `{ "done": true }` → `DELETE` when archived. Snapshot: `.store/todos.json` under the mock files root.

#### Example D — Real project: SaaS projects board

Org-scoped projects with slug uniqueness, forbidden org via `match`, persist across restarts. Pattern used by project-management / B2B dashboards.

Related org board: `mocks/29-store-saas.json` (projects + nested tasks).

```json
{
  "api/orgs/:orgId/projects": {
    "store": {
      "id": "projects",
      "key": {
        "fields": ["orgId", "id"],
        "conflict": { "response": "duplicate-key" }
      },
      "seed": [
        {
          "orgId": "org_acme",
          "id": 1,
          "name": "Website Redesign",
          "slug": "website",
          "status": "active",
          "ownerEmail": "lead@acme.com"
        }
      ],
      "template": {
        "orgId": "",
        "id": 0,
        "name": "",
        "slug": "",
        "status": "active",
        "ownerEmail": ""
      },
      "unique": {
        "fields": [
          {
            "field": "slug",
            "conflict": {
              "response": "slug-taken",
              "detail": { "field": "{{field}}", "value": "{{value}}" }
            }
          }
        ],
        "conflict": {
          "response": "duplicate-fields",
          "detail": { "campo": "{{field}}", "valor": "{{value}}" }
        }
      },
      "persist": true
    },
    "GET": {
      "nameResponse": "list",
      "responses": [
        {
          "name": "forbidden-org",
          "statusCode": 403,
          "match": { "params": { "orgId": "org_blocked" } },
          "body": { "code": "ORG_FORBIDDEN", "message": "You cannot access this organization" }
        },
        { "name": "list", "statusCode": 200, "action": "list" }
      ]
    },
    "POST": {
      "nameResponse": "create",
      "request": {
        "payload": {
          "name": { "type": "string", "minLength": 3, "maxLength": 80 },
          "slug": {
            "type": "string",
            "minLength": 2,
            "maxLength": 40,
            "pattern": "^[a-z0-9]+(?:-[a-z0-9]+)*$"
          },
          "ownerEmail": { "type": "string", "format": "email" },
          "status?": { "type": "string", "enum": ["active", "paused"] }
        },
        "error": {
          "response": "validation-error"
        }
      },
      "responses": [
        {
          "name": "forbidden-org",
          "statusCode": 403,
          "match": { "params": { "orgId": "org_blocked" } },
          "body": { "code": "ORG_FORBIDDEN" }
        },
        {
          "name": "validation-error",
          "statusCode": 422,
          "body": { "message": "Invalid project", "errors": [] }
        },
        {
          "name": "slug-taken",
          "statusCode": 409,
          "body": { "code": "SLUG_TAKEN", "conflicts": "{{conflicts}}" }
        },
        {
          "name": "duplicate-fields",
          "statusCode": 409,
          "body": { "code": "DUPLICATE", "errores": "{{conflicts}}" }
        },
        {
          "name": "duplicate-key",
          "statusCode": 409,
          "body": { "code": "DUPLICATE_KEY" }
        },
        { "name": "create", "statusCode": 201, "action": "create" }
      ]
    }
  },
  "api/orgs/:orgId/projects/:id": {
    "store": { "id": "projects" },
    "GET": {
      "nameResponse": "get",
      "responses": [
        { "name": "get", "statusCode": 200, "action": "get" }
      ]
    },
    "PATCH": {
      "nameResponse": "patch",
      "responses": [
        {
          "name": "slug-taken",
          "statusCode": 409,
          "body": { "code": "SLUG_TAKEN", "conflicts": "{{conflicts}}" }
        },
        {
          "name": "duplicate-fields",
          "statusCode": 409,
          "body": { "code": "DUPLICATE", "errores": "{{conflicts}}" }
        },
        {
          "name": "duplicate-key",
          "statusCode": 409,
          "body": { "code": "DUPLICATE_KEY" }
        },
        { "name": "patch", "statusCode": 200, "action": "patch" }
      ]
    },
    "DELETE": {
      "nameResponse": "remove",
      "responses": [
        { "name": "remove", "statusCode": 204, "action": "delete" }
      ]
    }
  }
}
```

- `GET /api/orgs/org_acme/projects` → store `list` filtered by `orgId`  
- `GET /api/orgs/org_blocked/projects` → static `403` via `match` (no store)  
- Duplicate `slug` alone → `slug-taken`; other unique clashes → `duplicate-fields`

#### Example E — Real project: E-commerce catalog

Admin catalog + checkout resilience: `store` + `store.list` (page, multi-sort, **advanced filters**, search, `Link`) + `request` + `unique` SKU + `persist` + `match` (featured / maintenance / archive) + `delay` + custom headers.

Filter permutation focus: `eq` / `ne` / `gt` / `lt` / `gte` / `lte` / `in` + nested `warehouse.code` + `or` (warehouse **or** category) + search.

Full runnable mock (same routes/filters as this recipe):

**See [`mocks/32-store-commerce.json`](../mocks/32-store-commerce.json)** — Catalog list/filters + checkout status branches.

Copy that file into your mock directory (or point `mock-server start` at `mocks/`) and adapt field names to your UI.

Field/actions reference: [Store](../README.md#store-reference).

Try:

```bash
# Paginated catalog (Link + X-Total-Count)
curl -si 'http://localhost:3000/api/catalog/products?page=1&pageSize=3'

# Filters + search + multi-sort
curl -s 'http://localhost:3000/api/catalog/products?status=active&category=home&q=mug&sort=price:desc,name:asc'

# Range + ne + in + nested warehouse
curl -s 'http://localhost:3000/api/catalog/products?minPrice=12&maxPrice=22&excludeStatus=draft&pageSize=10'
curl -s 'http://localhost:3000/api/catalog/products?minStock=0&categories=home,grocery&pageSize=10'
curl -s 'http://localhost:3000/api/catalog/products?warehouse=WH-EU&status=active&pageSize=10'

# OR: warehouse OR category
curl -s 'http://localhost:3000/api/catalog/products?anyWarehouse=WH-LATAM&anyCategory=grocery&pageSize=10'

# Static branches via match
curl -si 'http://localhost:3000/api/catalog/products?view=featured'
curl -si 'http://localhost:3000/api/catalog/products?mode=maintenance'

# Create (422 invalid / 409 SKU / 201 ok)
curl -s -X POST http://localhost:3000/api/catalog/products \
  -H 'Content-Type: application/json' \
  -d '{"sku":"SKU-NEW-099","name":"Matcha Kit","category":"beverages","price":15,"status":"active"}'

# Checkout resilience
curl -si -X POST http://localhost:3000/api/catalog/checkout \
  -H 'Content-Type: application/json' \
  -d '{"sku":"SKU-TEA-001","quantity":1,"cardLast4":"0000"}'
```

| Feature | Where it shows up |
|---------|-------------------|
| `store` + `action` | CRUD on `/api/catalog/products` |
| `store.list` | Page envelope, multi-sort, `{{linkHeader}}` |
| Filter ops | `gte`/`lte` price, `gt`/`lt` stock, `ne`, `in` categories, nested `warehouse.code` |
| `or` | `anyWarehouse` **or** `anyCategory` |
| `search` | `q` over name / sku / warehouse code |
| `request` | POST/PATCH product + checkout body rules |
| `unique` | Duplicate `sku` → `409 SKU_TAKEN` |
| `persist` | Catalog survives restart (`--reset-store` to wipe) |
| `match` + `delay` | Featured view, maintenance `503`, archive guard, checkout `402`/`429` |

#### Example F — Real project: Multi-tenant helpdesk

Tenant-scoped tickets (page list) + activity feed (cursor): composite keys, `store.list`, **advanced filters**, `request`, `unique`, `persist`, `match` (`403` / `401`), `delay`.

Filter permutation focus: date range on `createdAt`, nested `channel.source` / `channel.sla`, `ne` / `in`, `or` (assignee **or** priority), search.

Full runnable mock (same routes/filters as this recipe):

**See [`mocks/33-store-helpdesk.json`](../mocks/33-store-helpdesk.json)** — Tenant tickets (page) + activity (cursor) + channel/date filters.

Copy that file into your mock directory (or point `mock-server start` at `mocks/`) and adapt field names to your UI.

Field/actions reference: [Store](../README.md#store-reference).

Try:

```bash
# Tenant isolation (path key fields filter the store)
curl -s 'http://localhost:3000/api/tenants/acme/tickets?status=open&priority=high'
curl -s 'http://localhost:3000/api/tenants/globex/tickets'

# Date range + ne + nested channel + in + sla
curl -s 'http://localhost:3000/api/tenants/acme/tickets?since=1700000002&until=1700000004&excludeStatus=closed&pageSize=10'
curl -s 'http://localhost:3000/api/tenants/acme/tickets?channel=email&priorities=high,low&pageSize=10'
curl -s 'http://localhost:3000/api/tenants/acme/tickets?maxSla=5&pageSize=10'

# OR: assignee OR priority
curl -s 'http://localhost:3000/api/tenants/acme/tickets?anyAssignee=carol@acme.com&anyPriority=high&pageSize=10'

# Auth / RBAC-style static branches
curl -si 'http://localhost:3000/api/tenants/blocked/tickets'
curl -si 'http://localhost:3000/api/tenants/acme/tickets?auth=missing'

# Create + conflict
curl -s -X POST http://localhost:3000/api/tenants/acme/tickets \
  -H 'Content-Type: application/json' \
  -d '{"subject":"Billing dispute","priority":"medium","assignee":"finance@acme.com"}'

# Cursor activity feed (Stripe-style)
PAGE1=$(curl -s 'http://localhost:3000/api/tenants/acme/activity')
echo "$PAGE1"
CURSOR=$(echo "$PAGE1" | node -e "let s='';process.stdin.on('data',d=>s+=d);process.stdin.on('end',()=>console.log(JSON.parse(s).next_cursor||''))")
curl -s "http://localhost:3000/api/tenants/acme/activity?starting_after=${CURSOR}"
```

| Feature | Where it shows up |
|---------|-------------------|
| Composite `key` | `tenantId` + `id` scopes tickets/activity per tenant |
| `store.list` page | Inbox with `Link`, default `-createdAt` |
| Filter ops | `since`/`until`, `ne`, `in` priorities, nested `channel.*`, `maxSla` |
| `or` | `anyAssignee` **or** `anyPriority` |
| `store.list` cursor | Activity feed with `starting_after` + `{{nextCursor}}` |
| `request` | Ticket/activity payload validation → `422` |
| `match` | `blocked` tenant → `403`; `auth=missing` → `401` |
| `unique` + `persist` | Duplicate subject → `409`; data survives restart |

#### Example G — Real project: HR employee directory

Org-scoped people directory built to **permute every filter op** in a realistic admin UI: salary bands, level ranges, hire window, role `in`, nested `profile.*`, `or` (dept / city / role), search, plus `request` / `unique` / `match` / `persist`.

Full runnable mock (same routes/filters as this recipe):

**See [`mocks/34-store-hr.json`](../mocks/34-store-hr.json)** — Employee directory with full filter op set + nested + or + search.

Copy that file into your mock directory (or point `mock-server start` at `mocks/`) and adapt field names to your UI.

Field/actions reference: [Store](../README.md#store-reference).

Try (filter permutations):

```bash
# eq + ne
curl -s 'http://localhost:3000/api/orgs/acme/employees?role=engineer&excludeStatus=terminated&pageSize=20'

# salary band (gte/lte) + status
curl -s 'http://localhost:3000/api/orgs/acme/employees?minSalary=60000&maxSalary=85000&status=active&pageSize=20'

# nested level gt/lt + dept
curl -s 'http://localhost:3000/api/orgs/acme/employees?minLevel=2&maxLevel=5&dept=platform&pageSize=20'

# in roles + nested city
curl -s 'http://localhost:3000/api/orgs/acme/employees?roles=designer,manager&city=Barcelona&pageSize=20'

# hire window
curl -s 'http://localhost:3000/api/orgs/acme/employees?hiredAfter=1600000000&hiredBefore=1650000000&pageSize=20'

# OR: dept OR city OR role
curl -s 'http://localhost:3000/api/orgs/acme/employees?anyDept=people&anyCity=Berlin&anyRole=support&pageSize=20'

# search + combined admin query
curl -s 'http://localhost:3000/api/orgs/acme/employees?q=madrid&pageSize=20'
curl -s 'http://localhost:3000/api/orgs/acme/employees?status=active&minSalary=50000&roles=engineer,designer&q=a&sort=salary:desc&pageSize=20'

# 400 on bad numeric filter
curl -si 'http://localhost:3000/api/orgs/acme/employees?minSalary=abc'
```

| Op / feature | Query in this example |
|--------------|------------------------|
| `eq` | `status`, `role`, `dept`, `city` |
| `ne` | `excludeStatus` |
| `gte` / `lte` | `minSalary` / `maxSalary`, `hiredAfter` / `hiredBefore` |
| `gt` / `lt` | `minLevel` / `maxLevel` on `profile.level` |
| `in` | `roles=engineer,designer` |
| Nested | `profile.dept`, `profile.city`, `profile.level` |
| `or` | `anyDept` / `anyCity` / `anyRole` |
| `search` | `q` on name, email, city, dept |

#### Example H — Real project: Blog CMS with authors

Editorial UI: authors own articles, FK validation on write, `?expand=author` / `?expand=articles.author`, soft-delete + restore trash, paginated/filtered article list, `request` on create, `unique` slug, `persist`, and `onDelete: restrict` so you cannot delete an author who still has articles.

Related relations matrix: `mocks/38-store-relations.json` (users/posts/comments). Soft delete basics: `mocks/37-store-soft-delete.json`.

```json
{
  "api/authors": {
    "store": {
      "id": "blog-authors",
      "key": "id",
      "softDelete": true,
      "seed": [
        { "id": 1, "name": "Ada Lovelace", "handle": "ada" },
        { "id": 2, "name": "Grace Hopper", "handle": "grace" }
      ],
      "template": { "id": 0, "name": "", "handle": "" },
      "unique": {
        "fields": [
          {
            "field": "handle",
            "conflict": { "response": "duplicate-handle" }
          }
        ]
      },
      "relations": {
        "articles": {
          "type": "many",
          "store": "blog-articles",
          "join": { "from": "authorId" },
          "embed": { "as": "articles" }
        }
      },
      "persist": true,
      "list": {
        "page": { "query": "page", "default": 1 },
        "pageSize": { "default": 10, "max": 50 },
        "sort": { "fields": ["name", "id"], "default": "name:asc" },
        "filter": {
          "fields": [
            { "field": "handle", "query": "handle", "op": "eq" }
          ],
          "search": { "query": "q", "fields": ["name", "handle"] }
        }
      }
    },
    "GET": {
      "nameResponse": "list",
      "responses": [
        { "name": "list", "statusCode": 200, "action": "list" }
      ]
    },
    "POST": {
      "nameResponse": "create",
      "request": {
        "payload": {
          "name": { "type": "string", "minLength": 1, "maxLength": 80 },
          "handle": { "type": "string", "minLength": 2, "maxLength": 40, "pattern": "^[a-z0-9-]+$" }
        },
        "error": {
          "response": "validation-error"
        }
      },
      "responses": [
        { "name": "create", "statusCode": 201, "action": "create" },
        {
          "name": "duplicate-handle",
          "statusCode": 409,
          "body": { "code": "HANDLE_TAKEN", "field": "{{field}}", "value": "{{value}}" }
        },
        {
          "name": "validation-error",
          "statusCode": 422,
          "body": { "message": "Invalid author", "errors": [] }
        }
      ]
    }
  },
  "api/authors/:id": {
    "store": { "id": "blog-authors" },
    "GET": {
      "nameResponse": "get",
      "responses": [
        { "name": "get", "statusCode": 200, "action": "get" }
      ]
    },
    "DELETE": {
      "nameResponse": "remove",
      "responses": [
        {
          "name": "has-articles",
          "statusCode": 409,
          "body": {
            "code": "HAS_ARTICLES",
            "conflicts": "{{conflicts}}"
          }
        },
        { "name": "remove", "statusCode": 204, "action": "delete" }
      ]
    },
    "POST": {
      "nameResponse": "restore",
      "responses": [
        {
          "name": "duplicate-handle",
          "statusCode": 409,
          "body": { "code": "HANDLE_TAKEN", "field": "{{field}}", "value": "{{value}}" }
        },
        { "name": "restore", "statusCode": 200, "action": "restore" }
      ]
    }
  },
  "api/articles": {
    "store": {
      "id": "blog-articles",
      "key": "id",
      "softDelete": true,
      "seed": [
        {
          "id": 1,
          "title": "Analytical Engine notes",
          "slug": "analytical-engine",
          "status": "published",
          "authorId": 1
        },
        {
          "id": 2,
          "title": "Bug in the relay",
          "slug": "relay-bug",
          "status": "draft",
          "authorId": 2
        }
      ],
      "template": {
        "id": 0,
        "title": "",
        "slug": "",
        "status": "draft",
        "authorId": 0
      },
      "unique": {
        "fields": [
          {
            "field": "slug",
            "conflict": { "response": "duplicate-slug" }
          }
        ]
      },
      "relations": {
        "authorId": {
          "store": "blog-authors",
          "join": { "from": "authorId", "to": "id" },
          "required": true,
          "onDelete": {
            "action": "restrict",
            "conflict": { "response": "has-articles" }
          },
          "embed": { "as": "author" },
          "conflict": {
            "response": "invalid-author",
            "detail": {
              "code": "INVALID_AUTHOR",
              "field": "{{field}}",
              "value": "{{value}}"
            }
          }
        }
      },
      "persist": true,
      "list": {
        "page": { "query": "page", "default": 1 },
        "pageSize": { "default": 10, "max": 50 },
        "sort": {
          "fields": ["title", "status", "id"],
          "default": "id:desc"
        },
        "filter": {
          "fields": [
            { "field": "status", "query": "status", "op": "eq" },
            { "field": "authorId", "query": "authorId", "op": "eq" },
            {
              "field": "status",
              "query": "excludeStatus",
              "op": "ne"
            }
          ],
          "search": { "query": "q", "fields": ["title", "slug"] }
        }
      }
    },
    "GET": {
      "nameResponse": "list",
      "responses": [
        { "name": "list", "statusCode": 200, "action": "list" }
      ]
    },
    "POST": {
      "nameResponse": "create",
      "request": {
        "payload": {
          "title": { "type": "string", "minLength": 1, "maxLength": 160 },
          "slug": { "type": "string", "minLength": 2, "maxLength": 80, "pattern": "^[a-z0-9-]+$" },
          "status?": { "type": "string", "enum": ["draft", "published"] },
          "authorId": { "type": "number", "min": 1 }
        },
        "error": {
          "response": "validation-error"
        }
      },
      "responses": [
        { "name": "create", "statusCode": 201, "action": "create" },
        {
          "name": "duplicate-slug",
          "statusCode": 409,
          "body": { "code": "SLUG_TAKEN", "field": "{{field}}", "value": "{{value}}" }
        },
        {
          "name": "invalid-author",
          "statusCode": 422,
          "body": {
            "code": "INVALID_AUTHOR",
            "field": "{{field}}",
            "value": "{{value}}"
          }
        },
        {
          "name": "validation-error",
          "statusCode": 422,
          "body": { "message": "Invalid article", "errors": [] }
        }
      ]
    }
  },
  "api/articles/:id": {
    "store": { "id": "blog-articles" },
    "GET": {
      "nameResponse": "get",
      "responses": [
        { "name": "get", "statusCode": 200, "action": "get" }
      ]
    },
    "PATCH": {
      "nameResponse": "patch",
      "request": {
        "payload": {
          "title?": { "type": "string", "minLength": 1, "maxLength": 160 },
          "status?": { "type": "string", "enum": ["draft", "published"] },
          "authorId?": { "type": "number", "min": 1 }
        },
        "error": {
          "response": "validation-error"
        }
      },
      "responses": [
        { "name": "patch", "statusCode": 200, "action": "patch" },
        {
          "name": "duplicate-slug",
          "statusCode": 409,
          "body": { "code": "SLUG_TAKEN", "field": "{{field}}", "value": "{{value}}" }
        },
        {
          "name": "invalid-author",
          "statusCode": 422,
          "body": {
            "code": "INVALID_AUTHOR",
            "field": "{{field}}",
            "value": "{{value}}"
          }
        },
        {
          "name": "validation-error",
          "statusCode": 422,
          "body": { "message": "Invalid article", "errors": [] }
        }
      ]
    },
    "DELETE": {
      "nameResponse": "remove",
      "responses": [
        { "name": "remove", "statusCode": 204, "action": "delete" }
      ]
    },
    "POST": {
      "nameResponse": "restore",
      "responses": [
        {
          "name": "duplicate-slug",
          "statusCode": 409,
          "body": { "code": "SLUG_TAKEN", "field": "{{field}}", "value": "{{value}}" }
        },
        {
          "name": "invalid-author",
          "statusCode": 422,
          "body": {
            "code": "INVALID_AUTHOR",
            "field": "{{field}}",
            "value": "{{value}}"
          }
        },
        { "name": "restore", "statusCode": 200, "action": "restore" }
      ]
    }
  }
}
```

Try:

```bash
# Invalid FK
curl -si -X POST http://localhost:3000/api/articles \
  -H 'Content-Type: application/json' \
  -d '{"title":"Ghost","slug":"ghost","authorId":999}'

# Expand one + list filters
curl -s 'http://localhost:3000/api/articles/1?expand=author'
curl -s 'http://localhost:3000/api/articles?status=published&q=engine&pageSize=10'

# Expand many + nested
curl -s 'http://localhost:3000/api/authors/1?expand=articles.author'

# Restrict delete while articles remain
curl -si -X DELETE http://localhost:3000/api/authors/1

# Soft-delete article, then delete author, then restore article from trash
curl -s -X DELETE http://localhost:3000/api/articles/1 -o /dev/null -w '%{http_code}\n'
curl -s -X DELETE http://localhost:3000/api/articles/2 -o /dev/null -w '%{http_code}\n'
curl -si -X DELETE http://localhost:3000/api/authors/2
curl -s -X POST http://localhost:3000/api/articles/2
curl -s 'http://localhost:3000/api/articles?includeDeleted=true'
```

| Feature | How this example uses it |
|---------|--------------------------|
| `relations` `one` / `many` | Articles → authors; authors embed `articles` |
| `join` / `embed` / `expand` | `authorId` ↔ `id`; nested `articles.author` |
| `onDelete` restrict | Author DELETE → `409` `HAS_ARTICLES` |
| `softDelete` + `restore` | Trash for authors and articles; soft-deleted children do not block restrict |
| `store.list` | Page + status/`authorId`/`ne` + search `q` |
| `request` + `unique` + `persist` | Payload rules, slug/handle conflicts, survive restart |

#### Example I — Real project: Multi-tenant orders

Checkout / order admin: tenant-scoped orders with composite keys, line items that join on `(tenantId, orderId)`, `onDelete: cascade` when an order is removed, list + filters, `request` validation, and `?expand=order` on items.

```json
{
  "api/:tenantId/orders": {
    "store": {
      "id": "shop-orders",
      "key": {
        "fields": ["tenantId", "id"],
        "conflict": { "response": "duplicate-key" }
      },
      "seed": [
        {
          "tenantId": "acme",
          "id": 1,
          "status": "paid",
          "total": 42.5
        },
        {
          "tenantId": "acme",
          "id": 2,
          "status": "pending",
          "total": 10
        }
      ],
      "template": {
        "tenantId": "",
        "id": 0,
        "status": "pending",
        "total": 0
      },
      "relations": {
        "items": {
          "type": "many",
          "store": "shop-order-items",
          "join": { "from": ["tenantId", "orderId"] },
          "embed": { "as": "items" }
        }
      },
      "persist": true,
      "list": {
        "page": { "query": "page", "default": 1 },
        "pageSize": { "default": 10, "max": 50 },
        "sort": { "fields": ["id", "status", "total"], "default": "id:desc" },
        "filter": {
          "fields": [
            { "field": "status", "query": "status", "op": "eq" },
            { "field": "total", "query": "minTotal", "op": "gte" },
            { "field": "total", "query": "maxTotal", "op": "lte" }
          ]
        }
      }
    },
    "GET": {
      "nameResponse": "list",
      "responses": [
        { "name": "list", "statusCode": 200, "action": "list" }
      ]
    },
    "POST": {
      "nameResponse": "create",
      "request": {
        "payload": {
          "status?": { "type": "string", "enum": ["pending", "paid", "cancelled"] },
          "total": { "type": "number", "min": 0 }
        },
        "error": {
          "response": "validation-error"
        }
      },
      "responses": [
        { "name": "create", "statusCode": 201, "action": "create" },
        {
          "name": "duplicate-key",
          "statusCode": 409,
          "body": { "code": "DUPLICATE_ORDER", "fields": "{{fields}}" }
        },
        {
          "name": "validation-error",
          "statusCode": 422,
          "body": { "message": "Invalid order", "errors": [] }
        }
      ]
    }
  },
  "api/:tenantId/orders/:id": {
    "store": { "id": "shop-orders" },
    "GET": {
      "nameResponse": "get",
      "responses": [
        { "name": "get", "statusCode": 200, "action": "get" }
      ]
    },
    "PATCH": {
      "nameResponse": "patch",
      "request": {
        "payload": {
          "status?": { "type": "string", "enum": ["pending", "paid", "cancelled"] },
          "total?": { "type": "number", "min": 0 }
        },
        "error": {
          "response": "validation-error"
        }
      },
      "responses": [
        { "name": "patch", "statusCode": 200, "action": "patch" },
        {
          "name": "duplicate-key",
          "statusCode": 409,
          "body": { "code": "DUPLICATE_ORDER", "fields": "{{fields}}" }
        },
        {
          "name": "validation-error",
          "statusCode": 422,
          "body": { "message": "Invalid order", "errors": [] }
        }
      ]
    },
    "DELETE": {
      "nameResponse": "remove",
      "responses": [
        { "name": "remove", "statusCode": 204, "action": "delete" }
      ]
    }
  },
  "api/:tenantId/order-items": {
    "store": {
      "id": "shop-order-items",
      "key": {
        "fields": ["tenantId", "id"],
        "conflict": { "response": "duplicate-key" }
      },
      "seed": [
        {
          "tenantId": "acme",
          "id": 1,
          "orderId": 1,
          "sku": "SKU-TEA",
          "qty": 2,
          "price": 12.5
        },
        {
          "tenantId": "acme",
          "id": 2,
          "orderId": 1,
          "sku": "SKU-MUG",
          "qty": 1,
          "price": 17.5
        },
        {
          "tenantId": "acme",
          "id": 3,
          "orderId": 2,
          "sku": "SKU-TEA",
          "qty": 1,
          "price": 10
        }
      ],
      "template": {
        "tenantId": "",
        "id": 0,
        "orderId": 0,
        "sku": "",
        "qty": 1,
        "price": 0
      },
      "relations": {
        "orderRef": {
          "store": "shop-orders",
          "join": {
            "from": ["tenantId", "orderId"],
            "to": ["tenantId", "id"]
          },
          "required": true,
          "onDelete": "cascade",
          "embed": { "as": "order" },
          "conflict": {
            "response": "invalid-order",
            "detail": {
              "code": "INVALID_ORDER",
              "field": "{{field}}",
              "value": "{{value}}",
              "fields": "{{fields}}"
            }
          }
        }
      },
      "persist": true,
      "list": {
        "page": { "query": "page", "default": 1 },
        "pageSize": { "default": 20, "max": 100 },
        "sort": { "fields": ["id", "sku", "qty"], "default": "id:asc" },
        "filter": {
          "fields": [
            { "field": "orderId", "query": "orderId", "op": "eq" },
            { "field": "sku", "query": "sku", "op": "eq" },
            { "field": "qty", "query": "minQty", "op": "gte" }
          ],
          "search": { "query": "q", "fields": ["sku"] }
        }
      }
    },
    "GET": {
      "nameResponse": "list",
      "responses": [
        { "name": "list", "statusCode": 200, "action": "list" }
      ]
    },
    "POST": {
      "nameResponse": "create",
      "request": {
        "payload": {
          "orderId": { "type": "number", "min": 1 },
          "sku": { "type": "string", "minLength": 1, "maxLength": 40 },
          "qty": { "type": "number", "min": 1 },
          "price": { "type": "number", "min": 0 }
        },
        "error": {
          "response": "validation-error"
        }
      },
      "responses": [
        { "name": "create", "statusCode": 201, "action": "create" },
        {
          "name": "duplicate-key",
          "statusCode": 409,
          "body": { "code": "DUPLICATE_ITEM", "fields": "{{fields}}" }
        },
        {
          "name": "invalid-order",
          "statusCode": 422,
          "body": {
            "code": "INVALID_ORDER",
            "field": "{{field}}",
            "value": "{{value}}"
          }
        },
        {
          "name": "validation-error",
          "statusCode": 422,
          "body": { "message": "Invalid line item", "errors": [] }
        }
      ]
    }
  },
  "api/:tenantId/order-items/:id": {
    "store": { "id": "shop-order-items" },
    "GET": {
      "nameResponse": "get",
      "responses": [
        { "name": "get", "statusCode": 200, "action": "get" }
      ]
    },
    "DELETE": {
      "nameResponse": "remove",
      "responses": [
        { "name": "remove", "statusCode": 204, "action": "delete" }
      ]
    }
  }
}
```

Try:

```bash
# List orders + expand line items
curl -s 'http://localhost:3000/api/acme/orders?status=paid'
curl -s 'http://localhost:3000/api/acme/orders/1?expand=items'

# Line items for an order + expand parent (composite join)
curl -s 'http://localhost:3000/api/acme/order-items?orderId=1'
curl -s 'http://localhost:3000/api/acme/order-items/1?expand=order'

# Invalid FK (order 999 does not exist for tenant)
curl -si -X POST http://localhost:3000/api/acme/order-items \
  -H 'Content-Type: application/json' \
  -d '{"orderId":999,"sku":"SKU-X","qty":1,"price":5}'

# Cascade: deleting order 1 removes its items
curl -s -X DELETE http://localhost:3000/api/acme/orders/1 -o /dev/null -w '%{http_code}\n'
curl -s 'http://localhost:3000/api/acme/order-items?orderId=1'
```

| Feature | How this example uses it |
|---------|--------------------------|
| Composite `key` | Orders and items keyed by `(tenantId, id)` |
| Composite `join` | `from: [tenantId, orderId]` → `to: [tenantId, id]` |
| `type: "many"` | Order embeds `items` |
| `onDelete: "cascade"` | Delete order → dependents removed |
| `store.list` + `request` + `persist` | `orderId`/status/total filters, payload rules, survive restart |

#### Example J — Real project: Auth lockout + sessions

Login UI with **per-email** failed-attempt counters (`match.call.by`), lockout headers, validation (`request`), latency, and a **sessions** store after a successful sign-in (`call.reset` clears that user’s counter).

Related `match.call` matrix: `mocks/40-match-call.json`.

Combines: `match.call` (`index` / `by` / `reset`) + `match.body` + `request` + `delay` + custom headers + `store` (`create` / `list` / `delete`) + `persist`.

```json
{
  "api/v1/auth/login": {
    "POST": {
      "nameResponse": "locked",
      "delay": 80,
      "request": {
        "payload": {
          "email": { "type": "string", "format": "email" },
          "password": { "type": "string", "minLength": 8, "maxLength": 72 }
        },
        "error": {
          "response": "validation-error"
        }
      },
      "responses": [
        {
          "name": "attempt-1",
          "statusCode": 401,
          "delay": 150,
          "match": {
            "call": { "index": 1, "by": { "body": "email" } },
            "body": { "password": "wrong-password" }
          },
          "body": {
            "code": "INVALID_CREDENTIALS",
            "attemptsLeft": 2
          }
        },
        {
          "name": "attempt-2",
          "statusCode": 401,
          "match": {
            "call": { "index": 2, "by": { "body": "email" } },
            "body": { "password": "wrong-password" }
          },
          "headers": { "X-Auth-Warning": "last-attempt" },
          "body": {
            "code": "INVALID_CREDENTIALS",
            "attemptsLeft": 1
          }
        },
        {
          "name": "ok",
          "statusCode": 200,
          "delay": 120,
          "match": {
            "call": { "reset": true, "by": { "body": "email" } },
            "body": { "password": "CorrectHorse1" }
          },
          "headers": { "X-Auth": "session" },
          "body": {
            "token": "jwt-demo",
            "user": { "id": 1, "email": "demo@acme.com" }
          }
        },
        {
          "name": "locked",
          "statusCode": 423,
          "headers": { "Retry-After": "60" },
          "body": {
            "code": "ACCOUNT_LOCKED",
            "retryAfterSec": 60
          }
        },
        {
          "name": "validation-error",
          "statusCode": 422,
          "body": { "message": "Invalid login payload", "errors": [] }
        }
      ]
    }
  },
  "api/v1/auth/sessions": {
    "store": {
      "id": "auth-sessions",
      "seed": [
        {
          "id": 1,
          "userId": 1,
          "email": "demo@acme.com",
          "device": "Chrome / macOS",
          "createdAt": "2026-07-01T10:00:00.000Z"
        }
      ],
      "template": {
        "id": 0,
        "userId": 0,
        "email": "",
        "device": "Unknown",
        "createdAt": ""
      },
      "list": true,
      "persist": true,
      "notFound": { "response": "missing" }
    },
    "GET": {
      "nameResponse": "list",
      "responses": [
        {
          "name": "list",
          "statusCode": 200,
          "action": "list",
          "body": {
            "items": "{{items}}",
            "total": "{{total}}"
          }
        }
      ]
    },
    "POST": {
      "nameResponse": "create",
      "request": {
        "payload": {
          "userId": { "type": "number", "min": 1 },
          "email": { "type": "string", "format": "email" },
          "device": { "type": "string", "minLength": 1, "maxLength": 80 }
        },
        "error": {
          "response": "validation-error"
        }
      },
      "responses": [
        {
          "name": "validation-error",
          "statusCode": 422,
          "body": { "message": "Invalid session", "errors": [] }
        },
        { "name": "create", "statusCode": 201, "action": "create" }
      ]
    }
  },
  "api/v1/auth/sessions/:id": {
    "store": { "id": "auth-sessions" },
    "DELETE": {
      "nameResponse": "remove",
      "responses": [
        { "name": "remove", "statusCode": 204, "action": "delete" },
        {
          "name": "missing",
          "statusCode": 404,
          "body": { "code": "SESSION_NOT_FOUND", "key": "{{key}}" }
        }
      ]
    }
  }
}
```

Try:

```bash
# Validation fails before match.call (counter does not advance)
curl -si -X POST http://localhost:3000/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"not-an-email","password":"short"}'

# Per-email lockout (Alice)
curl -si -X POST http://localhost:3000/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"alice@acme.com","password":"wrong-password"}'
# → 401 attemptsLeft: 2
curl -si -X POST http://localhost:3000/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"alice@acme.com","password":"wrong-password"}'
# → 401 + X-Auth-Warning, attemptsLeft: 1
curl -si -X POST http://localhost:3000/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"alice@acme.com","password":"wrong-password"}'
# → 423 + Retry-After

# Bob still has a fresh counter
curl -si -X POST http://localhost:3000/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"bob@acme.com","password":"wrong-password"}'
# → 401 attemptsLeft: 2

# Success resets Alice’s counter; then register a session
curl -si -X POST http://localhost:3000/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"alice@acme.com","password":"CorrectHorse1"}'

curl -si -X POST http://localhost:3000/api/v1/auth/sessions \
  -H 'Content-Type: application/json' \
  -d '{"userId":1,"email":"alice@acme.com","device":"Safari / iOS"}'

curl -s 'http://localhost:3000/api/v1/auth/sessions'
curl -s -o /dev/null -w '%{http_code}\n' -X DELETE http://localhost:3000/api/v1/auth/sessions/1
```

| Feature | How this example uses it |
|---------|--------------------------|
| `match.call.index` + `by` | Failed logins counted per email |
| `match.call.reset` | Successful password clears that email’s counter |
| `request` | Bad payload → `422` without advancing the counter |
| `delay` / headers | Slow fail path, `Retry-After`, `X-Auth-Warning` |
| `store` + `list` + `persist` | Session list / revoke after login; survives restart |

#### Example K — Real project: JWT access + refresh tokens

SPA auth interceptor: login returns opaque `accessToken` / `refreshToken` strings (not cryptographically signed JWTs), refresh rotates them, reuse of an already-rotated refresh fails, and a protected route branches success vs `401`.

Combines: `request` + `match.body` + `match.call` (`index` / `by`) + `match.query` + custom headers.

> This mocks the **HTTP contract** your frontend expects. Tokens are fixed strings you control in `match` — the server does not sign or verify real JWTs.

```json
{
  "api/v1/auth/login": {
    "POST": {
      "nameResponse": "invalid",
      "request": {
        "payload": {
          "email": { "type": "string", "format": "email" },
          "password": { "type": "string", "minLength": 1 }
        },
        "error": {
          "response": "validation-error"
        }
      },
      "responses": [
        {
          "name": "ok",
          "statusCode": 200,
          "match": { "body": { "password": "CorrectHorse1" } },
          "body": {
            "accessToken": "access.ok",
            "refreshToken": "refresh.ok",
            "expiresIn": 900,
            "tokenType": "Bearer",
            "user": { "id": 1, "email": "demo@acme.com" }
          }
        },
        {
          "name": "invalid",
          "statusCode": 401,
          "body": { "code": "INVALID_CREDENTIALS" }
        },
        {
          "name": "validation-error",
          "statusCode": 422,
          "body": { "message": "Invalid login payload", "errors": [] }
        }
      ]
    }
  },
  "api/v1/auth/refresh": {
    "POST": {
      "nameResponse": "unauthorized",
      "request": {
        "payload": {
          "refreshToken": { "type": "string", "minLength": 1 }
        },
        "error": {
          "response": "validation-error"
        }
      },
      "responses": [
        {
          "name": "rotated",
          "statusCode": 200,
          "match": {
            "call": { "index": 1, "by": { "body": "refreshToken" } },
            "body": { "refreshToken": "refresh.ok" }
          },
          "body": {
            "accessToken": "access.ok.2",
            "refreshToken": "refresh.ok.2",
            "expiresIn": 900,
            "tokenType": "Bearer"
          }
        },
        {
          "name": "rotated-again",
          "statusCode": 200,
          "match": {
            "call": { "index": 1, "by": { "body": "refreshToken" } },
            "body": { "refreshToken": "refresh.ok.2" }
          },
          "body": {
            "accessToken": "access.ok.3",
            "refreshToken": "refresh.ok.3",
            "expiresIn": 900,
            "tokenType": "Bearer"
          }
        },
        {
          "name": "expired",
          "statusCode": 401,
          "match": { "body": { "refreshToken": "refresh.expired" } },
          "body": { "code": "REFRESH_EXPIRED" }
        },
        {
          "name": "reuse-detected",
          "statusCode": 401,
          "match": {
            "call": { "index": 2, "by": { "body": "refreshToken" } },
            "body": { "refreshToken": "refresh.ok" }
          },
          "body": { "code": "REFRESH_REUSE" }
        },
        {
          "name": "unauthorized",
          "statusCode": 401,
          "body": { "code": "INVALID_REFRESH" }
        },
        {
          "name": "validation-error",
          "statusCode": 422,
          "body": { "message": "Invalid refresh payload", "errors": [] }
        }
      ]
    }
  },
  "api/v1/auth/logout": {
    "POST": {
      "nameResponse": "ok-fallback",
      "request": {
        "payload": {
          "refreshToken": { "type": "string", "minLength": 1 }
        },
        "error": {
          "response": "validation-error"
        }
      },
      "responses": [
        {
          "name": "ok",
          "statusCode": 204,
          "match": {
            "body": { "refreshToken": "refresh.ok" }
          }
        },
        {
          "name": "ok-rotated",
          "statusCode": 204,
          "match": {
            "body": { "refreshToken": "refresh.ok.2" }
          }
        },
        {
          "name": "ok-fallback",
          "statusCode": 204
        },
        {
          "name": "validation-error",
          "statusCode": 422,
          "body": { "message": "Invalid logout payload", "errors": [] }
        }
      ]
    }
  },
  "api/v1/me": {
    "GET": {
      "nameResponse": "unauthorized",
      "responses": [
        {
          "name": "ok",
          "statusCode": 200,
          "match": { "query": { "auth": "ok" } },
          "body": {
            "id": 1,
            "email": "demo@acme.com",
            "name": "Demo User"
          }
        },
        {
          "name": "unauthorized",
          "statusCode": 401,
          "headers": { "WWW-Authenticate": "Bearer" },
          "body": { "code": "UNAUTHORIZED" }
        }
      ]
    }
  }
}
```

Try:

```bash
# Login → access + refresh
curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"demo@acme.com","password":"CorrectHorse1"}'

# First refresh rotates tokens (reuse counter scoped by refreshToken)
curl -s -X POST http://localhost:3000/api/v1/auth/refresh \
  -H 'Content-Type: application/json' \
  -d '{"refreshToken":"refresh.ok"}'
# → access.ok.2 / refresh.ok.2

# Reusing the old refresh fails
curl -si -X POST http://localhost:3000/api/v1/auth/refresh \
  -H 'Content-Type: application/json' \
  -d '{"refreshToken":"refresh.ok"}'
# → 401 REFRESH_REUSE

# Expired refresh
curl -si -X POST http://localhost:3000/api/v1/auth/refresh \
  -H 'Content-Type: application/json' \
  -d '{"refreshToken":"refresh.expired"}'
# → 401 REFRESH_EXPIRED

# Protected route (query stand-in until header match exists)
curl -s 'http://localhost:3000/api/v1/me?auth=ok'
curl -si 'http://localhost:3000/api/v1/me'
# → 401 + WWW-Authenticate

# Logout
curl -si -X POST http://localhost:3000/api/v1/auth/logout \
  -H 'Content-Type: application/json' \
  -d '{"refreshToken":"refresh.ok.2"}'
```

| Feature | How this example uses it |
|---------|--------------------------|
| `request` | Login / refresh / logout payload shape |
| `match.body` | Correct password, known refresh strings, expired token |
| `match.call` + `by` | First use of `refresh.ok` rotates; second use → `REFRESH_REUSE` |
| `match.query` | Protected `/me` success path (`?auth=ok` as a stand-in for Bearer) |
| Headers | `WWW-Authenticate: Bearer` on unauthorized `/me` |

For lockout counters and a **sessions** store after login, see [Example J](#example-j--real-project-auth-lockout--sessions).

#### Example L — Real project: Password reset

Forgot-password UI: always acknowledge the request (no email enumeration), then validate a reset token and set a new password. Invalid / expired / already-used tokens branch with `match`.

Combines: `request` + `match.params` + `match.body` + `delay` + custom headers.

```json
{
  "api/v1/auth/forgot-password": {
    "POST": {
      "nameResponse": "accepted",
      "delay": 200,
      "request": {
        "payload": {
          "email": { "type": "string", "format": "email" }
        },
        "error": {
          "response": "validation-error"
        }
      },
      "responses": [
        {
          "name": "accepted",
          "statusCode": 202,
          "body": {
            "message": "If an account exists for that email, a reset link was sent"
          }
        },
        {
          "name": "validation-error",
          "statusCode": 422,
          "body": { "message": "Invalid email", "errors": [] }
        }
      ]
    }
  },
  "api/v1/auth/reset-password/:token": {
    "GET": {
      "nameResponse": "invalid",
      "responses": [
        {
          "name": "valid",
          "statusCode": 200,
          "match": { "params": { "token": "reset.ok" } },
          "body": {
            "email": "demo@acme.com",
            "expiresIn": 900
          }
        },
        {
          "name": "expired",
          "statusCode": 410,
          "match": { "params": { "token": "reset.expired" } },
          "body": { "code": "RESET_TOKEN_EXPIRED" }
        },
        {
          "name": "used",
          "statusCode": 410,
          "match": { "params": { "token": "reset.used" } },
          "body": { "code": "RESET_TOKEN_USED" }
        },
        {
          "name": "invalid",
          "statusCode": 404,
          "body": { "code": "RESET_TOKEN_INVALID" }
        }
      ]
    },
    "POST": {
      "nameResponse": "invalid",
      "request": {
        "payload": {
          "password": { "type": "string", "minLength": 10, "maxLength": 72 },
          "passwordConfirm": { "type": "string", "minLength": 10, "maxLength": 72 }
        },
        "error": {
          "response": "validation-error"
        }
      },
      "responses": [
        {
          "name": "ok",
          "statusCode": 204,
          "match": {
            "params": { "token": "reset.ok" },
            "body": { "password": "NewCorrect1", "passwordConfirm": "NewCorrect1" }
          },
          "headers": { "X-Auth": "password-reset" }
        },
        {
          "name": "mismatch",
          "statusCode": 422,
          "match": {
            "params": { "token": "reset.ok" },
            "body": { "password": "NewCorrect1", "passwordConfirm": "OtherPass99" }
          },
          "body": { "code": "PASSWORD_MISMATCH" }
        },
        {
          "name": "expired",
          "statusCode": 410,
          "match": { "params": { "token": "reset.expired" } },
          "body": { "code": "RESET_TOKEN_EXPIRED" }
        },
        {
          "name": "used",
          "statusCode": 410,
          "match": { "params": { "token": "reset.used" } },
          "body": { "code": "RESET_TOKEN_USED" }
        },
        {
          "name": "invalid",
          "statusCode": 404,
          "body": { "code": "RESET_TOKEN_INVALID" }
        },
        {
          "name": "validation-error",
          "statusCode": 422,
          "body": { "message": "Invalid reset payload", "errors": [] }
        }
      ]
    }
  }
}
```

Try:

```bash
# Always 202 (no email enumeration)
curl -si -X POST http://localhost:3000/api/v1/auth/forgot-password \
  -H 'Content-Type: application/json' \
  -d '{"email":"anyone@acme.com"}'

# Validate token before showing the form
curl -s http://localhost:3000/api/v1/auth/reset-password/reset.ok
curl -si http://localhost:3000/api/v1/auth/reset-password/reset.expired
# → 410 RESET_TOKEN_EXPIRED

# Password mismatch vs success
curl -si -X POST http://localhost:3000/api/v1/auth/reset-password/reset.ok \
  -H 'Content-Type: application/json' \
  -d '{"password":"NewCorrect1","passwordConfirm":"OtherPass99"}'
# → 422 PASSWORD_MISMATCH

curl -si -X POST http://localhost:3000/api/v1/auth/reset-password/reset.ok \
  -H 'Content-Type: application/json' \
  -d '{"password":"NewCorrect1","passwordConfirm":"NewCorrect1"}'
# → 204
```

| Feature | How this example uses it |
|---------|--------------------------|
| `request` | Email + password shape |
| `match.params` | `reset.ok` / `reset.expired` / `reset.used` tokens |
| `match.body` | Password confirm mismatch vs success |
| `delay` | Slow forgot-password path |
| `410` | Expired / already-used tokens |

Pairs with [Example J](#example-j--real-project-auth-lockout--sessions) (lockout) and [Example K](#example-k--real-project-jwt-access--refresh-tokens) (JWT refresh).

#### Example M — Real project: Async export job

CSV/PDF export: create a job (`202`), poll until ready (`match.call`), then return a download URL. Models the classic frontend spinner / retry loop without a real queue.

Combines: `request` + `match.params` + `match.call` + `delay` + headers (`Retry-After`, `Location`).

```json
{
  "api/v1/exports": {
    "POST": {
      "nameResponse": "accepted",
      "request": {
        "payload": {
          "type": { "type": "string", "enum": ["orders-csv", "users-csv", "invoices-pdf"] },
          "from?": { "type": "string", "format": "date" },
          "to?": { "type": "string", "format": "date" }
        },
        "error": {
          "response": "validation-error"
        }
      },
      "responses": [
        {
          "name": "accepted",
          "statusCode": 202,
          "delay": 80,
          "headers": {
            "Location": "/api/v1/exports/job_1",
            "Retry-After": "1"
          },
          "body": {
            "id": "job_1",
            "status": "queued",
            "type": "orders-csv"
          }
        },
        {
          "name": "quota",
          "statusCode": 429,
          "match": { "body": { "type": "invoices-pdf" } },
          "headers": { "Retry-After": "30" },
          "body": { "code": "EXPORT_QUOTA", "retryAfterSec": 30 }
        },
        {
          "name": "validation-error",
          "statusCode": 422,
          "body": { "message": "Invalid export request", "errors": [] }
        }
      ]
    }
  },
  "api/v1/exports/:id": {
    "GET": {
      "nameResponse": "not-found",
      "responses": [
        {
          "name": "queued",
          "statusCode": 202,
          "delay": 50,
          "match": {
            "params": { "id": "job_1" },
            "call": { "index": 1 }
          },
          "headers": { "Retry-After": "1" },
          "body": {
            "id": "job_1",
            "status": "queued",
            "progress": 0
          }
        },
        {
          "name": "running",
          "statusCode": 202,
          "delay": 80,
          "match": {
            "params": { "id": "job_1" },
            "call": { "index": 2 }
          },
          "headers": { "Retry-After": "1" },
          "body": {
            "id": "job_1",
            "status": "running",
            "progress": 55
          }
        },
        {
          "name": "ready",
          "statusCode": 200,
          "match": {
            "params": { "id": "job_1" },
            "call": { "index": 3 }
          },
          "body": {
            "id": "job_1",
            "status": "ready",
            "progress": 100,
            "downloadUrl": "/api/v1/exports/job_1/download",
            "expiresAt": "2026-07-28T18:00:00.000Z"
          }
        },
        {
          "name": "ready-again",
          "statusCode": 200,
          "match": { "params": { "id": "job_1" } },
          "body": {
            "id": "job_1",
            "status": "ready",
            "progress": 100,
            "downloadUrl": "/api/v1/exports/job_1/download",
            "expiresAt": "2026-07-28T18:00:00.000Z"
          }
        },
        {
          "name": "failed",
          "statusCode": 200,
          "match": { "params": { "id": "job_fail" } },
          "body": {
            "id": "job_fail",
            "status": "failed",
            "error": { "code": "EXPORT_FAILED", "message": "Source query timed out" }
          }
        },
        {
          "name": "not-found",
          "statusCode": 404,
          "body": { "code": "JOB_NOT_FOUND" }
        }
      ]
    }
  },
  "api/v1/exports/:id/download": {
    "GET": {
      "nameResponse": "not-ready",
      "responses": [
        {
          "name": "file",
          "statusCode": 200,
          "match": { "params": { "id": "job_1" } },
          "headers": {
            "Content-Type": "text/csv",
            "Content-Disposition": "attachment; filename=\"orders.csv\""
          },
          "body": "id,total\n1,42.00\n2,15.50\n"
        },
        {
          "name": "not-ready",
          "statusCode": 409,
          "body": { "code": "EXPORT_NOT_READY" }
        }
      ]
    }
  }
}
```

Try:

```bash
# Start export
curl -si -X POST http://localhost:3000/api/v1/exports \
  -H 'Content-Type: application/json' \
  -d '{"type":"orders-csv","from":"2026-07-01","to":"2026-07-28"}'
# → 202 + Location

# Poll: queued → running → ready
curl -si http://localhost:3000/api/v1/exports/job_1
curl -si http://localhost:3000/api/v1/exports/job_1
curl -s http://localhost:3000/api/v1/exports/job_1

# Download when ready
curl -s http://localhost:3000/api/v1/exports/job_1/download

# Quota example
curl -si -X POST http://localhost:3000/api/v1/exports \
  -H 'Content-Type: application/json' \
  -d '{"type":"invoices-pdf"}'
# → 429
```

| Feature | How this example uses it |
|---------|--------------------------|
| `202` + `Location` / `Retry-After` | Job accepted; client knows where to poll |
| `match.call` | Poll sequence: queued → running → ready |
| `match.body` | Quota path for a specific export type |
| `delay` | Slight wait on create / early poll hits |
| Static CSV `body` | Fake download without a real file store |

#### Example N — Real project: Notifications inbox

Bell icon + inbox: list notifications, filter unread, mark one as read, mark all as read. Uses a mutable `store` so the UI stays consistent across requests.

Combines: `store` + `list` filters + `patch` + `request` + `persist`.

```json
{
  "api/v1/notifications": {
    "store": {
      "id": "notifications",
      "key": "id",
      "seed": [
        {
          "id": 1,
          "title": "Invoice paid",
          "body": "Invoice #1042 was paid",
          "unread": true,
          "createdAt": "2026-07-28T09:00:00.000Z"
        },
        {
          "id": 2,
          "title": "New comment",
          "body": "Alex commented on your task",
          "unread": true,
          "createdAt": "2026-07-28T10:15:00.000Z"
        },
        {
          "id": 3,
          "title": "Welcome",
          "body": "Thanks for joining Acme",
          "unread": false,
          "createdAt": "2026-07-01T08:00:00.000Z"
        }
      ],
      "template": {
        "id": 0,
        "title": "",
        "body": "",
        "unread": true,
        "createdAt": ""
      },
      "list": {
        "sort": { "query": "sort", "default": "-createdAt", "fields": ["createdAt", "id"] },
        "order": { "query": "order", "default": "desc" },
        "page": { "query": "page", "default": 1 },
        "pageSize": { "query": "pageSize", "default": 20, "max": 50 },
        "filter": {
          "fields": [
            { "field": "unread", "query": "unread", "op": "eq" }
          ]
        }
      },
      "persist": true
    },
    "GET": {
      "nameResponse": "list",
      "responses": [
        {
          "name": "list",
          "statusCode": 200,
          "action": "list",
          "body": {
            "items": "{{items}}",
            "page": "{{page}}",
            "pageSize": "{{pageSize}}",
            "total": "{{total}}",
            "unreadCount": "{{total}}"
          }
        }
      ]
    },
    "POST": {
      "nameResponse": "create",
      "request": {
        "payload": {
          "title": { "type": "string", "minLength": 1, "maxLength": 120 },
          "payload": { "type": "string", "minLength": 1, "maxLength": 500 },
          "unread?": { "type": "boolean" }
        },
        "error": {
          "response": "validation-error"
        }
      },
      "responses": [
        { "name": "create", "statusCode": 201, "action": "create" },
        {
          "name": "validation-error",
          "statusCode": 422,
          "body": { "message": "Invalid notification", "errors": [] }
        }
      ]
    }
  },
  "api/v1/notifications/:id": {
    "store": { "id": "notifications" },
    "GET": {
      "nameResponse": "get",
      "responses": [
        { "name": "get", "statusCode": 200, "action": "get" }
      ]
    },
    "PATCH": {
      "nameResponse": "patch",
      "request": {
        "payload": {
          "unread?": { "type": "boolean" },
          "title?": { "type": "string", "minLength": 1, "maxLength": 120 }
        },
        "error": {
          "response": "validation-error"
        }
      },
      "responses": [
        { "name": "patch", "statusCode": 200, "action": "patch" },
        {
          "name": "validation-error",
          "statusCode": 422,
          "body": { "message": "Invalid patch", "errors": [] }
        }
      ]
    },
    "DELETE": {
      "nameResponse": "remove",
      "responses": [
        { "name": "remove", "statusCode": 204, "action": "delete" }
      ]
    }
  },
  "api/v1/notifications/mark-all-read": {
    "POST": {
      "nameResponse": "ok",
      "responses": [
        {
          "name": "ok",
          "statusCode": 200,
          "body": {
            "updated": 2,
            "message": "All notifications marked as read"
          }
        }
      ]
    }
  }
}
```

Try:

```bash
# Inbox + unread only
curl -s 'http://localhost:3000/api/v1/notifications?sort=createdAt&order=desc'
curl -s 'http://localhost:3000/api/v1/notifications?unread=true'

# Mark one as read
curl -s -X PATCH http://localhost:3000/api/v1/notifications/1 \
  -H 'Content-Type: application/json' \
  -d '{"unread":false}'

# Mark-all endpoint (static ack — wire to your UI; store rows still need per-item patch for live counts)
curl -s -X POST http://localhost:3000/api/v1/notifications/mark-all-read
```

| Feature | How this example uses it |
|---------|--------------------------|
| `store` + `seed` | Realistic inbox bootstrap |
| `store.list` + `filter` | `?unread=true` |
| `action: "patch"` | Mark one notification read |
| `persist` | Bell state survives restart |
| Static mark-all | Simple UI ack; pair with patches if you need store truth |

> `mark-all-read` is a **static** response (no bulk store action). For a fully consistent unread count, patch each item or reset the store seed after testing.

#### Example O — Real project: Signed URL upload

Avatar / attachment flow without multipart parsing: the API returns a signed upload URL, the client “uploads”, then confirms completion and fetches asset metadata.

Combines: `request` + `match.params` + `match.body` + `delay` + headers.

```json
{
  "api/v1/uploads": {
    "POST": {
      "nameResponse": "created",
      "request": {
        "payload": {
          "filename": { "type": "string", "minLength": 1, "maxLength": 200 },
          "contentType": {
            "type": "string",
            "enum": ["image/png", "image/jpeg", "application/pdf"]
          },
          "sizeBytes": { "type": "number", "min": 1, "max": 10485760 }
        },
        "error": {
          "response": "validation-error"
        }
      },
      "responses": [
        {
          "name": "too-large",
          "statusCode": 413,
          "match": { "body": { "filename": "huge.bin" } },
          "body": { "code": "FILE_TOO_LARGE", "maxBytes": 10485760 }
        },
        {
          "name": "created-pdf",
          "statusCode": 201,
          "match": { "body": { "contentType": "application/pdf" } },
          "body": {
            "uploadId": "upl_pdf",
            "uploadUrl": "/api/v1/uploads/upl_pdf/content",
            "assetUrl": "/api/v1/assets/upl_pdf",
            "expiresIn": 300
          }
        },
        {
          "name": "created",
          "statusCode": 201,
          "delay": 60,
          "body": {
            "uploadId": "upl_ok",
            "uploadUrl": "/api/v1/uploads/upl_ok/content",
            "assetUrl": "/api/v1/assets/upl_ok",
            "expiresIn": 300
          }
        },
        {
          "name": "validation-error",
          "statusCode": 422,
          "body": { "message": "Invalid upload request", "errors": [] }
        }
      ]
    }
  },
  "api/v1/uploads/:uploadId/content": {
    "PUT": {
      "nameResponse": "not-found",
      "responses": [
        {
          "name": "stored",
          "statusCode": 200,
          "delay": 120,
          "match": { "params": { "uploadId": "upl_ok" } },
          "body": { "uploadId": "upl_ok", "stored": true }
        },
        {
          "name": "stored-pdf",
          "statusCode": 200,
          "match": { "params": { "uploadId": "upl_pdf" } },
          "body": { "uploadId": "upl_pdf", "stored": true }
        },
        {
          "name": "expired",
          "statusCode": 410,
          "match": { "params": { "uploadId": "upl_expired" } },
          "body": { "code": "UPLOAD_URL_EXPIRED" }
        },
        {
          "name": "not-found",
          "statusCode": 404,
          "body": { "code": "UPLOAD_NOT_FOUND" }
        }
      ]
    }
  },
  "api/v1/uploads/:uploadId/complete": {
    "POST": {
      "nameResponse": "not-found",
      "responses": [
        {
          "name": "ok",
          "statusCode": 200,
          "match": { "params": { "uploadId": "upl_ok" } },
          "body": {
            "id": "upl_ok",
            "status": "ready",
            "url": "/api/v1/assets/upl_ok",
            "contentType": "image/png",
            "sizeBytes": 245760
          }
        },
        {
          "name": "incomplete",
          "statusCode": 409,
          "match": { "params": { "uploadId": "upl_pdf" } },
          "body": { "code": "UPLOAD_INCOMPLETE" }
        },
        {
          "name": "not-found",
          "statusCode": 404,
          "body": { "code": "UPLOAD_NOT_FOUND" }
        }
      ]
    }
  },
  "api/v1/assets/:id": {
    "GET": {
      "nameResponse": "not-found",
      "responses": [
        {
          "name": "ok",
          "statusCode": 200,
          "match": { "params": { "id": "upl_ok" } },
          "body": {
            "id": "upl_ok",
            "url": "https://cdn.example.com/upl_ok.png",
            "contentType": "image/png",
            "sizeBytes": 245760
          }
        },
        {
          "name": "not-found",
          "statusCode": 404,
          "body": { "code": "ASSET_NOT_FOUND" }
        }
      ]
    }
  }
}
```

Try:

```bash
# Initiate upload
curl -s -X POST http://localhost:3000/api/v1/uploads \
  -H 'Content-Type: application/json' \
  -d '{"filename":"avatar.png","contentType":"image/png","sizeBytes":245760}'

# PUT content to the signed path (body ignored — contract only)
curl -si -X PUT http://localhost:3000/api/v1/uploads/upl_ok/content \
  -H 'Content-Type: image/png' \
  -d 'fake-bytes'

# Complete + fetch asset metadata
curl -s -X POST http://localhost:3000/api/v1/uploads/upl_ok/complete
curl -s http://localhost:3000/api/v1/assets/upl_ok

# Too large
curl -si -X POST http://localhost:3000/api/v1/uploads \
  -H 'Content-Type: application/json' \
  -d '{"filename":"huge.bin","contentType":"image/jpeg","sizeBytes":100}'
# → 413
```

| Feature | How this example uses it |
|---------|--------------------------|
| `request` + `enum` | Allowed content types / size bounds |
| `match.body` / `match.params` | Happy path vs `413` / `410` / `409` |
| `delay` | Simulate upload latency on PUT |
| Static CDN URL | Frontend can bind an `<img>` / download link |

> No multipart parser: the mock returns the **same JSON shape** as a real signed-URL API so the SPA flow works end-to-end.

#### Example P — Real project: Feature flags + app config

App boot: load global config + feature flags, optionally overridden per tenant/env. Frontend gates UI without waiting on a real flag service.

Combines: `match.params` + `match.query` + static bodies + light `delay`.

```json
{
  "api/v1/config": {
    "GET": {
      "nameResponse": "default",
      "delay": 40,
      "responses": [
        {
          "name": "staging",
          "statusCode": 200,
          "match": { "query": { "env": "staging" } },
          "body": {
            "env": "staging",
            "apiBaseUrl": "https://staging.api.example.com",
            "supportEmail": "support-staging@example.com",
            "maintenance": false
          }
        },
        {
          "name": "maintenance",
          "statusCode": 200,
          "match": { "query": { "env": "maintenance" } },
          "body": {
            "env": "production",
            "apiBaseUrl": "https://api.example.com",
            "supportEmail": "support@example.com",
            "maintenance": true,
            "maintenanceMessage": "Scheduled maintenance until 18:00 UTC"
          }
        },
        {
          "name": "default",
          "statusCode": 200,
          "body": {
            "env": "production",
            "apiBaseUrl": "https://api.example.com",
            "supportEmail": "support@example.com",
            "maintenance": false
          }
        }
      ]
    }
  },
  "api/v1/feature-flags": {
    "GET": {
      "nameResponse": "default",
      "responses": [
        {
          "name": "beta-tenant",
          "statusCode": 200,
          "match": { "query": { "tenantId": "beta" } },
          "body": {
            "flags": {
              "newCheckout": true,
              "aiAssistant": true,
              "darkMode": true,
              "exportsV2": true
            }
          }
        },
        {
          "name": "default",
          "statusCode": 200,
          "body": {
            "flags": {
              "newCheckout": false,
              "aiAssistant": false,
              "darkMode": true,
              "exportsV2": false
            }
          }
        }
      ]
    }
  },
  "api/v1/tenants/:tenantId/feature-flags": {
    "GET": {
      "nameResponse": "default",
      "responses": [
        {
          "name": "acme",
          "statusCode": 200,
          "match": { "params": { "tenantId": "acme" } },
          "body": {
            "tenantId": "acme",
            "flags": {
              "newCheckout": true,
              "aiAssistant": false,
              "darkMode": true,
              "exportsV2": true
            }
          }
        },
        {
          "name": "blocked",
          "statusCode": 403,
          "match": { "params": { "tenantId": "blocked" } },
          "body": { "code": "TENANT_FORBIDDEN" }
        },
        {
          "name": "default",
          "statusCode": 200,
          "body": {
            "tenantId": "unknown",
            "flags": {
              "newCheckout": false,
              "aiAssistant": false,
              "darkMode": true,
              "exportsV2": false
            }
          }
        }
      ]
    }
  }
}
```

Try:

```bash
curl -s 'http://localhost:3000/api/v1/config'
curl -s 'http://localhost:3000/api/v1/config?env=staging'
curl -s 'http://localhost:3000/api/v1/config?env=maintenance'

curl -s 'http://localhost:3000/api/v1/feature-flags'
curl -s 'http://localhost:3000/api/v1/feature-flags?tenantId=beta'
curl -s 'http://localhost:3000/api/v1/tenants/acme/feature-flags'
curl -si 'http://localhost:3000/api/v1/tenants/blocked/feature-flags'
```

| Feature | How this example uses it |
|---------|--------------------------|
| `match.query` | Env-specific config / beta tenant flags |
| `match.params` | Per-tenant flag document + `403` |
| `delay` | Slight boot latency on config |
| Static JSON | SPA can gate routes/components immediately |

#### Example Q — Real project: Billing + subscription

Settings → plan: list plans, read current subscription, upgrade/downgrade, and surface trial / past_due / payment-required states.

Combines: `request` + `match.body` + `match.query` + `delay` + `402` / `403` / `409`.

```json
{
  "api/v1/billing/plans": {
    "GET": {
      "nameResponse": "ok",
      "responses": [
        {
          "name": "ok",
          "statusCode": 200,
          "body": {
            "plans": [
              { "id": "free", "name": "Free", "priceMonthly": 0, "seats": 1 },
              { "id": "pro", "name": "Pro", "priceMonthly": 29, "seats": 10 },
              { "id": "business", "name": "Business", "priceMonthly": 99, "seats": 50 }
            ]
          }
        }
      ]
    }
  },
  "api/v1/billing/subscription": {
    "GET": {
      "nameResponse": "active",
      "responses": [
        {
          "name": "trial",
          "statusCode": 200,
          "match": { "query": { "state": "trial" } },
          "body": {
            "planId": "pro",
            "status": "trialing",
            "trialEndsAt": "2026-08-15T00:00:00.000Z",
            "seats": 10,
            "renewAt": null
          }
        },
        {
          "name": "past-due",
          "statusCode": 200,
          "match": { "query": { "state": "past_due" } },
          "body": {
            "planId": "pro",
            "status": "past_due",
            "trialEndsAt": null,
            "seats": 10,
            "renewAt": "2026-07-01T00:00:00.000Z",
            "invoiceId": "inv_past_1"
          }
        },
        {
          "name": "active",
          "statusCode": 200,
          "body": {
            "planId": "free",
            "status": "active",
            "trialEndsAt": null,
            "seats": 1,
            "renewAt": null
          }
        }
      ]
    },
    "POST": {
      "nameResponse": "upgraded",
      "delay": 150,
      "request": {
        "payload": {
          "planId": { "type": "string", "enum": ["free", "pro", "business"] },
          "seats?": { "type": "number", "min": 1, "max": 500 },
          "paymentMethodId?": { "type": "string", "minLength": 1 }
        },
        "error": {
          "response": "validation-error"
        }
      },
      "responses": [
        {
          "name": "payment-required",
          "statusCode": 402,
          "match": { "body": { "planId": "business", "paymentMethodId": "pm_fail" } },
          "body": {
            "code": "PAYMENT_REQUIRED",
            "message": "Card was declined"
          }
        },
        {
          "name": "forbidden-downgrade",
          "statusCode": 403,
          "match": { "body": { "planId": "free" }, "query": { "usage": "over" } },
          "body": {
            "code": "DOWNGRADE_BLOCKED",
            "message": "Reduce seats/usage before moving to Free"
          }
        },
        {
          "name": "same-plan",
          "statusCode": 409,
          "match": { "body": { "planId": "free" } },
          "body": { "code": "ALREADY_ON_PLAN" }
        },
        {
          "name": "upgraded",
          "statusCode": 200,
          "body": {
            "planId": "pro",
            "status": "active",
            "seats": 10,
            "renewAt": "2026-08-28T00:00:00.000Z"
          }
        },
        {
          "name": "validation-error",
          "statusCode": 422,
          "body": { "message": "Invalid subscription change", "errors": [] }
        }
      ]
    }
  },
  "api/v1/billing/invoices/:id/pay": {
    "POST": {
      "nameResponse": "not-found",
      "responses": [
        {
          "name": "ok",
          "statusCode": 200,
          "match": { "params": { "id": "inv_past_1" } },
          "delay": 200,
          "body": {
            "invoiceId": "inv_past_1",
            "status": "paid",
            "subscriptionStatus": "active"
          }
        },
        {
          "name": "declined",
          "statusCode": 402,
          "match": { "params": { "id": "inv_past_1" }, "query": { "card": "fail" } },
          "body": { "code": "CARD_DECLINED" }
        },
        {
          "name": "not-found",
          "statusCode": 404,
          "body": { "code": "INVOICE_NOT_FOUND" }
        }
      ]
    }
  }
}
```

Try:

```bash
curl -s http://localhost:3000/api/v1/billing/plans
curl -s 'http://localhost:3000/api/v1/billing/subscription?state=trial'
curl -s 'http://localhost:3000/api/v1/billing/subscription?state=past_due'

# Upgrade happy path (nameResponse)
curl -s -X POST http://localhost:3000/api/v1/billing/subscription \
  -H 'Content-Type: application/json' \
  -d '{"planId":"pro","seats":10,"paymentMethodId":"pm_ok"}'

# Declined card on business
curl -si -X POST http://localhost:3000/api/v1/billing/subscription \
  -H 'Content-Type: application/json' \
  -d '{"planId":"business","paymentMethodId":"pm_fail"}'
# → 402

# Same plan conflict
curl -si -X POST http://localhost:3000/api/v1/billing/subscription \
  -H 'Content-Type: application/json' \
  -d '{"planId":"free"}'
# → 409

# Pay past-due invoice
curl -s -X POST http://localhost:3000/api/v1/billing/invoices/inv_past_1/pay
curl -si -X POST 'http://localhost:3000/api/v1/billing/invoices/inv_past_1/pay?card=fail'
```

| Feature | How this example uses it |
|---------|--------------------------|
| `match.query` | Trial / past_due subscription views; card fail on pay |
| `match.body` | `402` decline, `409` same plan |
| `match.body` + `match.query` | Downgrade blocked when `usage=over` |
| `request` + `enum` | Plan ids and seat bounds |
| `delay` | Slow upgrade / pay paths |

Pairs with [Checkout resilience](real-world.md#example-checkout-resilience-payments-ui) for retry/`429` payment UX.

#### Example R — Real project: Onboarding wizard

Multi-step signup/onboarding: save each step, resume from the server, and finish only when required steps are complete.

Combines: `request` + `match.body` + `match.query` + `409` / `422`.

```json
{
  "api/v1/onboarding": {
    "GET": {
      "nameResponse": "in-progress",
      "responses": [
        {
          "name": "fresh",
          "statusCode": 200,
          "match": { "query": { "state": "fresh" } },
          "body": {
            "status": "in_progress",
            "currentStep": 1,
            "completedSteps": [],
            "data": {}
          }
        },
        {
          "name": "done",
          "statusCode": 200,
          "match": { "query": { "state": "done" } },
          "body": {
            "status": "completed",
            "currentStep": 3,
            "completedSteps": [1, 2, 3],
            "data": {
              "company": "Acme",
              "role": "admin",
              "inviteEmails": ["alex@acme.com"]
            }
          }
        },
        {
          "name": "in-progress",
          "statusCode": 200,
          "body": {
            "status": "in_progress",
            "currentStep": 2,
            "completedSteps": [1],
            "data": {
              "company": "Acme",
              "role": null,
              "inviteEmails": []
            }
          }
        }
      ]
    }
  },
  "api/v1/onboarding/steps/:step": {
    "PUT": {
      "nameResponse": "saved",
      "request": {
        "payload": {
          "company?": { "type": "string", "minLength": 2, "maxLength": 80 },
          "role?": { "type": "string", "enum": ["admin", "member", "viewer"] },
          "inviteEmails?": {
            "type": "array",
            "minItems": 0,
            "maxItems": 10,
            "items": { "type": "string", "format": "email" }
          }
        },
        "error": {
          "response": "validation-error"
        }
      },
      "responses": [
        {
          "name": "step1",
          "statusCode": 200,
          "match": {
            "params": { "step": "1" },
            "body": { "company": "Acme" }
          },
          "body": {
            "status": "in_progress",
            "currentStep": 2,
            "completedSteps": [1],
            "data": { "company": "Acme" }
          }
        },
        {
          "name": "step2",
          "statusCode": 200,
          "match": {
            "params": { "step": "2" },
            "body": { "role": "admin" }
          },
          "body": {
            "status": "in_progress",
            "currentStep": 3,
            "completedSteps": [1, 2],
            "data": { "company": "Acme", "role": "admin" }
          }
        },
        {
          "name": "step3",
          "statusCode": 200,
          "match": {
            "params": { "step": "3" },
            "body": { "inviteEmails": ["alex@acme.com"] }
          },
          "body": {
            "status": "in_progress",
            "currentStep": 3,
            "completedSteps": [1, 2, 3],
            "data": {
              "company": "Acme",
              "role": "admin",
              "inviteEmails": ["alex@acme.com"]
            }
          }
        },
        {
          "name": "out-of-order",
          "statusCode": 409,
          "match": { "params": { "step": "3" }, "query": { "skip": "1" } },
          "body": {
            "code": "STEP_OUT_OF_ORDER",
            "message": "Complete previous steps first",
            "currentStep": 1
          }
        },
        {
          "name": "saved",
          "statusCode": 200,
          "body": {
            "status": "in_progress",
            "currentStep": 2,
            "completedSteps": [1],
            "data": { "company": "Acme" }
          }
        },
        {
          "name": "validation-error",
          "statusCode": 422,
          "body": { "message": "Invalid step payload", "errors": [] }
        }
      ]
    }
  },
  "api/v1/onboarding/complete": {
    "POST": {
      "nameResponse": "incomplete",
      "responses": [
        {
          "name": "ok",
          "statusCode": 200,
          "match": { "query": { "ready": "true" } },
          "body": {
            "status": "completed",
            "redirectTo": "/app/home"
          }
        },
        {
          "name": "incomplete",
          "statusCode": 409,
          "body": {
            "code": "ONBOARDING_INCOMPLETE",
            "missingSteps": [2, 3]
          }
        }
      ]
    }
  }
}
```

Try:

```bash
# Resume wizard
curl -s http://localhost:3000/api/v1/onboarding
curl -s 'http://localhost:3000/api/v1/onboarding?state=fresh'
curl -s 'http://localhost:3000/api/v1/onboarding?state=done'

# Save steps
curl -s -X PUT http://localhost:3000/api/v1/onboarding/steps/1 \
  -H 'Content-Type: application/json' \
  -d '{"company":"Acme"}'

curl -s -X PUT http://localhost:3000/api/v1/onboarding/steps/2 \
  -H 'Content-Type: application/json' \
  -d '{"role":"admin"}'

curl -s -X PUT http://localhost:3000/api/v1/onboarding/steps/3 \
  -H 'Content-Type: application/json' \
  -d '{"inviteEmails":["alex@acme.com"]}'

# Out of order / incomplete finish
curl -si -X PUT 'http://localhost:3000/api/v1/onboarding/steps/3?skip=1' \
  -H 'Content-Type: application/json' \
  -d '{"inviteEmails":["alex@acme.com"]}'
# → 409

curl -si -X POST http://localhost:3000/api/v1/onboarding/complete
# → 409 ONBOARDING_INCOMPLETE

curl -s -X POST 'http://localhost:3000/api/v1/onboarding/complete?ready=true'
# → completed + redirectTo
```

| Feature | How this example uses it |
|---------|--------------------------|
| `match.query` | Fresh / done resume; complete only when `ready=true` |
| `match.params` + `match.body` | Per-step happy paths |
| `request` | Partial step payloads + email array |
| `409` | Out-of-order step and incomplete finish |

