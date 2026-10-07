# CookLoom

AI recipe app and paid public API. Chat with an AI to generate recipes, refine
them in plain language, identify dishes from a photo, and keep your favorites
in one place. Developers can use the same generation engine through a keyed
public API.

## Features

- Chat-based recipe generation with conversation history, with both
  streaming (SSE) and non-streaming generation endpoints
- Food photo analysis: upload a photo to identify a dish
- Recipe photos fetched and cached automatically
- Saved recipe library backed by a normalized relational schema
- Auth: email/password and Google Sign-In, email verification, password reset,
  Redis-backed session cookies
- Public `/v1` API with API key management, per-key rate limiting, monthly
  quotas, idempotent requests, and a usage dashboard

## Tech stack

- Backend: Fastify, TypeScript, Prisma, PostgreSQL, Redis
- Frontend: Next.js (App Router), React, Tailwind CSS, shadcn/ui
- Contracts: Zod schemas shared across apps
- AI: Google Gemini behind a provider abstraction
- Tooling: pnpm workspaces, Docker Compose, GitHub Actions CI

## Architecture highlights

- Modular monolith with clear boundaries between routes, services, data
  access, and external integrations.
- Session-based auth with signed httpOnly cookies stored in Redis, not JWT.
- AI, image, and mail providers sit behind interfaces so vendors can be
  swapped without touching business logic.
- `packages/shared` is the single source of truth for the API contract.
- Separate Gemini API keys for internal and public traffic, so heavy public
  usage cannot degrade the app itself.

Full rationale: [`docs/architecture.md`](docs/architecture.md).
Public API reference: [`docs/api.md`](docs/api.md).

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

`apps/api/.env` requires two separate Gemini API keys: `GEMINI_API_KEY` for
internal app traffic and `GEMINI_API_KEY_PUBLIC` for public `/v1` traffic.
See `.env.example` for the full list of required variables.

## Workspace layout

- `apps/api`: Fastify backend. Each domain lives under `src/modules/*`:
  - `auth`: signup/login, Google Sign-In, email verification, password reset
  - `chat`: conversations, messages, recipe generation, photo analysis
  - `recipes`: saved recipe CRUD
  - `api-keys`: API key lifecycle and usage, session-authenticated
  - `public-api`: the `/v1` public API, authenticated by API key
- `apps/web`: Next.js frontend (landing page, chat, recipes, API key dashboard).
- `packages/shared`: Zod schemas and inferred types shared by both apps.
- `scripts/demo-video`: Playwright scripts that record the landing page demo.

## Roadmap

- Embeddable widget
- Production hardening

## Documentation

- [`docs/architecture.md`](docs/architecture.md): architectural decisions
  and rationale.
- [`docs/api.md`](docs/api.md): public `/v1` API reference (authentication,
  endpoints, rate limits, error codes).
- [`scripts/demo-video/README.md`](scripts/demo-video/README.md): how the
  landing page demo video is recorded.