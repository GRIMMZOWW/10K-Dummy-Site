# PLAN.md — 10k Product Catalog (local, production-grade)

Stack: Node.js + Express + TypeScript, MongoDB (local) + Mongoose, React + Vite + TypeScript, TanStack Query.
Scope: runs on one laptop. No deployment, no cloud.

## 1. Locked decisions

| Decision | Choice | Why |
|---|---|---|
| MongoDB | Community Server + Compass | Simplest locally; Compass shows data and `.explain()` visually |
| Language | TypeScript (API + frontend) | Stronger on a resume; catches bugs early |
| Mongo access | Mongoose | Schema + validation built in |
| Pagination | Page-based (`page`, `limit`) | 10k rows is shallow; simple and enough |
| Search | Text index + prefix field | No cloud dependency; see section 4 |
| Validation | Zod | One schema for query params, typed output |
| Tests | Vitest + Supertest | Fast, TS-friendly |
| Load test | autocannon | Proves the "no lag" claim with numbers |
| Logging | Pino | Structured, fast |

## 2. Folder structure

```
catalog/
  PLAN.md
  README.md
  server/
    package.json
    tsconfig.json
    .env.example            # MONGO_URI, PORT
    src/
      config/env.ts         # validated env
      db/connect.ts
      models/product.model.ts
      modules/products/
        product.routes.ts
        product.controller.ts
        product.service.ts
        product.repository.ts   # ALL Mongo queries live here
        product.schema.ts       # Zod query schemas
      middleware/
        error.ts
        validate.ts
      app.ts                # builds Express app (testable)
      server.ts             # starts listening
    scripts/
      seed.ts               # fetch + expand + load
      explain.ts            # runs .explain() on every query
    tests/
      products.test.ts
  web/
    src/
      api/client.ts
      hooks/useProducts.ts, useDebounce.ts
      components/ProductCard, ProductGrid, FilterSidebar,
                 SearchBar, Pagination, Skeleton
      pages/Catalog.tsx, ProductDetail.tsx
```

Rule: no file over 500 lines. Controllers never touch Mongo directly.

## 3. Data model — `products` collection

| Field | Type | Notes |
|---|---|---|
| sku | string | unique, e.g. `BEA-0042-0017` |
| slug | string | unique, from title + copy number |
| title | string | |
| titleLower | string | lowercase copy for prefix search |
| description | string | |
| brand | string | optional (some DummyJSON items lack it) |
| category | string | |
| tags | string[] | |
| price | integer | stored in paise/cents, no floats |
| discountPercentage | number | |
| stock | integer | 0–500 |
| rating | number | 0–5 |
| thumbnail | string | URL |
| images | string[] | URLs |
| createdAt | Date | |

### Indexes

| Index | Used for |
|---|---|
| `{ sku: 1 }` unique | Integrity |
| `{ slug: 1 }` unique | Product detail |
| `{ category: 1, price: 1 }` | Category + price filter/sort |
| `{ category: 1, rating: -1 }` | Category + rating sort |
| `{ price: 1 }` | Price sort with no category |
| `{ rating: -1 }` | Rating sort with no category |
| `{ createdAt: -1 }` | `sort=newest` with no category |
| `{ category: 1, createdAt: -1 }` | `sort=newest` inside a category |
| `{ titleLower: 1 }` | Prefix search (autocomplete style) |
| text on `title`, `description`, `tags` | Full-word search |

Every list query must show `IXSCAN` in `.explain()`. `COLLSCAN` = bug.
This includes every `sort` value: `price_asc`, `price_desc`, `rating_desc`, `newest`, with and without `category`.
A `FETCH` filter stage for `inStock` after the `IXSCAN` is acceptable (stock is not indexed). An in-memory `SORT` stage is not: fix the index instead.
`explain.ts` must fail (non-zero exit) if any tested query shows `COLLSCAN` or an in-memory `SORT`.

## 4. Search behavior

- Search box sends `q`. If `q` is 1–2 chars, use anchored prefix match on `titleLower` (uses index).
- Otherwise use `$text` search, sorted by text score unless a sort is chosen.
- Known limit: `$text` matches whole words, not typos or mid-word fragments. Accepted for local scope.

## 5. Seeding (194 → 10,000)

1. Fetch `https://dummyjson.com/products?limit=0` (all 194).
2. Save raw response to `server/scripts/dummyjson.cache.json` so reruns work offline.
3. For each base product, generate ~51 copies (total exactly 10,000):
   - Price: base ± 5–40%, as integer minor units.
   - Stock: 0–500, about 8% set to 0.
   - SKU: `<CAT3>-<baseId4>-<copy4>`, unique.
   - Title: base title + variant word (Pro, Mini, Max, color, edition).
   - Rating: base ± 0.5, clamped 1–5.
4. Seeded PRNG (mulberry32, fixed seed) so output is identical every run.
5. Wipe collection, `insertMany` in batches of 1,000, then build indexes.
6. Print a summary: count, category counts, min/max price.

## 6. API contract

### `GET /api/products`

| Param | Rule |
|---|---|
| q | string, max 100 |
| category | string |
| minPrice, maxPrice | **major units**, decimal allowed, max 2 decimals (e.g. `499.99`), `>= 0`, min <= max. Converted to integer minor units inside Zod |
| inStock | `true` only |
| sort | `relevance` \| `price_asc` \| `price_desc` \| `rating_desc` \| `newest` |
| page | int >= 1, default 1 |
| limit | int 1–100, default 24 |

Response:
```json
{ "items": [], "page": 1, "limit": 24, "total": 10000, "totalPages": 417 }
```
List responses return only card fields (no full description or all images).

### Price units (zero mismatch rule)

| Where | Unit |
|---|---|
| MongoDB `price` field | integer minor units (cents/paise) |
| API response `price` | integer minor units (same as DB, no conversion) |
| API request `minPrice` / `maxPrice` | major units (what a human types), converted once in `product.schema.ts` |
| Frontend URL and inputs | major units |
| Frontend display | `Intl.NumberFormat` on `price / 100` |

In `product.schema.ts`:
- One shared helper `toMinorUnits(major: number) => Math.round(major * 100)`, used inside a Zod `.transform()`.
- Reject more than 2 decimals with a Zod refine (so `10.999` is a 400, not a silent rounding).
- After the transform, the service and repository only ever see integer minor units. They never convert.
- Currency is a single `CURRENCY` constant (default `USD`, minor unit factor 100). Seed script uses the same constant.
- Tests: `?minPrice=10.50` queries `1050`; `?minPrice=10.999` returns 400; `?minPrice=50&maxPrice=10` returns 400.

### Others
- `GET /api/products/:slug` — full product, 404 if missing
- `GET /api/categories` — `[{ name, count }]`
- `GET /api/health` — `{ ok: true }`

### Production habits
- Zod validation on all inputs, 400 with field errors
- `.lean()` on read queries
- Helmet, compression, rate limit (generous, local)
- Central error handler, Pino request logs
- Graceful shutdown (close Mongo on SIGINT)

## 7. Frontend behavior

- All filter state lives in the URL query string (shareable, back button works).
- TanStack Query **v5** syntax only (install `@tanstack/react-query@5`):
  - Object form: `useQuery({ queryKey, queryFn, placeholderData: keepPreviousData })`, with `import { keepPreviousData } from '@tanstack/react-query'`.
  - Use `isPending` / `isFetching` / `isPlaceholderData` (not `isLoading` / `keepPreviousData: true` / `cacheTime`, which are v4).
  - Use `gcTime` instead of `cacheTime`.
  - `queryKey` includes every filter: `['products', { q, category, minPrice, maxPrice, inStock, sort, page }]`.
  - Grid stays visible while the next page loads; dim it when `isPlaceholderData` is true.
- Search debounced 300 ms.
- Skeleton cards while loading; `loading="lazy"` on images.
- Sidebar: category list (with counts), price range, in-stock toggle, sort dropdown.
- Pagination with prev/next and page numbers (24 per page, never render 10k).
- Empty state and error state on every list.
- Design: intentional theme and type pairing, not default template look.

## 8. Build phases

| Phase | Deliverable | Done when |
|---|---|---|
| 0 | Install MongoDB Community + Compass, Node 20+ | `mongosh` connects |
| 1 | Server skeleton, env, DB connect, `/api/health` | Health returns ok |
| 2 | Seed script | Compass shows exactly 10,000 docs, unique SKUs |
| 3 | Indexes + products API + categories API | All filters work via curl |
| 4 | `explain.ts` + tests | No COLLSCAN; tests pass (happy, edge, failure) |
| 5 | Frontend | Browse, search, filter, sort, detail page work |
| 6 | Load test + README | autocannon p99 under ~100 ms for list endpoint |

## 9. Agent workflow and checkpoints

`PLAN.md` in the project root is the single source of truth. If code and plan disagree, stop and ask; do not silently change either.

| Checkpoint | Phases | Gate (must pass before next) |
|---|---|---|
| A | 1 + 2 | Server boots, `/api/health` ok, seed gives exactly 10,000 docs, unique SKU and slug, rerun gives identical data, all 7+ indexes exist |
| B | 3 + 4 | All endpoints work, `explain.ts` exits 0 (no COLLSCAN, no in-memory SORT, every sort), tests pass |
| C | 5 + 6 | UI covers browse/search/filter/sort/detail, load test numbers recorded in README |

Rules for the agent:
- Work on one checkpoint at a time. Stop at the gate and report. Do not start the next checkpoint.
- Do not delete or overwrite existing files unless told to.
- Install only packages named in this plan. Ask before adding any other.
- Commit once per phase with a clear message. Git branch per checkpoint.
- Report: what was done, what was skipped, risks, and the exact commands run to verify.

## 10. Definition of done

- 10,000 products, unique SKU and slug
- Every list query uses an index (verified)
- Any filter combination responds fast locally
- Tests cover happy path, edge cases (empty results, last page, min > max), failures (bad params, unknown slug)
- README explains setup in under 5 commands

## 11. Risks

| Risk | Mitigation |
|---|---|
| `$text` cannot combine with some sorts efficiently | Use text score sort when `q` present; test with `.explain()` |
| `countDocuments` slows with filters | Fine at 10k; revisit only if measured slow |
| DummyJSON unreachable | Cached JSON file |
| Repeated images look fake | Accepted for demo |
