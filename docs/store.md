# Mutable store 🗄️

Opt-in feature (≥ `1.11.0`; advanced list filters ≥ `1.12.0`; composite unique ≥ `1.13.0`; soft delete ≥ `1.14.0`; relations ≥ `1.15.0`; customizable `notFound` ≥ `1.16.0`). Without `store` + `action`, mocks stay 100% static.

Use it when the frontend needs **real CRUD flows**: create an item, list it, edit it, delete it — without a backend. Data lives in memory for the process lifetime; optionally survive restarts with `persist`.

The sections below are the reference. Use the **capability map** to pick pieces, then copy a recipe or a ready-made example (A–I) and adapt routes/fields to your app.

### Capability map (build complex mocks)

Goal: from this guide alone you can compose multi-tenant APIs with validation, business errors, filtered/paginated lists, and persistence.

#### 1. Pick building blocks

| You need… | Use | Query / config sketch | Deep dive |
|-----------|-----|----------------------|-----------|
| Collection + CRUD | `store` + `action` | `"action": "list" \| "get" \| "create" \| "update" \| "patch" \| "delete" \| "restore"` | [Actions](#actions), [Schema](#schema-definition-vs-reference) |
| Soft delete / trash | `store.softDelete` | `"softDelete": true` + `?includeDeleted=true` | [Soft delete](#soft-delete) |
| Relations / FK | `store.relations` | `"userId": { "store": "users", "join": { "from": "userId", "to": "id" } }` / `type: "many"` / `?expand=posts.user` | [Relations](#relations) |
| Auto ids / defaults | `key`, `template` | `"key": "id"` or `{ "fields": ["tenantId", "id"] }` | [Key generation](#key-generation-on-create) |
| Seed data | `seed` | `"seed": [{ "id": 1, ... }]` | [Schema](#schema-definition-vs-reference) |
| Business uniqueness | `unique` + `409` responses | `"unique": ["email"]` or field-level `conflict` | [Conflicts](#conflicts-409) |
| Custom missing item | `store.notFound` | `"notFound": { "response": "missing-user" }` | [Not found](#not-found-404) |
| Survive restart | `persist` / `--reset-store` | `"persist": true` | [Persist and restart](#persist-and-restart-behavior) |
| Validate payload/query | `request` | `"payload": { "email": { "type": "string", "format": "email" } }` | [Request validation](advanced-examples.md#example-9-request-validation) |
| Branch by params/query/body/call | `match` | `"match": { "call": { "index": 1, "by": { "body": "email" } } }` | [Example 5–8](advanced-examples.md#example-5-match-by-route-params) |
| Latency / headers | `delay`, `headers` | `"delay": 120`, `"Retry-After": "30"` | [Example 6](advanced-examples.md#example-6-match-by-query-params-and-delay) |
| Page tables | `store.list` **page** | `?page=2&pageSize=10` | [Page mode](#page-mode) |
| Offset APIs | `store.list` **offset** | `?offset=20&limit=10` | [Offset mode](#offset-mode) |
| Infinite scroll / feeds | `store.list` **cursor** | `?starting_after=<token>&limit=10` | [Cursor mode](#cursor--keyset-mode-stripe-style) |
| Equality filter | `filter` `eq` | `?status=active` | [Filters / search](#filters--search) |
| Exclude value | `op: "ne"` | `?excludeStatus=draft` | same |
| Numeric range | `gte`/`lte`/`gt`/`lt` | `?minPrice=10&maxPrice=50` | same |
| Multi-value | `op: "in"` | `?roles=a,b` or `?roles=a&roles=b` | same |
| Nested field | `a.b` in filter / search / sort | `?region=eu` or `?sort=meta.region` | same |
| OR facets | `filter.or` | `?anyDept=x&anyCity=y` → match either | same |
| Text box | `filter.search` | `?q=tea` | same |
| Multi-sort | `sort` | `?sort=price:desc,name:asc` | [Multi-sort](#multi-sort) |
| Custom list JSON | list placeholders | `"data": "{{items}}"`, `"Link": "{{linkHeader}}"` | [Response templates](#response-templates-fully-customizable) |
| Forward to real API | `proxy` (**not** with `action`) | `"proxy": true` or URL | [Proxy](body-compatibility.md#example-10-proxy-to-a-real-backend) |

Pipeline reminder (every request): `request` → `match` → `delay` → exactly one of `proxy` / `action` / static `body` (optional `encoding`).  
List pipeline (inside `action: "list"` + `store.list`): key params → `fields` (AND) → `or` → `search` → sort → page/offset/cursor → templates.

#### 2. Compose a complex endpoint (recipe)

Copy this skeleton and fill the `‹…›` slots. One file can define several endpoints; share data with `"store": { "id": "‹same-id›" }` on item routes.

```json
{
  "api/‹tenants›/:tenantId/‹resources›": {
    "store": {
      "id": "‹resources›",
      "key": { "fields": ["tenantId", "id"] },
      "seed": [],
      "template": {
        "tenantId": "",
        "id": 0,
        "status": "active",
        "meta": { "region": "" }
      },
      "unique": {
        "fields": [
          {
            "field": "‹slug-or-email›",
            "conflict": { "response": "‹conflict-name›" }
          }
        ]
      },
      "persist": true,
      "list": {
        "page": { "query": "page", "default": 1 },
        "pageSize": {
          "query": "pageSize",
          "default": 10,
          "max": 50,
          "aliases": ["limit"]
        },
        "sort": {
          "query": "sort",
          "default": "-id",
          "fields": ["id", "status", "‹price-or-createdAt›"]
        },
        "filter": {
          "fields": [
            "status",
            { "field": "‹price›", "op": "gte", "query": "minPrice" },
            { "field": "‹price›", "op": "lte", "query": "maxPrice" },
            { "field": "status", "op": "ne", "query": "excludeStatus" },
            { "field": "‹tag›", "op": "in", "query": "tags" },
            { "field": "meta.region", "op": "eq", "query": "region" }
          ],
          "or": [
            { "field": "status", "op": "eq", "query": "anyStatus" },
            { "field": "meta.region", "op": "eq", "query": "anyRegion" }
          ],
          "search": {
            "query": "q",
            "fields": ["‹name›", "meta.region"]
          }
        }
      }
    },
    "GET": {
      "nameResponse": "list",
      "responses": [
        {
          "name": "forbidden",
          "statusCode": 403,
          "match": { "params": { "tenantId": "blocked" } },
          "body": { "code": "FORBIDDEN" }
        },
        {
          "name": "list",
          "statusCode": 200,
          "action": "list",
          "headers": {
            "X-Total-Count": "{{total}}",
            "Link": "{{linkHeader}}"
          },
          "body": {
            "data": "{{items}}",
            "page": "{{page}}",
            "pageSize": "{{pageSize}}",
            "total": "{{total}}",
            "next": "{{next}}",
            "previous": "{{previous}}",
            "hasNext": "{{hasNext}}",
            "hasPrevious": "{{hasPrevious}}"
          }
        }
      ]
    },
    "POST": {
      "nameResponse": "create",
      "request": {
        "payload": {
          "‹name›": { "type": "string", "minLength": 2 },
          "‹slug-or-email›": { "type": "string", "minLength": 2 }
        },
        "error": {
          "response": "validation-error"
        }
      },
      "responses": [
        {
          "name": "validation-error",
          "statusCode": 422,
          "body": { "message": "Invalid payload", "errors": [] }
        },
        {
          "name": "‹conflict-name›",
          "statusCode": 409,
          "body": { "code": "CONFLICT", "conflicts": "{{conflicts}}" }
        },
        { "name": "create", "statusCode": 201, "action": "create" }
      ]
    }
  },
  "api/‹tenants›/:tenantId/‹resources›/:id": {
    "store": { "id": "‹resources›" },
    "GET": {
      "nameResponse": "get",
      "responses": [{ "name": "get", "statusCode": 200, "action": "get" }]
    },
    "PATCH": {
      "nameResponse": "patch",
      "responses": [
        {
          "name": "‹conflict-name›",
          "statusCode": 409,
          "body": { "code": "CONFLICT", "conflicts": "{{conflicts}}" }
        },
        { "name": "patch", "statusCode": 200, "action": "patch" }
      ]
    },
    "DELETE": {
      "nameResponse": "remove",
      "responses": [{ "name": "remove", "statusCode": 204, "action": "delete" }]
    }
  }
}
```

Checklist when wiring a new domain:

1. **Identity** — `store.id` + `key` (simple or composite with route params).  
2. **Shape** — `template` + `seed` (+ nested objects if you filter on `a.b`).  
3. **List UX** — choose page **or** offset **or** cursor; add `filter` / `sort` / placeholders.  
4. **Writes** — `request` for shape; `unique` + named `409` responses for clashes.  
5. **Branches** — `match` for `401`/`403`/`503` before `action`.  
6. **Item routes** — reference the same `store.id`; include the same conflict response names on mutating methods.  
7. **Persist** — `"persist": true` if the UI must survive reload; document `--reset-store` for clean demos.

#### 3. Which ready-made example to copy

| Frontend you are building | Start from | What to steal |
|---------------------------|------------|---------------|
| Simple CRUD list | [Example A](#example-a--simple-notes-crud) | Minimal `list`/`create`/`get`/`delete` |
| Multi-tenant users | [Example B](#example-b--complex-multi-tenant-users) | Composite key + `request` + conflicts |
| Todo / notes app | [Example C](#example-c--real-project-todo--notes-app) | Persist + toggle-style `patch` |
| Org projects / board | [Example D](#example-d--real-project-saas-projects-board) | Slug unique + forbidden org `match` |
| Admin catalog + checkout | [Example E](#example-e--real-project-e-commerce-catalog) | Price/stock/`in`/warehouse/`or` + `402`/`429` |
| Support inbox + activity | [Example F](#example-f--real-project-multi-tenant-helpdesk) | Page + cursor + date/channel filters |
| People directory / HR | [Example G](#example-g--real-project-hr-employee-directory) | All filter ops + nested + combined query |
| Blog / CMS authors + articles | [Example H](#example-h--real-project-blog-cms-with-authors) | `relations` + soft delete + expand + restrict |
| Multi-tenant orders + line items | [Example I](#example-i--real-project-multi-tenant-orders) | Composite `join` + cascade + tenant routes |
| Auth lockout + sessions | [Example J](#example-j--real-project-auth-lockout--sessions) | `match.call` + `request` + `store` + headers |
| JWT access + refresh | [Example K](#example-k--real-project-jwt-access--refresh-tokens) | Login / refresh / logout contract + reuse detection |
| Password reset | [Example L](#example-l--real-project-password-reset) | Forgot / validate token / set new password |
| Async export job | [Example M](#example-m--real-project-async-export-job) | `202` + poll with `match.call` until ready |
| Notifications inbox | [Example N](#example-n--real-project-notifications-inbox) | Unread filter + mark read / mark all |
| Signed URL upload | [Example O](#example-o--real-project-signed-url-upload) | Initiate → complete → fetch asset metadata |
| Feature flags / config | [Example P](#example-p--real-project-feature-flags--app-config) | Boot flags + tenant overrides |
| Billing / subscription | [Example Q](#example-q--real-project-billing--subscription) | Plans, upgrade, trial, past_due |
| Onboarding wizard | [Example R](#example-r--real-project-onboarding-wizard) | Multi-step save + resume |

More product scenarios (auth, RBAC, webhooks, proxy) live under [Real-world projects](real-world.md#real-world-projects-).

### How it works

1. Put `store` at **endpoint level** (sibling of `GET` / `POST` / …, not inside a method).
2. Define the collection **once** (full object with `id`, optional `key` / `seed` / `template` / `unique` / `persist`).
3. Other routes that share data use the **reference** form: `"store": { "id": "notes" }`.
4. On each response you want to mutate/read the collection, set `"action": "list" | "get" | "create" | "update" | "patch" | "delete"`.

Request pipeline (fixed order):

1. `request` validation (if any) → may return `error.response` and **never** hits the store  
2. `match` → picks a response (`nameResponse` fallback)  
3. `delay` (once)  
4. Exactly one of `proxy` / `action` / static `body`(+optional `encoding`) on the same response  
5. otherwise static `body`

### Actions

| Action | Behavior | Success status | Common errors |
|--------|----------|----------------|---------------|
| `list` | Returns items. Filters by route `key` params. List engine on by default (omit / `true` / object): filter (`fields`/`or`/`search`) → multi-sort → page/offset/cursor. `"list": false` returns a plain full array. Optional `body`/`headers` templates. Soft-deleted items omitted unless `?includeDeleted=true` | response `statusCode` | `400` (invalid page/sort/order/cursor/filter query) |
| `get` | Loads one item; all `key` fields must come from route params. Soft-deleted → `404` unless `?includeDeleted=true` | response `statusCode` | `404` (default or `store.notFound`) |
| `create` | Inserts; merges `template` + body; auto-generates missing numeric key fields; route params override key fields. Soft-deleted rows do not count toward `unique`/`key` | typically `201` | `400` (body not object), `409` (conflict) |
| `update` | Full replace (`template` + body), preserves existing key. Soft-deleted → `404` | response `statusCode` | `404` / `400` / `409` |
| `patch` | Partial merge on existing item (no template), preserves key. Soft-deleted → `404` | response `statusCode` | `404` / `400` / `409` |
| `delete` | Without `softDelete`: removes item. With `softDelete`: sets the delete field (ISO) and keeps the row. Runs `relations.onDelete` on dependents first. **Always** `204` with empty body on success (`statusCode` in JSON is ignored, warning if ≠ 204) | `204` | `404` / `409` (restrict) |
| `restore` | Requires `store.softDelete`. Clears the delete field and returns the item. Soft-deleted-only; active or missing → `404` | response `statusCode` | `404` / `409` |

Rules for `action`:

- Requires `store` on the endpoint  
- Cannot be combined with `proxy` on the same response  
- `body` is optional; ignored with warning for actions other than `list`  
- For `list`, `body` and `headers` may be templates with placeholders (see below)  
- Returned items are **clones** (mutating the HTTP response does not mutate the store)
- `restore` is only valid when the store definition has `softDelete`

### Soft delete

Soft delete means: **the item stays in the collection**, but is marked deleted (default field `deletedAt` = ISO timestamp). Clients that call `list` / `get` / `update` / `patch` treat it as gone, unless they ask for trash with `?includeDeleted=true` (or `1`). `action: "restore"` clears the mark.

#### Why it lives on `store`, not on the HTTP `DELETE`

`softDelete` is a property of the **collection**, not of one route:

1. **Same data, many verbs.** After a soft delete, `list` must hide the row, `get`/`patch` must 404, and `unique` must free the email/title. That logic belongs to the store that holds the rows, not to the `DELETE` response alone.
2. **`DELETE` only triggers the action.** The HTTP method still uses `"action": "delete"`. With soft delete on, that action **marks**; without it, that action **removes**. Same verb, different store policy.
3. **One policy per `store.id`.** Every endpoint that references `{ "id": "notes" }` shares the same in-memory Map. Putting soft delete on the store definition once keeps list/get/delete/restore consistent. Putting it only on the `DELETE` response would leave other actions unaware.

So: configure `"softDelete": true` (or `{ "field": "deletedAt" }`) on the **full store definition**. The `DELETE` endpoint does not need a special soft-delete flag — only `"action": "delete"` and a `store` that already has soft delete enabled.

#### Why a single endpoint is enough

You do **not** need `GET` list + `POST` create + `DELETE` for soft delete to work. Soft delete only needs:

1. A store definition with `softDelete` (and usually `seed`, or a `create` route, so there is something to delete).
2. A response with `"action": "delete"`.

Example — delete-only mock:

```json
"api/notes/:id": {
  "store": {
    "id": "notes",
    "softDelete": true,
    "seed": [{ "id": 1, "title": "Keep" }]
  },
  "DELETE": {
    "nameResponse": "remove",
    "responses": [
      { "name": "remove", "statusCode": 204, "action": "delete" }
    ]
  }
}
```

`DELETE /api/notes/1` returns 204 and sets `deletedAt` on that row. There is no list route here, so you cannot “see” the trash over HTTP until you add `get`/`list`/`restore` — but the soft delete **did** run in the store.

When you **do** share the store across routes (`api/notes` + `api/notes/:id`), keep **one** full definition (with `softDelete`) and use `{ "id": "notes" }` elsewhere — see [Schema (definition vs reference)](#schema-definition-vs-reference). Do not add `softDelete` on a reference; that becomes a second definition and fails startup.

#### Behavior

```json
"store": {
  "id": "notes",
  "softDelete": true
}
```

or `"softDelete": { "field": "deletedAt" }`.

| | Without `softDelete` | With `softDelete: true` |
|--|----------------------|-------------------------|
| `action: "delete"` | Removes the item | Keeps the item and sets `deletedAt` (ISO) |
| `list` / `get` | Normal | Soft-deleted items hidden (unless `?includeDeleted=true` or `1`) |
| `update` / `patch` | Normal | Soft-deleted → `404` |
| `unique` / `key` | Counts all items | Soft-deleted ignored (values free to reuse) |
| `action: "restore"` | Invalid | Clears `deletedAt` and returns the item |

Also:

- Absent/`null` delete field = active. Soft-deleting an already soft-deleted item → `404`.
- Persist keeps soft-deleted rows as-is (same file format).

### Relations

Opt-in links between stores: `type: "one"` (FK) and `type: "many"` (reverse embed). Targets may use a **simple or composite** store `key`.

#### `type: "one"` (default)

```json
"relations": {
  "userId": {
    "store": "users",
    "join": { "from": "userId", "to": "id" },
    "required": true,
    "onDelete": {
      "action": "restrict",
      "conflict": { "response": "has-posts" }
    },
    "embed": { "as": "user" },
    "conflict": {
      "response": "invalid-user",
      "detail": { "field": "{{field}}", "value": "{{value}}" }
    }
  },
  "orderRef": {
    "store": "orders",
    "join": {
      "from": ["tenantId", "orderId"],
      "to": ["tenantId", "id"]
    },
    "required": true,
    "onDelete": "cascade",
    "embed": "order"
  }
}
```

Shorthand: `"userId": "users"` → `type: "one"`, `join.from = "userId"`, `to` = target key, `required: false`, `onDelete: "restrict"`, default embed key `userId$`.

| Field | Default | Notes |
|-------|---------|-------|
| `type` | `"one"` | `"one"` = FK; `"many"` = reverse collection embed only |
| `store` | — | Target `store.id` (required) |
| `join.from` | relation name | Column(s) on **this** store (`string` or `string[]`) |
| `join.to` | target’s key | Column(s) on the referenced store; required when the target `key` is composite; must match that key |
| `required` | `false` | All `from` parts missing → error when `true` (`one` only). Partial `from` values also fail FK checks |
| `onDelete` | `"restrict"` | String `restrict`/`cascade`/`setNull`, **or** `{ "action", "conflict?" }` (`one` only; `setNull` not with `required: true`) |
| `embed` | `‹name›$` | String or `{ "as": "…" }` — property name when expanding; cannot equal a `join.from` field |
| `conflict` | default `409` | Invalid/missing FK on write (`one` only) |

`onDelete.conflict` (or top-level `conflict` as fallback) is used when **`action: "restrict"`** blocks deleting the parent. That named response must exist on the **parent** store’s `delete` method.

#### `type: "many"`

Declared on the **parent**. Embed-only (no write FK checks, no `onDelete`).

```json
"relations": {
  "posts": {
    "type": "many",
    "store": "posts",
    "join": { "from": "userId" },
    "embed": { "as": "posts" }
  }
}
```

| Field | Notes |
|-------|--------|
| `join.from` | Child column(s) that point at this store’s key (`string` or `string[]`; length must match). No `join.to` on `many` |
| Integrity | Child store must declare a `type: "one"` whose `join.from` equals this `join.from` and targets this store |

#### Expand

- Flat: `?expand=user` / `?expand=userId,posts`
- Nested (max depth **3**): `?expand=posts.user`
- Matching aliases per relation: relation **name**, `embed` / `embed.as`, and (for simple `one`) the single `join.from` field
- Soft-deleted related `one` → `null` (unless `?includeDeleted=true`); soft-deleted `many` children omitted the same way
- Soft-deleted children do **not** block `onDelete: "restrict"`
- `onDelete` runs in two phases: all `restrict` checks (including through `cascade` chains) first; only then `setNull` / `cascade` mutations. A blocked delete never leaves partial side effects.
- `cascade` is recursive (grandchildren included) and supports self-referential FKs on the same store
- Cycles are skipped (no infinite recursion)

#### Walkthrough (HTTP)

1. **Invalid FK** — `POST /api/posts` `{ "title": "X", "userId": 999 }` → status/body from `conflict.response` (e.g. `422` + `INVALID_USER`).
2. **Expand one** — `GET /api/posts/1?expand=user` → post plus `"user": { "id": 1, "name": "Ada" }`.
3. **Expand many + nested** — `GET /api/users/1?expand=posts.user` → user plus `posts: [...]`, each post with nested `user`.
4. **Restrict** — `DELETE /api/users/2` while posts reference them → `onDelete.conflict` on the users DELETE method (e.g. `409` + `HAS_POSTS`).
5. **Composite join** — `GET /api/acme/order-items/1?expand=order` embeds the order keyed by `(tenantId, id)`.

Behavior summary:

1. **Write** — only `type: "one"` validates FKs on create/update/patch/restore.
2. **Expand** — `one` embeds an object (or `null`); `many` embeds an array.
3. **onDelete** — only from child `one` relations (including composite joins and self-refs). `restrict` is evaluated before any mutation; `cascade` walks the dependent graph.
4. **Startup** — unknown targets, mismatched `join.from`/`join.to`, missing reverse for `many`, bad seed FKs, missing named conflict responses → fail boot.

### Schema (definition vs reference)

Think of `store.id` as the collection name. **Configure it once; point at it everywhere else.**

**Full definition** — all config for that collection, **only once** per `id` in the whole mock set:

```json
"store": {
  "id": "notes",
  "key": "id",
  "seed": [],
  "template": { "id": 0, "title": "", "done": false },
  "unique": ["title"],
  "persist": true,
  "list": true,
  "softDelete": true
}
```

**Reference** — other endpoints that share the same collection. **Only** `id` is allowed:

```json
"store": { "id": "notes" }
```

If you add any other key on a reference (`softDelete`, `seed`, `unique`, …), it becomes a second full definition → startup error (`store already defined`).

Right:

```json
"api/notes": {
  "store": { "id": "notes", "softDelete": true, "seed": [...] }
},
"api/notes/:id": {
  "store": { "id": "notes" },
  "DELETE": { "responses": [{ "action": "delete", ... }] }
}
```

Wrong (splits config / two definitions):

```json
"api/notes": {
  "store": { "id": "notes", "seed": [...] }
},
"api/notes/:id": {
  "store": { "id": "notes", "softDelete": true }
}
```

Also fine: put the **entire** full definition on `api/notes/:id` and use `{ "id": "notes" }` on `api/notes` — same rule, one definition only.

| Field | Default | Notes |
|-------|---------|-------|
| `id` | — | Required. Collection name in memory (and default persist filename) |
| `key` | `"id"` | String, string array, or `{ "field" }` / `{ "fields", "conflict?" }` — not both `field` and `fields` |
| `seed` | `[]` | Initial rows. Optional. Every seed item must include all key fields; no duplicate key/unique values. Omit/`[]` → empty until `create` or a persist snapshot |
| `template` | — | Defaults for `create` / `update`. Values on key fields are placeholders unless the client sends them |
| `unique` | — | `["email"]` or `{ "fields": [...], "conflict": { "response", "detail" } }` |
| `persist` | off | `true` / `{ "enabled": true, "file?": "relative/path.json" }` |
| `list` | on (page defaults) | Omit / `true` / `{}` / object — sort (multi), page/offset/cursor, filters/search for `action: "list"`. `false` → plain full array (see [Filters / search](#filters--search) and [List sort and pagination](#list-sort-and-pagination-storelist)) |
| `softDelete` | off | `true` / `{ "field": "deletedAt" }` — on the full definition only; see [Soft delete](#soft-delete) |
| `relations` | off | `{ "userId": "users" }` or object map — FK / reverse embed; see [Relations](#relations) |
| `notFound` | off | `{ "response": "missing-user" }` — named `404` for missing / soft-deleted items; see [Not found](#not-found-404) |

Rules:

1. `store` is **not** an HTTP method; the endpoint still needs at least one verb (`GET`, `POST`, …).
2. Unknown keys inside `store` → startup error.
3. Several endpoints may share the same `store.id`; the full definition can appear only once. All of `key` / `seed` / `template` / `unique` / `persist` / `list` / `softDelete` / `relations` / `notFound` belong on that one definition.
4. A reference is **only** `{ "id": "..." }`. Any other property = full definition (and will conflict if that `id` is already defined).
5. A reference to an undefined `id` → startup error.
6. `seed` must be an array of objects (when present). `[]` or omitted → empty collection at start (unless a persist snapshot loads).
7. `unique.fields` must be non-empty. Each entry is a non-empty string, `{ "field", "conflict?" }`, or `{ "fields": ["a","b"], "conflict?" }` (composite unique).
8. `conflict` objects only allow `response` and `detail`.
9. `conflict.detail` is a non-empty string **or** a non-empty object whose values are strings (templates).
10. Named `conflict.response` values must exist in `responses` of every method that uses mutating actions (`create` / `update` / `patch` / `restore`) for that store (includes relation `conflict`). Named `onDelete.conflict.response` (or relation `conflict` when used as restrict fallback) must exist on every method with `action: "delete"` of the **target** store.
11. In a unique entry object, `field` and `fields` are mutually exclusive.
12. Named `notFound.response` must exist in `responses` of every method that uses `get` / `update` / `patch` / `delete` / `restore` for that store.

`key` shapes:

```json
"key": "id"
"key": ["tenantId", "id"]
"key": { "field": "id", "conflict": { "response": "duplicate-key" } }
"key": { "fields": ["tenantId", "id"], "conflict": { "response": "duplicate-key" } }
```

`unique` shapes:

```json
"unique": ["email", "username"]
"unique": {
  "fields": [
    "email",
    { "field": "username", "conflict": { "response": "duplicate-username" } },
    {
      "fields": ["tenantId", "email"],
      "conflict": { "response": "duplicate-tenant-email" }
    }
  ],
  "conflict": {
    "response": "duplicate-fields",
    "detail": { "campo": "{{field}}", "campos": "{{fields}}", "valor": "{{value}}" }
  }
}
```

Composite unique (`{ "fields": ["tenantId", "email"] }`) requires **all** listed fields to be present on the item to evaluate. Same email under another `tenantId` is allowed. `{{field}}` becomes `"tenantId+email"`; `{{fields}}` is `["tenantId","email"]`; `{{value}}` is the JSON array of values.
### Key generation on `create`

Merge order, then key resolution for each key field:

1. `base = { ...template, ...body }`
2. If the field is present in **route params** → use the param (params win over body). Pure numeric strings are coerced to numbers (`"12"` → `12`; `"12a"` stays a string).
3. Else if the field is present in the **body** → keep the body value (template placeholders for that key field are ignored).
4. Else → **auto-generate** a number: among items that share the other key fields (“siblings”), take `max(field) + 1`, or `1` if none.

Examples:

- `POST /api/notes` with `{ "title": "A" }` and `key: "id"` → `id` becomes `1`, then `2`, …
- `POST /api/acme/users` with composite key `["tenantId","id"]` → `tenantId` from params, next `id` among that tenant only

### `update` vs `patch`

| | `update` (PUT) | `patch` |
|--|----------------|---------|
| Merge | `{ ...template, ...body }` | `{ ...existing, ...body }` |
| Key fields | Always forced back to the existing item’s key (cannot change PK via body) | Same |
| Missing fields | Come from template (then body) | Kept from the existing item |

### Conflicts (`409`)

Checked on `create` / `update` / `patch` (not on `list` / `get` / `delete`):

1. Primary-key collision (for `update`/`patch`, the current item is ignored).
2. Each `unique` field present on the item — compared with `String(value)` (so `1` and `"1"` collide).

**All** conflicts are collected; there is no “stop at first” mode.

Which named response / `detail` is used:

| Situation | Response / detail source |
|-----------|--------------------------|
| Only key conflict(s) | `key.conflict` if set; else default `409` |
| Exactly one unique conflict (and no key conflict) | That field’s `fields[].conflict` if set; else `unique.conflict`; else default |
| Multiple conflicts (any mix) | `unique.conflict`, falling back to `key.conflict`; else default |
| No `conflict.response` configured | Default body below |

Default conflict response:

```json
{
  "message": "Duplicate value(s)",
  "conflicts": [
    { "field": "email", "value": "a@b.com", "message": "Duplicate value for unique field \"email\"" }
  ]
}
```

Status `409`. For a composite key conflict, `field` is the key fields joined with `+` (e.g. `"tenantId+id"`).

Placeholders in the **named** conflict response `body` (deep replace):

| Placeholder | Meaning |
|-------------|---------|
| `{{conflicts}}` as the **entire** property value | Replaced by an array shaped by `conflict.detail` (not a JSON string) |
| `{{conflicts}}` inside a larger string | Replaced by `JSON.stringify(...)` of that array |
| `{{field}}` / `{{value}}` / `{{message}}` | First conflict only |
| `{{fields}}` | JSON array of field names for the first conflict (`["email"]` or `["tenantId","email"]`) |

`conflict.detail` shaping of each conflict entry:

| `detail` | Each conflict becomes |
|----------|------------------------|
| omitted | `{ "field", "value", "message" }` |
| string template | that string with placeholders applied |
| object of string templates | same keys; each value is a template |

Headers from the selected conflict response are applied. `delay` already ran once before the action (including when the result is a conflict).

### Not found (`404`)

Optional. Without `store.notFound`, missing items (and soft-deleted items treated as missing) keep the default:

```json
{ "message": "Not found" }
```

Status `404`.

With config:

```json
"notFound": {
  "response": "missing-user"
}
```

```json
{
  "name": "missing-user",
  "statusCode": 404,
  "body": {
    "code": "USER_NOT_FOUND",
    "message": "User {{id}} was not found in tenant {{tenantId}}",
    "key": "{{key}}"
  }
}
```

Applies to `get` / `update` / `patch` / `delete` / `restore` when the item is missing or soft-deleted (and not requested with `?includeDeleted=true` for `get`). Soft-deleted “missing” paths use the same named response.

Placeholders in the named notFound response `body` / `headers` (deep replace):

| Placeholder | Meaning |
|-------------|---------|
| `{{<keyField>}}` | Value of each `store.key` field from route params (e.g. `{{id}}`, `{{tenantId}}`) |
| `{{key}}` | Full key as fields joined with `+` (e.g. `"acme+42"`) |
| `{{message}}` | Default message (`"Not found"`) |

`notFound` only allows `response` (no `detail` — the response body is the template). The named response must exist on every method that can return store `404` for that store.

### Persist and restart behavior

| Mode | On `mock-server start` / watch reload |
|------|----------------------------------------|
| No `persist` | Registry rebuilt from `seed` every time |
| `persist: true` / `{ "enabled": true }` | Loads `.store/<id>.json` under the mock files root if present and valid; otherwise `seed`. Successful mutations rewrite the snapshot |
| `{ "enabled": true, "file": "..." }` | Same, but custom path **relative** to the mock files root (no absolute paths, no `..`) |
| `false` / `{ "enabled": false }` | Same as no persist |

Snapshot file shape:

```json
{
  "items": [ { "id": 1, "title": "A" } ]
}
```

Behavior details:

1. Write is atomic: write `*.tmp`, then rename over the target.
2. Your mock JSON definition files are **never** modified by persist.
3. If a write fails, the server logs `Failed to persist store "<id>": ...` and **keeps the in-memory mutation** (the HTTP response still succeeds).
4. Invalid snapshot at startup (bad JSON, missing `items` array, non-object items, missing key fields, duplicate key/unique) → **startup fails** (server does not start).
5. Watcher ignores `.store/**`, custom persist files, their `.tmp` siblings, and custom parent dirs (when those dirs are not the mock files root), so persist I/O does not restart the server.
6. `--reset-store` deletes persist files **only on the initial CLI start**, then loads from `seed`. Watch reloads do **not** re-apply `--reset-store`.

```bash
mock-server start --reset-store              # clear all persist files, then start from seed
mock-server start --reset-store notes,users  # clear only those store ids
```

You can also delete `.store/<id>.json` (or your custom file) manually before start.

### Runtime HTTP statuses

| Case | Status | Body |
|------|--------|------|
| `list` / `get` / `create` / `update` / `patch` success | Response `statusCode` (use `201` for create if you want) | Cloned item or array; response `headers` applied |
| `delete` success | Always `204` | Empty (`null`); JSON `statusCode` ignored |
| Item not found (`get` / `update` / `patch` / `delete` / `restore`) | `404` or status of `store.notFound.response` | Default `{ "message": "Not found" }` or named body (see [Not found](#not-found-404)) |
| Body of `create` / `update` / `patch` is not a JSON object | `400` | `{ "message": "Request body must be a JSON object" }` |
| Key / unique conflict | `409` or status of the named conflict response | Default or named conflict body (see above) |
| Invalid relation FK | status of `relations.*.conflict.response` (else `409`) | Named body + `{{conflicts}}` / `detail` templates |
| Parent delete blocked (`onDelete` restrict) | status of `onDelete.conflict.response` (else `conflict`, else `409`) | Named body on the **parent** DELETE method |
| `request` validation failed | Your `error.response` (or generic `400`) | Never reaches the store |
| `match` selected a static response (no `action`) | That response’s status/body | Store is not called |

Implications of the pipeline:

- `match` can return a static `401`/`403`/etc. on an endpoint that also has store actions.
- `action` and `proxy` cannot share the same response.
- `delay` runs once before the action; conflicts / `404` / `400` do not wait again.
- Response bodies from the store are deep clones; mutating them in the client does not change memory.

### Coexistence with other features

| Feature | Relationship |
|---------|--------------|
| `request` | Validates input **before** the store. Use it for types/format/`minLength`; use `unique` for business uniqueness |
| `match` | Chooses which response runs; may skip `action` entirely |
| `delay` / `headers` | Applied to action success, named conflict responses, and named notFound responses |
| `proxy` | Incompatible with `action` on the same response |
| Watch / restart | Without persist → back to `seed`. With persist → reload snapshot (unless `--reset-store` on initial start) |

### List sort and pagination (`store.list`)

Configured on the **full store definition** only (not on `{ "id": "..." }` references).  
Requires `action: "list"`. Omitting `store.list` (or setting `true` / `{}`) enables the list engine in **page mode** with defaults. Set `"list": false` to return a plain full array (optionally filtered by route params that overlap `key`).

Static mocks (`match` + fixed `body`) are unrelated: they do **not** use this engine.

#### Pipeline

1. Filter by route params that match `store.key` fields (e.g. `:tenantId`)
2. Apply `store.list.filter`: `fields` (AND) → `or` → `search` (if configured)
3. Multi-sort
4. Paginate: **page** | **offset** | **cursor**
5. If the response has `body` and/or `headers`, apply list placeholders; otherwise return the items array (current page only when the engine is on)

#### Shortcuts

```json
"list": true
"list": {}
"list": false
```

Omitting `list`, `true`, and `{}` enable **page mode** with defaults. `false` disables the list engine (plain full array).

| Option | Default |
|--------|---------|
| `page` query | `page`, default `1` |
| `pageSize` query | `pageSize`, default `10`, max `100`, alias `limit` |
| `sort` query | `sort`, default `"id"` (no field whitelist) |
| `order` query | `order`, default `"asc"` |

#### Config fields

| Key | Type | Meaning |
|-----|------|---------|
| `page` | `{ query?, default? }` | 1-based page (`default` ≥ 1) |
| `pageSize` | `{ query?, default?, max?, aliases? }` | Page size (`default`/`max` ≥ 1; `aliases` e.g. `["limit"]`) |
| `offset` | `{ query?, default? }` | 0-based offset (`default` ≥ 0) |
| `limit` | `{ query?, default?, max? }` | Offset-mode page size |
| `cursor` | `true` \| `{ query?, limit? }` | Cursor/keyset mode (see below) |
| `sort` | `{ query?, default?, fields? }` | Sort query name, default expression, optional whitelist |
| `order` | `{ query?, default? }` | `"asc"` \| `"desc"` — default direction for unsigned sort fields |
| `filter` | `string[]` \| `{ fields?, or?, search? }` | `eq`/`ne`/`gt`/`gte`/`lt`/`lte`/`in`, nested paths, OR group, search |

Unknown keys under `store.list` → startup error.

#### Page mode

```json
"list": {
  "page": { "query": "page", "default": 1 },
  "pageSize": {
    "query": "pageSize",
    "default": 10,
    "max": 100,
    "aliases": ["limit"]
  },
  "sort": { "query": "sort", "default": "id", "fields": ["id", "name", "price"] },
  "order": { "query": "order", "default": "asc" }
}
```

`offset` used internally = `(page - 1) * pageSize`.

#### Offset mode

Declare `offset` / `limit` **without** `page` / `pageSize` (unless you intentionally combine modes — see priority):

```json
"list": {
  "offset": { "query": "offset", "default": 0 },
  "limit": { "query": "limit", "default": 10, "max": 100 },
  "sort": { "query": "sort", "default": "id" },
  "order": { "query": "order", "default": "asc" }
}
```

#### Cursor / keyset mode (Stripe-style)

A **cursor** is an opaque bookmark (“continue after this item”), not a page number.

```json
"list": {
  "cursor": {
    "query": "starting_after",
    "limit": { "query": "limit", "default": 10, "max": 100 }
  },
  "sort": { "query": "sort", "default": "-meta.score", "fields": ["meta.score", "id"] }
}
```

| Form | Effect |
|------|--------|
| `"cursor": true` | Query name `cursor`; limit query `limit` (default `10`, max `100`) |
| `"cursor": { "query", "limit" }` | Custom query names / defaults |

- Token is **base64url** JSON of sort values + primary `key` values (stable tie-break). Nested sort paths (e.g. `meta.score`) are included the same way as top-level fields.
- Request: `?starting_after=<token>&limit=10` (names from config).
- Response placeholders: `{{nextCursor}}`, `{{hasMore}}`, and `{{next}}` (URL with the next cursor).
- There is no `ending_before` (forward-only).
- Invalid / empty / mismatched cursor → `400`.

#### Which pagination mode runs?

When several styles are configured:

1. **Page** if `page` / `pageSize` (or a `pageSize` alias) appear in the query, **or** neither offset nor cursor params are present and page config exists (page is the default when configured).
2. Else **offset** if `offset` / `limit` appear, **or** offset is configured and cursor is not.
3. Else **cursor** if `store.list.cursor` is configured.
4. If only `cursor` is configured (no page/offset), cursor mode is used (page defaults are **not** injected).

Example config with **all three** modes (use distinct limit query names so they do not collide):

```json
"list": {
  "page": { "query": "page", "default": 1 },
  "pageSize": { "query": "pageSize", "default": 2, "max": 10 },
  "offset": { "query": "offset", "default": 0 },
  "limit": { "query": "limit", "default": 2, "max": 10 },
  "cursor": {
    "query": "starting_after",
    "limit": { "query": "cursorLimit", "default": 2, "max": 10 }
  },
  "sort": { "query": "sort", "default": "id", "fields": ["id"] }
}
```

| Request | Mode that runs | Why |
|---------|----------------|-----|
| `(none)` | **page** | No offset/cursor params → page default |
| `?offset=2` | **offset** | Offset param present; no page params |
| `?page=2&offset=0` | **page** | Page wins over offset |
| `?starting_after=<token>` | **cursor** | Cursor param present; no page/offset |
| `?offset=1&starting_after=<token>` | **offset** | Offset wins over cursor |
| `?starting_after=%%%` | **400** | Invalid cursor token |

Try:

```bash
# Default → page (look for page= / {{page}} in the envelope)
curl -s 'http://localhost:3000/api/mixed'

# Offset mode
curl -s 'http://localhost:3000/api/mixed?offset=2'

# Page wins when both are present
curl -s 'http://localhost:3000/api/mixed?page=2&offset=0'

# Cursor mode (token from a previous {{nextCursor}} / keyset bookmark)
curl -s "http://localhost:3000/api/mixed?starting_after=${TOKEN}"

# Offset wins over cursor
curl -s "http://localhost:3000/api/mixed?offset=1&starting_after=${TOKEN}"

# Bad cursor → 400
curl -si 'http://localhost:3000/api/mixed?starting_after=placeholder'
```

Tip: avoid giving `pageSize` the alias `limit` if the same store also defines offset `limit` — prefer `pageSize` + `limit` + `cursorLimit` as separate names.

#### Filters / search

Opt-in under `store.list.filter`. Only runs for `action: "list"`.  
Rules read **query params**; if a rule’s query param is omitted, that rule is skipped (no error).

**Shapes**

| Shape | Example | Meaning |
|-------|---------|---------|
| String array | `"filter": ["status", "role"]` | AND equality; each string = `{ field, op: "eq", query: <same name> }` |
| Object | `"filter": { "fields?", "or?", "search?" }` | Full control; must include at least one of `fields`, `or`, `search` |

**Rule object**

```json
{ "field": "price", "op": "gte", "query": "minPrice" }
```

| Property | Required | Default | Meaning |
|----------|----------|---------|---------|
| `field` | yes | — | Item path (supports dots: `meta.region`) |
| `op` | no | `"eq"` | Operator (see table below) |
| `query` | no | same as `field` | Query param name that supplies the compare value |

String shorthand inside `fields` / `or`:

```json
"status"
```

is equivalent to:

```json
{ "field": "status", "op": "eq", "query": "status" }
```

**Operators (`op`)**

| `op` | Query example | Keeps item when… | Notes |
|------|---------------|------------------|--------|
| `eq` | `?status=active` | `String(value) === query` | Default; missing/`null` field → drop |
| `ne` | `?excludeStatus=draft` | value ≠ query | Missing/`null` field → **keep** |
| `gt` | `?gtPrice=20` | value > N | Query must be a number → else `400` |
| `gte` | `?minPrice=10` | value ≥ N | Same |
| `lt` | `?ltPrice=10` | value < N | Same |
| `lte` | `?maxPrice=30` | value ≤ N | Same |
| `in` | `?tag=a,b` or `?tag=a&tag=b` | `String(value)` ∈ list | CSV and/or repeated params; empty list → `400` |

Numeric ops coerce the query with `Number(...)`. Item values use the same compare rules as sort (numbers, numeric strings, then locale string compare).

**Nested paths**

`field` (and `search.fields`, and `sort` fields) may use `.` to walk objects:

```json
{ "id": 1, "meta": { "region": "eu" } }
```

```json
{ "field": "meta.region", "op": "eq", "query": "region" }
```

`?region=eu` keeps that item. Missing intermediate keys → value is `undefined` (fails `eq` / range / `in`; passes `ne`).

The same dotted paths work in `?sort=meta.region` and in cursor bookmarks when the active sort uses them.

**`fields` (AND)**

Every rule whose query param is present must match.

```json
"fields": [
  "status",
  { "field": "price", "op": "gte", "query": "minPrice" },
  { "field": "price", "op": "lte", "query": "maxPrice" }
]
```

`?status=active&minPrice=10&maxPrice=30` → active **and** `10 ≤ price ≤ 30`.

**`or` (OR among present params)**

Same rule shape as `fields`. After AND rules:

1. Collect `or` rules whose query param is present (and valid).
2. If that set is empty → skip OR (no extra filtering).
3. Else keep items that match **at least one** of those rules.

```json
"or": [
  { "field": "status", "op": "eq", "query": "anyStatus" },
  { "field": "meta.region", "op": "eq", "query": "anyRegion" }
]
```

| Request | Effect |
|---------|--------|
| (neither param) | OR ignored |
| `?anyStatus=draft` | status is `draft` |
| `?anyRegion=latam` | `meta.region` is `latam` |
| `?anyStatus=draft&anyRegion=latam` | draft **or** latam |

**`search` (text)**

```json
"search": { "query": "q", "fields": ["name", "meta.region"] }
```

| Option | Default | Behavior |
|--------|---------|----------|
| `query` | `"q"` | Query param with the search term |
| `fields` | required | Case-insensitive **substring** match; item kept if **any** field matches |

Empty / omitted search term → search skipped. Nested paths allowed in `fields`.

**Full example**

```json
"list": {
  "page": { "query": "page", "default": 1 },
  "pageSize": { "query": "pageSize", "default": 10, "max": 50, "aliases": ["limit"] },
  "sort": { "query": "sort", "default": "id", "fields": ["id", "name", "price", "meta.region"] },
  "filter": {
    "fields": [
      "status",
      { "field": "price", "op": "gte", "query": "minPrice" },
      { "field": "price", "op": "lte", "query": "maxPrice" },
      { "field": "price", "op": "gt", "query": "gtPrice" },
      { "field": "price", "op": "lt", "query": "ltPrice" },
      { "field": "status", "op": "ne", "query": "excludeStatus" },
      { "field": "name", "op": "in", "query": "name" },
      { "field": "meta.region", "op": "eq", "query": "region" }
    ],
    "or": [
      { "field": "status", "op": "eq", "query": "anyStatus" },
      { "field": "meta.region", "op": "eq", "query": "anyRegion" }
    ],
    "search": { "query": "q", "fields": ["name", "meta.region"] }
  }
}
```

Try (happy path):

```bash
# AND equality + range
curl -s 'http://localhost:3000/api/products?status=active&minPrice=10&maxPrice=30'

# Exclusive bounds
curl -s 'http://localhost:3000/api/products?gtPrice=20&ltPrice=40'

# Not equal
curl -s 'http://localhost:3000/api/products?excludeStatus=draft'

# Membership (CSV or repeated)
curl -s 'http://localhost:3000/api/products?name=Alpha,Charlie'
curl -s 'http://localhost:3000/api/products?name=Alpha&name=Echo'

# Nested path (match)
curl -s 'http://localhost:3000/api/products?region=eu'

# Nested sort
curl -s 'http://localhost:3000/api/products?sort=meta.region&order=asc&pageSize=10'

# Nested path (no match) → empty page, total 0 (not an error)
curl -s 'http://localhost:3000/api/products?region=antarctica'

# OR omitted → no OR filtering (full list subject to other rules)
curl -s 'http://localhost:3000/api/products?pageSize=10'

# OR single / multi
curl -s 'http://localhost:3000/api/products?anyRegion=eu'
curl -s 'http://localhost:3000/api/products?anyStatus=draft&anyRegion=latam'

# Text search
curl -s 'http://localhost:3000/api/products?q=cha'
```

Try (sad path → `400`):

```bash
# Non-numeric compare ops
curl -si 'http://localhost:3000/api/products?minPrice=abc'
curl -si 'http://localhost:3000/api/products?maxPrice=nan'
curl -si 'http://localhost:3000/api/products?gtPrice=x'

# Present but empty string
curl -si 'http://localhost:3000/api/products?ltPrice='
curl -si 'http://localhost:3000/api/products?status='

# in with no values after split/trim
curl -si 'http://localhost:3000/api/products?name='

# Example bodies:
# { "message": "Query \"minPrice\" must be a number" }
# { "message": "Query \"status\" must not be empty" }
# { "message": "Query \"name\" must not be empty" }
```

**Filter evaluation order**

1. Route `key` params (outside `filter`, always on)
2. `fields` — AND of present rules
3. `or` — if any OR query present, OR of those rules
4. `search` — if term non-empty
5. Then sort → pagination

`{{total}}` (and `X-Total-Count` if you template it) is the count **after** all filters, **before** pagination.

**Runtime `400` from filters**

| Condition | Try | Example message |
|-----------|-----|-----------------|
| `gt` / `gte` / `lt` / `lte` not a number | `?minPrice=abc` | `Query "minPrice" must be a number` |
| Present but empty string | `?status=` | `Query "status" must not be empty` |
| `in` present but no values after split/trim | `?name=` | `Query "name" must not be empty` |

Omitted params are **not** errors (rule skipped). Unknown region / no matches → `200` with empty `items` and `total: 0`.

**Startup validation (filter)**

- Top-level `filter` must be a non-empty string array **or** an object.
- Object keys only: `fields`, `or`, `search`.
- `fields` / `or`: non-empty array of strings or `{ field, op?, query? }`.
- `op` must be one of: `eq`, `ne`, `gt`, `gte`, `lt`, `lte`, `in`.
- Object must include at least one of `fields`, `or`, `search`.

Invalid shapes (server refuses to start):

```json
"filter": { "fields": [{ "field": "price", "op": "between" }] }
```

→ `The "store.list.filter.fields[0].op" must be one of: eq, ne, gt, gte, lt, lte, in`

```json
"filter": { "or": [] }
```

→ `The "store.list.filter.or" must be a non-empty array of strings or field objects`

```json
"filter": { "or": [{ "op": "eq", "query": "status" }] }
```

→ `The "store.list.filter.or[0].field" must be a non-empty string`

#### Multi-sort

`sort` accepts one or more comma-separated fields (including nested paths like `meta.region`). If `sort.fields` is set, every field must be in that whitelist.

| Form | Example | Effect |
|------|---------|--------|
| Field + `order` | `?sort=name&order=desc` | Single field; direction from `order` |
| Signed prefix | `?sort=-price,+name` | `price` desc, then `name` asc (`+` optional for asc) |
| Explicit | `?sort=price:desc,name:asc` | Same, per-field direction |
| Nested | `?sort=meta.region&order=asc` | Sort by dotted path |
| Default expression | `"default": "-meta.score"` in config | Used when the client omits `sort` |

`{{sort}}` echoes the active sort string. `{{order}}` is the direction of the **first** sort field.

#### Runtime errors (`400`)

Invalid integers / out of range for `page`, `pageSize`, `offset`, `limit`; invalid `order`; sort field outside whitelist; invalid cursor; non-numeric `gt`/`gte`/`lt`/`lte`; empty `in` / empty filter query →:

```json
{ "message": "Query \"sort\" field must be one of: id, name, price, meta.region" }
```

(Exact message depends on the failing query.)

#### Response templates (fully customizable)

On `action: "list"`, `body` and header **values** are templates.  
Exact string `"{{items}}"` / `"{{total}}"` / … is replaced by the typed value (`array` / `number` / `null` / …).  
Placeholders embedded in a longer string are stringified.

| Placeholder | Type | Meaning |
|-------------|------|---------|
| `{{items}}` | array | Current page/slice |
| `{{total}}` | number | Count after filters |
| `{{page}}` / `{{pageSize}}` | number | Page mode meta |
| `{{offset}}` / `{{limit}}` | number | Offset (and cursor limit) meta |
| `{{totalPages}}` | number | `ceil(total / pageSize)` (page mode) |
| `{{sort}}` / `{{order}}` | string | Active sort string / first direction |
| `{{self}}` | string | Absolute URL of the current request |
| `{{next}}` / `{{previous}}` | string \| `null` | Absolute URLs for neighbors |
| `{{hasNext}}` / `{{hasPrevious}}` | boolean | Neighbor flags |
| `{{linkHeader}}` | string | RFC 5988 `Link` (`rel="next"` / `rel="prev"`) |
| `{{nextCursor}}` | string \| `null` | Opaque cursor for the next page (cursor mode) |
| `{{hasMore}}` | boolean | Same as `hasNext` (handy alias for cursor-style envelopes) |

Without a `body` template → JSON array of items (already filtered/sorted/paginated).  
`body` on `list` does **not** emit the “body ignored” warning (unlike other actions).

**Page envelope + `Link` header**

```json
{
  "name": "list",
  "statusCode": 200,
  "action": "list",
  "headers": {
    "X-Total-Count": "{{total}}",
    "Link": "{{linkHeader}}"
  },
  "body": {
    "data": "{{items}}",
    "page": "{{page}}",
    "pageSize": "{{pageSize}}",
    "total": "{{total}}",
    "next": "{{next}}",
    "previous": "{{previous}}"
  }
}
```

**Offset / Django-like**

```json
{
  "name": "list",
  "statusCode": 200,
  "action": "list",
  "body": {
    "results": "{{items}}",
    "next": "{{next}}",
    "previous": "{{previous}}",
    "meta": {
      "count": "{{total}}",
      "offset": "{{offset}}",
      "limit": "{{limit}}"
    }
  }
}
```

**Cursor / Stripe-like**

```json
{
  "name": "list",
  "statusCode": 200,
  "action": "list",
  "body": {
    "data": "{{items}}",
    "has_more": "{{hasMore}}",
    "next_cursor": "{{nextCursor}}",
    "next": "{{next}}"
  }
}
```

### Out of scope

Not implemented (do not expect these):

- Case-insensitive / trimmed unique comparison  
- Expand deeper than 3 hops / GraphQL-style field selection on embeds  
- HTTP admin routes to reset stores (use `--reset-store` or delete the snapshot file)  
- Re-implementing `request` rules inside `store`

### Example A — Simple (notes CRUD)

Minimal list/create/get/delete. Empty seed; `id` auto-increments; titles unique; optional persist.

```json
{
  "api/notes": {
    "store": {
      "id": "notes",
      "key": "id",
      "seed": [],
      "template": { "id": 0, "title": "", "done": false },
      "unique": ["title"],
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
      "responses": [
        { "name": "create", "statusCode": 201, "action": "create" }
      ]
    }
  },
  "api/notes/:id": {
    "store": { "id": "notes" },
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
curl -s http://localhost:3000/api/notes
curl -s -X POST http://localhost:3000/api/notes -H 'Content-Type: application/json' -d '{"title":"Buy milk"}'
curl -s http://localhost:3000/api/notes/1
curl -s -X DELETE http://localhost:3000/api/notes/1 -o /dev/null -w '%{http_code}\n'
```

### Example B — Complex (multi-tenant users)

Composite key, template defaults, request validation, custom conflict bodies, shared store across collection + item routes, `list` filtered by `:tenantId`.

```json
{
  "api/:tenantId/users": {
    "store": {
      "id": "users",
      "key": {
        "fields": ["tenantId", "id"],
        "conflict": { "response": "duplicate-key" }
      },
      "seed": [
        {
          "tenantId": "acme",
          "id": 1,
          "name": "Juan",
          "email": "juan@acme.com",
          "username": "juan",
          "active": true
        }
      ],
      "template": {
        "tenantId": "",
        "id": 0,
        "name": "",
        "email": "",
        "username": "",
        "active": true
      },
      "unique": {
        "fields": ["email", "username"],
        "conflict": {
          "response": "duplicate-fields",
          "detail": { "campo": "{{field}}", "valor": "{{value}}" }
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
          "name": { "type": "string", "minLength": 2 },
          "email": { "type": "string", "format": "email" },
          "username": { "type": "string", "minLength": 3 }
        },
        "error": {
          "response": "validation-error"
        }
      },
      "responses": [
        {
          "name": "validation-error",
          "statusCode": 400,
          "body": { "code": "VALIDATION_ERROR", "message": "Invalid request" }
        },
        {
          "name": "duplicate-fields",
          "statusCode": 409,
          "body": { "ok": false, "code": "DUPLICATE", "errores": "{{conflicts}}" }
        },
        {
          "name": "duplicate-key",
          "statusCode": 409,
          "body": { "code": "DUPLICATE_KEY", "message": "Id already exists for tenant" }
        },
        { "name": "create", "statusCode": 201, "action": "create" }
      ]
    }
  },
  "api/:tenantId/users/:id": {
    "store": { "id": "users" },
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
          "name": "duplicate-fields",
          "statusCode": 409,
          "body": { "ok": false, "code": "DUPLICATE", "errores": "{{conflicts}}" }
        },
        {
          "name": "duplicate-key",
          "statusCode": 409,
          "body": { "code": "DUPLICATE_KEY", "message": "Id already exists for tenant" }
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

Behavior:

- `GET /api/acme/users` → only users with `tenantId: "acme"`  
- `POST /api/acme/users` with body `{ "name", "email", "username" }` → `tenantId` from params, next numeric `id`, `active: true` from template  
- Duplicate email/username → `409` with `errores` shaped by `detail`  
- Invalid email format → `400` from `request` (store never runs)

### Example C — Real project: Todo / notes app

Typical SPA: list, create with validation, toggle done (`patch`), delete. Persist so a browser refresh after server restart still sees data.

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

### Example D — Real project: SaaS projects board

Org-scoped projects with slug uniqueness, forbidden org via `match`, persist across restarts. Pattern used by project-management / B2B dashboards.

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

### Example E — Real project: E-commerce catalog

Admin catalog + checkout resilience: `store` + `store.list` (page, multi-sort, **advanced filters**, search, `Link`) + `request` + `unique` SKU + `persist` + `match` (featured / maintenance / archive) + `delay` + custom headers.

Filter permutation focus: `eq` / `ne` / `gt` / `lt` / `gte` / `lte` / `in` + nested `warehouse.code` + `or` (warehouse **or** category) + search.

```json
{
  "api/catalog/products": {
    "store": {
      "id": "catalog-products",
      "key": "id",
      "seed": [
        {
          "id": 1,
          "sku": "SKU-TEA-001",
          "name": "Green Tea",
          "category": "beverages",
          "price": 12.5,
          "stock": 40,
          "status": "active",
          "warehouse": { "code": "WH-EU", "zone": "A" }
        },
        {
          "id": 2,
          "sku": "SKU-MUG-010",
          "name": "Ceramic Mug",
          "category": "home",
          "price": 18,
          "stock": 12,
          "status": "active",
          "warehouse": { "code": "WH-US", "zone": "B" }
        }
      ],
      "template": {
        "id": 0,
        "sku": "",
        "name": "",
        "category": "home",
        "price": 0,
        "stock": 0,
        "status": "draft",
        "warehouse": { "code": "", "zone": "" }
      },
      "unique": {
        "fields": [
          {
            "field": "sku",
            "conflict": {
              "response": "sku-taken",
              "detail": { "field": "{{field}}", "value": "{{value}}" }
            }
          }
        ],
        "conflict": {
          "response": "duplicate-fields",
          "detail": { "field": "{{field}}", "value": "{{value}}" }
        }
      },
      "persist": true,
      "list": {
        "page": { "query": "page", "default": 1 },
        "pageSize": {
          "query": "pageSize",
          "default": 3,
          "max": 50,
          "aliases": ["limit"]
        },
        "sort": {
          "query": "sort",
          "default": "id",
          "fields": ["id", "name", "price", "stock"]
        },
        "order": { "query": "order", "default": "asc" },
        "filter": {
          "fields": [
            "status",
            "category",
            { "field": "price", "op": "gte", "query": "minPrice" },
            { "field": "price", "op": "lte", "query": "maxPrice" },
            { "field": "stock", "op": "gt", "query": "minStock" },
            { "field": "stock", "op": "lt", "query": "maxStock" },
            { "field": "status", "op": "ne", "query": "excludeStatus" },
            { "field": "category", "op": "in", "query": "categories" },
            { "field": "warehouse.code", "op": "eq", "query": "warehouse" }
          ],
          "or": [
            { "field": "warehouse.code", "op": "eq", "query": "anyWarehouse" },
            { "field": "category", "op": "eq", "query": "anyCategory" }
          ],
          "search": {
            "query": "q",
            "fields": ["name", "sku", "warehouse.code"]
          }
        }
      }
    },
    "GET": {
      "nameResponse": "list",
      "responses": [
        {
          "name": "maintenance",
          "statusCode": 503,
          "match": { "query": { "mode": "maintenance" } },
          "delay": 200,
          "headers": { "Retry-After": "30", "X-Catalog": "down" },
          "body": {
            "code": "CATALOG_MAINTENANCE",
            "message": "Catalog temporarily unavailable"
          }
        },
        {
          "name": "featured-static",
          "statusCode": 200,
          "match": { "query": { "view": "featured" } },
          "headers": {
            "X-View": "featured",
            "Cache-Control": "public, max-age=60"
          },
          "body": {
            "view": "featured",
            "items": [
              { "sku": "SKU-TEA-001", "badge": "bestseller" }
            ]
          }
        },
        {
          "name": "list",
          "statusCode": 200,
          "action": "list",
          "delay": 80,
          "headers": {
            "X-Total-Count": "{{total}}",
            "Link": "{{linkHeader}}",
            "X-Catalog": "store"
          },
          "body": {
            "data": "{{items}}",
            "page": "{{page}}",
            "pageSize": "{{pageSize}}",
            "total": "{{total}}",
            "totalPages": "{{totalPages}}",
            "sort": "{{sort}}",
            "order": "{{order}}",
            "next": "{{next}}",
            "previous": "{{previous}}",
            "hasNext": "{{hasNext}}",
            "hasPrevious": "{{hasPrevious}}"
          }
        }
      ]
    },
    "POST": {
      "nameResponse": "create",
      "request": {
        "payload": {
          "sku": {
            "type": "string",
            "minLength": 5,
            "maxLength": 32,
            "pattern": "^SKU-[A-Z0-9]+-[0-9]{3}$"
          },
          "name": { "type": "string", "minLength": 2, "maxLength": 80 },
          "category": {
            "type": "string",
            "enum": ["beverages", "home", "grocery"]
          },
          "price": { "type": "number", "min": 0.01, "max": 9999 },
          "stock?": { "type": "number", "min": 0, "max": 100000 },
          "status?": { "type": "string", "enum": ["active", "draft"] }
        },
        "error": {
          "response": "validation-error"
        }
      },
      "responses": [
        {
          "name": "validation-error",
          "statusCode": 422,
          "body": {
            "code": "VALIDATION_ERROR",
            "message": "Invalid product payload",
            "errors": []
          }
        },
        {
          "name": "sku-taken",
          "statusCode": 409,
          "body": { "code": "SKU_TAKEN", "conflicts": "{{conflicts}}" }
        },
        {
          "name": "duplicate-fields",
          "statusCode": 409,
          "body": { "code": "DUPLICATE", "conflicts": "{{conflicts}}" }
        },
        { "name": "create", "statusCode": 201, "action": "create" }
      ]
    }
  },
  "api/catalog/products/:id": {
    "store": { "id": "catalog-products" },
    "GET": {
      "nameResponse": "get",
      "responses": [{ "name": "get", "statusCode": 200, "action": "get" }]
    },
    "PATCH": {
      "nameResponse": "patch",
      "request": {
        "payload": {
          "name?": { "type": "string", "minLength": 2, "maxLength": 80 },
          "price?": { "type": "number", "min": 0.01, "max": 9999 },
          "stock?": { "type": "number", "min": 0, "max": 100000 },
          "status?": {
            "type": "string",
            "enum": ["active", "draft", "archived"]
          }
        },
        "error": {
          "response": "validation-error"
        }
      },
      "responses": [
        {
          "name": "validation-error",
          "statusCode": 422,
          "body": {
            "code": "VALIDATION_ERROR",
            "message": "Invalid product patch",
            "errors": []
          }
        },
        {
          "name": "discontinued-static",
          "statusCode": 409,
          "match": { "body": { "status": "archived" } },
          "body": {
            "code": "USE_ARCHIVE_ENDPOINT",
            "message": "Archive products via DELETE, not PATCH status=archived"
          }
        },
        {
          "name": "sku-taken",
          "statusCode": 409,
          "body": { "code": "SKU_TAKEN", "conflicts": "{{conflicts}}" }
        },
        { "name": "patch", "statusCode": 200, "action": "patch" }
      ]
    },
    "DELETE": {
      "nameResponse": "remove",
      "responses": [{ "name": "remove", "statusCode": 204, "action": "delete" }]
    }
  },
  "api/catalog/checkout": {
    "POST": {
      "nameResponse": "paid",
      "request": {
        "payload": {
          "sku": { "type": "string", "minLength": 5 },
          "quantity": { "type": "number", "min": 1, "max": 20 },
          "cardLast4": { "type": "string", "pattern": "^[0-9]{4}$" }
        },
        "error": {
          "response": "validation-error"
        }
      },
      "responses": [
        {
          "name": "validation-error",
          "statusCode": 422,
          "body": {
            "code": "VALIDATION_ERROR",
            "message": "Invalid checkout",
            "errors": []
          }
        },
        {
          "name": "payment-required",
          "statusCode": 402,
          "match": { "body": { "cardLast4": "0000" } },
          "delay": 150,
          "body": { "code": "PAYMENT_REQUIRED", "message": "Card declined" }
        },
        {
          "name": "rate-limited",
          "statusCode": 429,
          "match": { "body": { "cardLast4": "4290" } },
          "headers": { "Retry-After": "5" },
          "body": {
            "code": "RATE_LIMITED",
            "message": "Too many checkout attempts"
          }
        },
        {
          "name": "paid",
          "statusCode": 201,
          "delay": 120,
          "body": { "orderId": "ord_demo_1", "status": "paid" }
        }
      ]
    }
  }
}
```

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

### Example F — Real project: Multi-tenant helpdesk

Tenant-scoped tickets (page list) + activity feed (cursor): composite keys, `store.list`, **advanced filters**, `request`, `unique`, `persist`, `match` (`403` / `401`), `delay`.

Filter permutation focus: date range on `createdAt`, nested `channel.source` / `channel.sla`, `ne` / `in`, `or` (assignee **or** priority), search.

```json
{
  "api/tenants/:tenantId/tickets": {
    "store": {
      "id": "helpdesk-tickets",
      "key": {
        "fields": ["tenantId", "id"],
        "conflict": { "response": "duplicate-key" }
      },
      "seed": [
        {
          "tenantId": "acme",
          "id": 1,
          "subject": "Cannot login",
          "priority": "high",
          "status": "open",
          "assignee": "alice@acme.com",
          "createdAt": 1700000001,
          "channel": { "source": "email", "sla": 4 }
        },
        {
          "tenantId": "acme",
          "id": 2,
          "subject": "Invoice PDF broken",
          "priority": "medium",
          "status": "pending",
          "assignee": "bob@acme.com",
          "createdAt": 1700000002,
          "channel": { "source": "chat", "sla": 8 }
        },
        {
          "tenantId": "globex",
          "id": 1,
          "subject": "API key rotation",
          "priority": "high",
          "status": "open",
          "assignee": "dan@globex.com",
          "createdAt": 1700000101,
          "channel": { "source": "email", "sla": 4 }
        }
      ],
      "template": {
        "tenantId": "",
        "id": 0,
        "subject": "",
        "priority": "medium",
        "status": "open",
        "assignee": "",
        "createdAt": 0,
        "channel": { "source": "email", "sla": 8 }
      },
      "unique": {
        "fields": [
          {
            "field": "subject",
            "conflict": {
              "response": "subject-taken",
              "detail": { "field": "{{field}}", "value": "{{value}}" }
            }
          }
        ],
        "conflict": {
          "response": "duplicate-fields",
          "detail": { "field": "{{field}}", "value": "{{value}}" }
        }
      },
      "persist": true,
      "list": {
        "page": { "query": "page", "default": 1 },
        "pageSize": {
          "query": "pageSize",
          "default": 2,
          "max": 25,
          "aliases": ["limit"]
        },
        "sort": {
          "query": "sort",
          "default": "-createdAt",
          "fields": ["id", "priority", "createdAt", "status"]
        },
        "order": { "query": "order", "default": "desc" },
        "filter": {
          "fields": [
            "status",
            "priority",
            "assignee",
            { "field": "createdAt", "op": "gte", "query": "since" },
            { "field": "createdAt", "op": "lte", "query": "until" },
            { "field": "channel.sla", "op": "lt", "query": "maxSla" },
            { "field": "status", "op": "ne", "query": "excludeStatus" },
            { "field": "priority", "op": "in", "query": "priorities" },
            { "field": "channel.source", "op": "eq", "query": "channel" }
          ],
          "or": [
            { "field": "assignee", "op": "eq", "query": "anyAssignee" },
            { "field": "priority", "op": "eq", "query": "anyPriority" }
          ],
          "search": {
            "query": "q",
            "fields": ["subject", "assignee", "channel.source"]
          }
        }
      }
    },
    "GET": {
      "nameResponse": "inbox",
      "responses": [
        {
          "name": "forbidden-tenant",
          "statusCode": 403,
          "match": { "params": { "tenantId": "blocked" } },
          "body": {
            "code": "TENANT_FORBIDDEN",
            "message": "Your account cannot access this tenant"
          }
        },
        {
          "name": "unauthorized",
          "statusCode": 401,
          "match": { "query": { "auth": "missing" } },
          "headers": { "WWW-Authenticate": "Bearer" },
          "body": { "code": "UNAUTHORIZED", "message": "Login required" }
        },
        {
          "name": "inbox",
          "statusCode": 200,
          "action": "list",
          "delay": 60,
          "headers": {
            "X-Total-Count": "{{total}}",
            "Link": "{{linkHeader}}",
            "X-Tenant-Scope": "tickets"
          },
          "body": {
            "tickets": "{{items}}",
            "page": "{{page}}",
            "pageSize": "{{pageSize}}",
            "total": "{{total}}",
            "totalPages": "{{totalPages}}",
            "sort": "{{sort}}",
            "next": "{{next}}",
            "previous": "{{previous}}",
            "hasNext": "{{hasNext}}",
            "hasPrevious": "{{hasPrevious}}"
          }
        }
      ]
    },
    "POST": {
      "nameResponse": "create",
      "request": {
        "payload": {
          "subject": { "type": "string", "minLength": 5, "maxLength": 120 },
          "priority": { "type": "string", "enum": ["low", "medium", "high"] },
          "assignee": { "type": "string", "format": "email" },
          "status?": {
            "type": "string",
            "enum": ["open", "pending", "closed"]
          },
          "createdAt?": { "type": "number", "min": 1 }
        },
        "error": {
          "response": "validation-error"
        }
      },
      "responses": [
        {
          "name": "forbidden-tenant",
          "statusCode": 403,
          "match": { "params": { "tenantId": "blocked" } },
          "body": { "code": "TENANT_FORBIDDEN" }
        },
        {
          "name": "validation-error",
          "statusCode": 422,
          "body": {
            "code": "VALIDATION_ERROR",
            "message": "Invalid ticket",
            "errors": []
          }
        },
        {
          "name": "subject-taken",
          "statusCode": 409,
          "body": { "code": "SUBJECT_TAKEN", "conflicts": "{{conflicts}}" }
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
  "api/tenants/:tenantId/tickets/:id": {
    "store": { "id": "helpdesk-tickets" },
    "GET": {
      "nameResponse": "get",
      "responses": [
        {
          "name": "forbidden-tenant",
          "statusCode": 403,
          "match": { "params": { "tenantId": "blocked" } },
          "body": { "code": "TENANT_FORBIDDEN" }
        },
        { "name": "get", "statusCode": 200, "action": "get" }
      ]
    },
    "PATCH": {
      "nameResponse": "patch",
      "request": {
        "payload": {
          "status?": {
            "type": "string",
            "enum": ["open", "pending", "closed"]
          },
          "priority?": {
            "type": "string",
            "enum": ["low", "medium", "high"]
          },
          "assignee?": { "type": "string", "format": "email" }
        },
        "error": {
          "response": "validation-error"
        }
      },
      "responses": [
        {
          "name": "validation-error",
          "statusCode": 422,
          "body": {
            "code": "VALIDATION_ERROR",
            "message": "Invalid ticket patch",
            "errors": []
          }
        },
        { "name": "patch", "statusCode": 200, "action": "patch" }
      ]
    },
    "DELETE": {
      "nameResponse": "remove",
      "responses": [
        {
          "name": "forbidden-tenant",
          "statusCode": 403,
          "match": { "params": { "tenantId": "blocked" } },
          "body": { "code": "TENANT_FORBIDDEN" }
        },
        { "name": "remove", "statusCode": 204, "action": "delete" }
      ]
    }
  },
  "api/tenants/:tenantId/activity": {
    "store": {
      "id": "helpdesk-activity",
      "key": { "fields": ["tenantId", "id"] },
      "seed": [
        {
          "tenantId": "acme",
          "id": 1,
          "type": "comment",
          "message": "Looking into login",
          "score": 2,
          "createdAt": 1700001001
        },
        {
          "tenantId": "acme",
          "id": 2,
          "type": "status",
          "message": "Moved to pending",
          "score": 5,
          "createdAt": 1700001002
        },
        {
          "tenantId": "acme",
          "id": 3,
          "type": "comment",
          "message": "Password reset sent",
          "score": 8,
          "createdAt": 1700001003
        },
        {
          "tenantId": "acme",
          "id": 4,
          "type": "assign",
          "message": "Assigned to alice",
          "score": 3,
          "createdAt": 1700001004
        }
      ],
      "template": {
        "tenantId": "",
        "id": 0,
        "type": "comment",
        "message": "",
        "score": 0,
        "createdAt": 0
      },
      "list": {
        "cursor": {
          "query": "starting_after",
          "limit": { "query": "limit", "default": 2, "max": 20 }
        },
        "sort": {
          "query": "sort",
          "default": "-createdAt",
          "fields": ["id", "createdAt", "score"]
        },
        "order": { "query": "order", "default": "desc" },
        "filter": {
          "fields": ["type"],
          "search": { "query": "q", "fields": ["message"] }
        }
      }
    },
    "GET": {
      "nameResponse": "feed",
      "responses": [
        {
          "name": "forbidden-tenant",
          "statusCode": 403,
          "match": { "params": { "tenantId": "blocked" } },
          "body": { "code": "TENANT_FORBIDDEN" }
        },
        {
          "name": "feed",
          "statusCode": 200,
          "action": "list",
          "headers": {
            "X-Feed": "activity",
            "X-Has-More": "{{hasMore}}"
          },
          "body": {
            "data": "{{items}}",
            "has_more": "{{hasMore}}",
            "next_cursor": "{{nextCursor}}",
            "next": "{{next}}",
            "sort": "{{sort}}"
          }
        }
      ]
    },
    "POST": {
      "nameResponse": "create",
      "request": {
        "payload": {
          "type": {
            "type": "string",
            "enum": ["comment", "status", "assign"]
          },
          "message": { "type": "string", "minLength": 3, "maxLength": 200 },
          "score?": { "type": "number", "min": 0, "max": 100 },
          "createdAt?": { "type": "number", "min": 1 }
        },
        "error": {
          "response": "validation-error"
        }
      },
      "responses": [
        {
          "name": "validation-error",
          "statusCode": 422,
          "body": {
            "code": "VALIDATION_ERROR",
            "message": "Invalid activity event",
            "errors": []
          }
        },
        { "name": "create", "statusCode": 201, "action": "create" }
      ]
    }
  }
}
```

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

### Example G — Real project: HR employee directory

Org-scoped people directory built to **permute every filter op** in a realistic admin UI: salary bands, level ranges, hire window, role `in`, nested `profile.*`, `or` (dept / city / role), search, plus `request` / `unique` / `match` / `persist`.

```json
{
  "api/orgs/:orgId/employees": {
    "store": {
      "id": "hr-employees",
      "key": {
        "fields": ["orgId", "id"],
        "conflict": { "response": "duplicate-key" }
      },
      "seed": [
        {
          "orgId": "acme",
          "id": 1,
          "name": "Ana Ruiz",
          "email": "ana@acme.com",
          "role": "engineer",
          "status": "active",
          "salary": 72000,
          "hiredAt": 1600000000,
          "profile": { "dept": "platform", "level": 3, "city": "Madrid" }
        },
        {
          "orgId": "acme",
          "id": 2,
          "name": "Bruno Díaz",
          "email": "bruno@acme.com",
          "role": "designer",
          "status": "active",
          "salary": 58000,
          "hiredAt": 1620000000,
          "profile": { "dept": "product", "level": 2, "city": "Barcelona" }
        },
        {
          "orgId": "acme",
          "id": 5,
          "name": "Elena Voss",
          "email": "elena@acme.com",
          "role": "engineer",
          "status": "active",
          "salary": 64000,
          "hiredAt": 1680000000,
          "profile": { "dept": "data", "level": 2, "city": "Berlin" }
        }
      ],
      "template": {
        "orgId": "",
        "id": 0,
        "name": "",
        "email": "",
        "role": "engineer",
        "status": "active",
        "salary": 0,
        "hiredAt": 0,
        "profile": { "dept": "", "level": 1, "city": "" }
      },
      "unique": {
        "fields": [
          {
            "field": "email",
            "conflict": {
              "response": "email-taken",
              "detail": { "field": "{{field}}", "value": "{{value}}" }
            }
          }
        ],
        "conflict": {
          "response": "duplicate-fields",
          "detail": { "field": "{{field}}", "value": "{{value}}" }
        }
      },
      "persist": true,
      "list": {
        "page": { "query": "page", "default": 1 },
        "pageSize": {
          "query": "pageSize",
          "default": 3,
          "max": 50,
          "aliases": ["limit"]
        },
        "sort": {
          "query": "sort",
          "default": "name",
          "fields": ["id", "name", "salary", "hiredAt", "role"]
        },
        "order": { "query": "order", "default": "asc" },
        "filter": {
          "fields": [
            "status",
            "role",
            { "field": "salary", "op": "gte", "query": "minSalary" },
            { "field": "salary", "op": "lte", "query": "maxSalary" },
            { "field": "profile.level", "op": "gt", "query": "minLevel" },
            { "field": "profile.level", "op": "lt", "query": "maxLevel" },
            { "field": "hiredAt", "op": "gte", "query": "hiredAfter" },
            { "field": "hiredAt", "op": "lte", "query": "hiredBefore" },
            { "field": "status", "op": "ne", "query": "excludeStatus" },
            { "field": "role", "op": "in", "query": "roles" },
            { "field": "profile.dept", "op": "eq", "query": "dept" },
            { "field": "profile.city", "op": "eq", "query": "city" }
          ],
          "or": [
            { "field": "profile.dept", "op": "eq", "query": "anyDept" },
            { "field": "profile.city", "op": "eq", "query": "anyCity" },
            { "field": "role", "op": "eq", "query": "anyRole" }
          ],
          "search": {
            "query": "q",
            "fields": ["name", "email", "profile.city", "profile.dept"]
          }
        }
      }
    },
    "GET": {
      "nameResponse": "directory",
      "responses": [
        {
          "name": "forbidden-org",
          "statusCode": 403,
          "match": { "params": { "orgId": "blocked" } },
          "body": {
            "code": "ORG_FORBIDDEN",
            "message": "HR directory is not available for this organization"
          }
        },
        {
          "name": "directory",
          "statusCode": 200,
          "action": "list",
          "headers": {
            "X-Total-Count": "{{total}}",
            "Link": "{{linkHeader}}"
          },
          "body": {
            "employees": "{{items}}",
            "page": "{{page}}",
            "pageSize": "{{pageSize}}",
            "total": "{{total}}",
            "totalPages": "{{totalPages}}",
            "sort": "{{sort}}",
            "next": "{{next}}",
            "previous": "{{previous}}",
            "hasNext": "{{hasNext}}",
            "hasPrevious": "{{hasPrevious}}"
          }
        }
      ]
    },
    "POST": {
      "nameResponse": "create",
      "request": {
        "payload": {
          "name": { "type": "string", "minLength": 2, "maxLength": 80 },
          "email": { "type": "string", "format": "email" },
          "role": {
            "type": "string",
            "enum": ["engineer", "designer", "manager", "support"]
          },
          "salary": { "type": "number", "min": 1, "max": 500000 },
          "hiredAt": { "type": "number", "min": 1 },
          "profile": {
            "type": "object",
            "properties": {
              "dept": { "type": "string", "minLength": 2 },
              "level": { "type": "number", "min": 1, "max": 10 },
              "city": { "type": "string", "minLength": 2 }
            }
          }
        },
        "error": {
          "response": "validation-error"
        }
      },
      "responses": [
        {
          "name": "validation-error",
          "statusCode": 422,
          "body": {
            "code": "VALIDATION_ERROR",
            "message": "Invalid employee payload",
            "errors": []
          }
        },
        {
          "name": "email-taken",
          "statusCode": 409,
          "body": { "code": "EMAIL_TAKEN", "conflicts": "{{conflicts}}" }
        },
        {
          "name": "duplicate-fields",
          "statusCode": 409,
          "body": { "code": "DUPLICATE", "conflicts": "{{conflicts}}" }
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
  "api/orgs/:orgId/employees/:id": {
    "store": { "id": "hr-employees" },
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
          "name": "email-taken",
          "statusCode": 409,
          "body": { "code": "EMAIL_TAKEN", "conflicts": "{{conflicts}}" }
        },
        {
          "name": "duplicate-fields",
          "statusCode": 409,
          "body": { "code": "DUPLICATE", "conflicts": "{{conflicts}}" }
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

### Example H — Real project: Blog CMS with authors

Editorial UI: authors own articles, FK validation on write, `?expand=author` / `?expand=articles.author`, soft-delete + restore trash, paginated/filtered article list, `request` on create, `unique` slug, `persist`, and `onDelete: restrict` so you cannot delete an author who still has articles.

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

### Example I — Real project: Multi-tenant orders

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

### Example J — Real project: Auth lockout + sessions

Login UI with **per-email** failed-attempt counters (`match.call.by`), lockout headers, validation (`request`), latency, and a **sessions** store after a successful sign-in (`call.reset` clears that user’s counter).

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

### Example K — Real project: JWT access + refresh tokens

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

### Example L — Real project: Password reset

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

### Example M — Real project: Async export job

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

### Example N — Real project: Notifications inbox

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

### Example O — Real project: Signed URL upload

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

### Example P — Real project: Feature flags + app config

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

### Example Q — Real project: Billing + subscription

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

### Example R — Real project: Onboarding wizard

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

---

