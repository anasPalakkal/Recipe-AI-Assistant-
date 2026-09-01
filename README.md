# RecipeAI

Modular-monolith backend (Fastify + Prisma + PostgreSQL + Redis) with a
Next.js frontend, sharing Zod contracts through `packages/shared`. Full
architecture rationale: see `docs/architecture.md` (add the reviewed
proposal there).

## Status

Phase 0 — repo scaffolding. No business logic yet. Goal: green CI on an
empty skeleton before any feature work starts.

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

## Workspace layout

- `apps/api` — Fastify backend. Routes/services/data-access separated per
  module under `src/modules/*` (added from Phase 1 onward).
- `apps/web` — Next.js frontend.
- `packages/shared` — Zod schemas and inferred types shared by both apps.
  This is the single source of truth for the API contract.

## Next phase

Phase 1: `auth` module — Argon2id password hashing, Redis-backed sessions,
`httpOnly`/`secure`/`sameSite=lax` cookies.
