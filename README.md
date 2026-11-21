# 10K Product Catalog

A local product catalog backed by Express, TypeScript, MongoDB, Mongoose, React, Vite, and TanStack Query v5. It seeds 10,000 deterministic products from DummyJSON and serves filtered, sorted, paginated queries over indexed fields.

## Architecture

- **API (`server/`)**: Express + TypeScript with Zod query validation, Helmet, compression, rate limiting, and Pino logging. All MongoDB reads live in `product.repository.ts` using `.lean()` and return card projections for list responses.
- **Pricing**: Prices are stored and returned as integer minor units (USD cents). Query inputs (`minPrice`, `maxPrice`) accept major units with at most two decimal places and convert once in `product.schema.ts`.
- **Search and indexes**: Queries of 1 to 2 characters use an anchored prefix regex on `titleLower`; queries of 3 or more characters use MongoDB `$text` search. All list and sort combinations are verified with `explain.ts` (`IXSCAN` or text index, no `COLLSCAN`).
- **Frontend (`web/`)**: React + Vite + TypeScript with TanStack Query v5 (`keepPreviousData`) and URL query parameter sync (`useSearchParams`) for `q`, `category`, `minPrice`, `maxPrice`, `inStock`, `sort`, and `page`.

## Prerequisites

- Node.js 20+
- Local MongoDB Community Server on `mongodb://localhost:27017`

## Setup and Run

1. Configure and install the API server:
   ```bash
   cd server && cp .env.example .env && npm install
   ```
2. Seed 10,000 products and build indexes:
   ```bash
   npm run seed
   ```
3. Start the API server (`http://localhost:4000`):
   ```bash
   npm run dev
   ```
4. In a second terminal, install and start the frontend (`http://localhost:5173`):
   ```bash
   cd web && npm install && npm run dev
   ```

## Verification and Load Test

- `npm run explain` (in `server/`): verifies 14 query/sort/filter plans against MongoDB.
- `npm test` (in `server/`): runs the 15 Vitest + Supertest integration tests.
- `npx tsx scripts/loadtest.ts` (in `server/`): runs `autocannon` at 50 concurrent connections for 10 seconds per endpoint against a local single-process Express + MongoDB instance.

| Endpoint | Req/sec (avg) | p50 (ms) | p97.5 (ms) | p99 (ms) | 2xx / Errors |
| --- | --- | --- | --- | --- | --- |
| `GET /api/products` | 260.8 | 177 | 374 | 504 | 2608 / 0 |
| `GET /api/products?category=smartphones&sort=price_asc` | 250.8 | 190 | 261 | 343 | 2508 / 0 |

At 50 concurrent connections on a single local Node.js process talking to local `mongod`, throughput plateaus around 250 to 260 req/s, which puts p99 latency at 343 to 504 ms under sustained 50-connection concurrency while all requests return HTTP 200 with zero errors.
