# RecipeAI

Modular-monolith backend (Fastify + Prisma + PostgreSQL + Redis) with a
Next.js frontend, sharing Zod contracts through `packages/shared`.

Full architecture rationale: see [`docs/architecture.md`](docs/architecture.md).
Public API reference: see [`docs/api.md`](docs/api.md).

## Status

Phases 0–4 and 6 complete: auth (credentials + Google Sign-In, email
verification, forgot password), recipe CRUD, AI-powered recipe generation
(non-streaming and SSE streaming), and a public API (`/v1`) with API key
management, per-key rate limiting and monthly quotas, and idempotent
request handling.

Not yet built: chat/tool-calling (Phase 5), embeddable widget (Phase 7),
frontend buildout (Phase 8), production hardening (Phase 9).

## Local setup

```bash
pnpm install
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.local.example apps/web/.env.local

docker compose up -d postgres redis
pnpm --filter @recipeai/api prisma:migrate
pnpm dev:api    # http://localhost:4000/health
pnpm dev:web    # http://localhost:3000
```

Postgres runs on host port `5433` (not the default `5432`) and Redis on
`6379` via the provided `docker-compose.yml`.

`apps/api/.env` requires two separate Gemini API keys — `GEMINI_API_KEY`
for internal app traffic and `GEMINI_API_KEY_PUBLIC` for public `/v1`
traffic — kept isolated so heavy usage on one can't degrade the other.
See `.env.example` for the full list of required variables.

## Workspace layout

- `apps/api` — Fastify backend. Each domain lives under `src/modules/*`
  with routes/service/schema separation:
  - `auth` — signup/login, Google Sign-In, email verification, password reset
  - `recipes` — CRUD, AI generation (session-authenticated)
  - `api-keys` — API key lifecycle (create/list/revoke), session-authenticated
  - `public-api` — the `/v1` public API, authenticated by API key
- `apps/web` — Next.js frontend (App Router).
- `packages/shared` — Zod schemas and inferred types shared by both apps.
  This is the single source of truth for the API contract.

## Documentation

- [`docs/architecture.md`](docs/architecture.md) — architectural decisions
  and rationale.
- [`docs/api.md`](docs/api.md) — public `/v1` API reference for external
  developers (authentication, endpoints, rate limits, error codes).