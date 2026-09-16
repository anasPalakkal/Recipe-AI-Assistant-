# RecipeAI — Architecture

This document records why the system is built the way it is: decisions
that were non-obvious, had a real alternative, or were locked in after
hitting a concrete problem. It is not a feature list or a setup guide —
see the README and `docs/api.md` for those.

---

## 1. System overview

Modular monolith: Fastify + TypeScript + Prisma (PostgreSQL) + Redis on
the backend (`apps/api`), Next.js 16 App Router + React 19 on the
frontend (`apps/web`), Zod schemas shared between both via
`packages/shared` as the single source of truth for the API contract.

**Why a modular monolith, not microservices:** there is one team, one
deploy target, and no component with an independent scaling or
availability requirement that would justify the operational cost of
service boundaries, network calls, and distributed failure modes.
Modules (`auth`, `recipes`, `api-keys`, `public-api`) are separated by
clear internal boundaries — routes/service/schema per module — so the
seam already exists if a genuine reason to split ever appears. Reaching
for microservices before that reason exists would be solving a problem
the project doesn't have.

**Why Postgres + Redis, not just one datastore:** Postgres is the system
of record — relational data with real constraints and relationships
(users, recipes, API keys). Redis holds ephemeral, high-churn state that
doesn't belong in the relational store: sessions, OTP codes and attempt
counters, rate-limit/quota counters, idempotency cache. Putting
short-TTL, high-write-frequency data in Postgres would work but adds
write load and vacuum pressure to the durable store for data that's
supposed to disappear anyway.

---

## 2. Authentication

### Session-based, not JWT

Sessions are opaque IDs stored server-side in Redis, referenced by a
signed, `httpOnly`, `secure`, `SameSite=Lax` cookie (`sid`). Chosen over
JWT because:
- Revocation is immediate and real (delete the Redis key) — a JWT is
  valid until it expires regardless of server-side state, unless you
  build a denylist, at which point you've reimplemented sessions anyway
  with extra steps.
- No client-side token handling, no refresh-token dance, no XSS token
  theft surface — the browser never sees the session identifier's
  meaning, only an opaque signed cookie value.

**Consequence:** because the cookie is `httpOnly` and `SameSite=Lax`,
the browser cannot call the Fastify API directly from client-side
JavaScript. All API access is proxied through the Next.js server:
`serverFetch()` for Server Components, Route Handlers for Client
Components (using `response.headers.getSetCookie()`, never `.get()`,
since a response can carry multiple `Set-Cookie` headers). This forced
App Router's default of Server Components for reads, with Client
Components only where genuine interactivity is needed.

### Google Sign-In via ID token, not redirect/code-exchange

The frontend verifies the user with Google's client-side SDK and sends
the resulting ID token to the backend, which verifies it server-side via
`google-auth-library`'s `OAuth2Client.verifyIdToken`. No redirect flow,
no authorization code exchange. Simpler surface, fewer round trips, and
sufficient for a first-party web app (the redirect/code flow exists
mainly for third-party OAuth clients that can't be trusted with a
client secret — not the situation here).

**No auto-linking to existing credentials accounts.** If someone signs
up with `alice@example.com`/password and later hits "Sign in with
Google" using the same email, the request is rejected with `409`
instead of silently merging accounts. Auto-linking would let an
attacker who merely knows a victim's email (not their password) attach
a Google identity to that account and gain access — email address alone
is not proof of ownership.

### Single-table user model, nullable `providerAccountId`

One `User` table with `provider` (`"credentials"` | `"google"`) and a
nullable `providerAccountId`, under
`@@unique([provider, providerAccountId])`. Postgres treats multiple
`NULL`s in a unique constraint as non-colliding, so any number of
credentials users (`providerAccountId: null`) coexist safely under this
constraint — this is standard Postgres behavior, not a workaround, and
should not be "fixed" by making the column non-nullable.

**Alternative considered and rejected:** separate tables per provider,
or a join table for identities. Rejected as unnecessary complexity for
two providers with no near-term plan for more; the single-table model
with a documented NULL-non-collision is simpler and sufficient.

### Email verification: OTP, not a magic link

A 6-digit code, not a clickable link. Corporate email security scanners
(e.g. Outlook Safe Links) prefetch links in incoming email automatically
— a magic link gets silently "clicked" and consumed by the scanner
before the real user ever opens the email. An OTP is only consumed by
explicit user action (typing the code in), so it can't be
scanner-consumed.

Verification status is derived everywhere as `emailVerifiedAt !== null`
— deliberately not a parallel boolean, since a boolean-plus-timestamp
pair risks drift (one updates, the other doesn't).

**Redis key design — six separate keys, each with one job:**
```
email-verify:{userId}                  → HASH {codeHash, attempts}   TTL 10 min
email-verify-cooldown:{userId}         → existence lock              TTL 60s
email-verify-hourly:{userId}           → counter                     TTL 1 hour
email-verify-daily:{userId}            → counter                     TTL 24 hours
email-verify-lockout-cycles:{userId}   → counter                     TTL 24 hours
email-verify-blocked:{userId}          → existence lock              TTL 30 min
```
An earlier draft collapsed these into fewer keys with shared TTLs — a
real bug, since a shared TTL between a short-lived code and a
longer-lived counter silently resets the counter early. Kept separate
on purpose; do not collapse.

Codes use `crypto.randomInt`, never `Math.random()`; stored as a SHA-256
hash, never plaintext; compared with `crypto.timingSafeEqual`. Attempt
counting uses `HINCRBY` (atomic), with an explicit `EXPIRE` re-applied
after every failed attempt — this closes a race where a concurrent
successful verify deletes the key mid-flight, leaving an orphaned,
TTL-less hash behind.

### Forgot password: opaque token, not OTP — and this is not inconsistent

The Safe-Links problem only applies when a GET request itself consumes
the token. Here, the reset link's GET only renders a form; the token is
consumed exclusively on `POST /reset-password` with the new password. A
prefetching scanner just loads a blank form — nothing is consumed. This
allows a high-entropy opaque token (`crypto.randomBytes(32)`,
SHA-256-hashed before storage), with no attempt-limiting needed since
256 bits isn't brute-forceable, unlike a 6-digit code.

Enumeration protection: `POST /forgot-password` always returns an
identical generic `200`, regardless of whether the account exists, is
Google-only, or the send succeeded. Throttling is keyed by a hash of the
submitted email (not session — there is none) and checked before any DB
lookup, so timing is identical either way.

Resetting a password revokes every active session for that user (via
the Redis reverse-index below) — protects against a scenario where an
attacker has a live session and the legitimate owner is regaining
control.

### Session revocation reverse index

Sessions were originally only addressable by their own `sid`, with no
way to answer "all sessions for user X." Added:
```
user-sessions:{userId} → SET of active session IDs
```
maintained by `createSession`/`destroySession`, read by
`revokeAllSessions(userId)`. 7-day sliding TTL per session.

---

## 3. Database design

### Normalized recipe schema, not JSON columns

`Ingredient` and `InstructionStep` are real tables with foreign keys and
an `order` column, not JSON blobs on `Recipe`. Enables proper querying,
indexing, and referential integrity, at the cost of slightly more
write-path complexity (delete-and-recreate on update, wrapped in a
`$transaction`). Correct trade-off for structured, queryable data that a
JSON column would only superficially simplify.

### `AiGeneration` — a separate audit log, not folded into `Recipe`

Every AI generation call is logged independently of whether the result
was ever saved as a `Recipe` — captures the prompt, raw response, and
success/failure status even for drafts the user discarded. Kept as its
own model, never exposed as part of the Recipe domain, because its
purpose is operational visibility and cost tracking, not user-facing
data.

**AI generation returns a draft only** — the user must explicitly save
it as a separate action. Generation and persistence are deliberately
decoupled; an API consumer (internal or public) should not have every
exploratory generation silently become a permanent saved recipe.

---

## 4. AI provider abstraction

### `AiProvider` interface, Gemini as one implementation

`lib/ai/` follows the same interface/provider/index pattern as
`lib/mail/`. All Gemini-specific logic — request shape, auth header,
SSE frame parsing — lives inside `GeminiProvider`; the rest of the
application depends only on the `AiProvider` interface
(`generateRecipe`, `generateRecipeStream`). Swapping providers later
means writing a new class, not touching call sites.

Locked to `gemini-3.6-flash` with `thinkingConfig: { thinkingLevel: "low" }`
— `gemini-2.5-flash` is unavailable on this account.

### Hardening: timeout, retry, cost cap

Added after review found Phase 3's own stated scope
("retry/timeout/cost controls") had never actually been implemented:
- 30s timeout on non-streaming; 60s total-duration cap on streaming,
  composed with (but distinguishable from) an external
  caller-disconnect `AbortSignal`.
- Retry with backoff (max 2) on network failure or
  `429/500/502/503/504`, only ever before any response has been read —
  never mid-stream, never on an intentional abort.
- `maxOutputTokens: 4096` as a hard ceiling on generation cost per call.

This was done deliberately *before* Phase 6, so the public API inherits
whatever robustness already exists in the generation pipeline rather
than shipping known gaps to external callers.

### `consumerType` — separate upstream Gemini keys per trust boundary

`GEMINI_API_KEY` (internal app traffic) and `GEMINI_API_KEY_PUBLIC`
(public `/v1` traffic) are distinct keys, both proxied through the same
Cloudflare AI Gateway. `GeminiProvider.generateRecipe`/
`generateRecipeStream` take a required `consumerType: "internal" |
"public"` parameter and select the key accordingly.

**Why this matters:** a single shared key means one consumer's traffic
or bugs can degrade the other. A retry storm or traffic spike from a
public API integrator would otherwise throttle or exhaust quota shared
with the internal app's own recipe generation feature — someone else's
incident becomes your outage. Separate keys give independent upstream
quotas even behind a shared gateway. This is a config-level isolation,
not an architectural rewrite, and was treated as a pre-launch
requirement once real external traffic was in scope, not a nice-to-have.

### SSE frame handling

Frame boundaries use `\r\n`, normalized to `\n` before parsing. Gemini
can terminate a stream mid-generation with a non-`data:`-prefixed JSON
error block in the trailing buffer — handled explicitly rather than
assumed to always be a clean SSE frame.

### Response scoping: schema-enforced, not prompt-only

Originally, `responseMimeType: "application/json"` was set with no
matching `responseSchema` — the output shape was constrained by
`SYSTEM_INSTRUCTION` text alone. This is a soft constraint: every output
slot was a recipe field, so the model had no valid way to express "this
isn't a recipe request" and would launder off-topic prompts (e.g. "write
JavaScript hello world") into a plausible-looking fake recipe rather than
refuse. Prompt text alone cannot reliably override the structural
pressure of a forced output shape.

Fixed by giving the model a real output slot for every outcome, via a
Gemini `responseSchema` matching a Zod discriminated union
(`AiResponse` in `packages/shared`):
- `type: "recipe"` — a generated or modified recipe.
- `type: "food_info"` — a factual food/cooking/nutrition answer that
  isn't a recipe request.
- `type: "refused"` — out of scope, or an attempt to redefine the
  assistant's role (prompt injection).

**Scope boundary for `food_info`:** factual questions (nutrition facts,
substitutions, technique) are answered; questions requiring medical or
dietary-health judgment are refused, not answered — this is a liability
determination, not a factual lookup, and is deliberately conservative.
This boundary currently lives only in the Gemini system prompt string —
recorded here so a future prompt edit doesn't silently redefine it
without the trade-off being visible.

**Chat treats `food_info` and `refused` as normal, successful turns**
(persisted, `AiGeneration` logged `SUCCESS`) — the model did its job
correctly by declining or answering informationally; this is not a
failure path. **Single-shot generation** (`generateRecipeDraft`,
`generateRecipeDraftStream`, and `/v1/recipes/generate`) has no chat UI
to render a text answer or refusal into, so the same outcomes surface as
`422` with a distinct `error.code` per case
(`OUT_OF_SCOPE`/`FOOD_INFO_NOT_RECIPE`/`UNSAFE_OR_UNCLEAR`) instead.

Also fixed: the system instruction was previously spliced into
`contents[0]`'s text (chat's first turn) rather than sent as a true
system-level instruction. Since chat history is truncated to the most
recent `MAX_CHAT_HISTORY_TURNS`, a conversation exceeding that length
would truncate away the actual first turn while a stale `index === 0`
check kept assuming the instruction was still present — silently
dropping scope enforcement entirely on long conversations. Fixed by
using Gemini's native `systemInstruction` request field, sent on every
call independent of `contents`, removing the "first turn" special case
altogether rather than patching around it.

---

## 5. Public API (Phase 6)

### API key model

`rk_live_` + 32 random bytes, hex-encoded. Only a SHA-256 hash
(`keyHash`, unique) is stored; the raw key is shown to the user exactly
once, at creation, and is not retrievable again — same principle as the
OTP code and password-reset token.

Up to 5 concurrent active keys per user (an application-level check in
the creation service, not a schema constraint — a business rule that
may change, not a data-integrity rule). Supports rotation without
downtime: issue a new key, roll it out, revoke the old one, with no
window where zero valid key exists.

`rateLimitPerMinute` and `monthlyQuota` are fields on `ApiKey` itself,
not global constants — each key's limits can be tuned individually
(e.g. a higher-tier customer) without a code deploy.

### Atomic throttle and quota — the same pattern, twice, deliberately

Both the per-minute throttle and the monthly quota use an
increment-first, check-after Redis pattern:
```
count = INCR key
if count == 1: EXPIRE key <window>
allowed = count <= limit
```
This is the same class of fix already applied to the OTP attempt
counter (`HINCRBY`, not read-modify-write): a check-then-increment
sequence has a race window where two concurrent requests can both read
a value under the limit and both proceed, silently exceeding it.
Atomic-increment-first has no such window by construction.

**They are two separate mechanisms on purpose**, not one shared
counter: the throttle answers "too many requests right now" (fixed
60-second window, resets constantly) and exists to blunt abuse; the
quota answers "has this key used its allotment this billing period"
(resets on the UTC calendar month boundary) and is a product limit, not
an abuse control. Collapsing them would mean either the abuse throttle
resets monthly (useless against bursts) or the quota resets every
minute (useless as a usage cap).

**Quota counts every attempt that reaches it, including generations
that later fail upstream.** The alternative — only counting successes —
requires reserve-and-release semantics (decrement on failure), which
reopens a race window during the release lag and adds real complexity
to solve a problem with no real stakes at this stage (no billing yet).
Chosen deliberately, documented plainly in the public API docs rather
than left implicit.

**Fail-open on Redis errors, for both checks**, logged at `error` level.
Redis is already a hard dependency via sessions; failing closed here
would mean a transient Redis blip takes the entire public API offline
for every integrator — a worse production outcome than briefly
under-enforcing a limit during an outage.

### Distinguishing the two `429`s

`RATE_LIMITED` (throttle) and `QUOTA_EXCEEDED` (quota) are different
`error.code` values so a client can handle them differently. Only
`RATE_LIMITED` carries a `Retry-After` header — a `Retry-After` on a
monthly quota rejection would be misleading, since the real reset is a
calendar boundary, not a short delay.

### Rate limit / quota response headers

`X-RateLimit-Limit` / `-Remaining` / `-Reset` and `X-Quota-Limit` /
`-Remaining` / `-Reset` are set on every response from
`/v1/recipes/generate`, success or rejection — lets a well-behaved
client self-throttle without guessing or needing a separate
"check my limits" endpoint.

### Idempotency

An optional `Idempotency-Key` header, checked before any other work
(including body validation). On a cache hit, the original response
(status + body) is replayed exactly, with no re-validation, no
throttle/quota consumption, and no second call to Gemini. Exists to
protect against the standard production failure mode: a client times
out waiting for a response, can't tell whether the request actually
succeeded server-side, and retries — without this, that retry would
trigger a second real Gemini call and double-count quota. Cached in
Redis with a 24-hour TTL, scoped per API key so the same key value used
by two different callers is treated as two independent requests.

Unexpected (non-`AppError`) failures are deliberately never cached —
only classified, deterministic outcomes are safe to treat as replayable.

### `apiKeyAuth` — same contract as session `authenticate`

Sets `request.userId` identically to the session-based `authenticate`
preHandler, so every existing service function
(`recipeService.generateRecipeDraft`, etc.) works unchanged regardless
of which auth mechanism authorized the request. Also sets
`request.apiKeyId` and the key's own configured limits, for
downstream throttle/quota/usage-logging. Missing, malformed, unknown,
and revoked keys all produce an identical `401` — distinguishing them
would let a caller probe whether a specific key string was ever valid.

### Why the per-minute throttle is hand-rolled, not `@fastify/rate-limit`'s dynamic `max`

`@fastify/rate-limit` evaluates its limit during the `onRequest`
lifecycle phase by default — before `preHandler`, where `apiKeyAuth`
(and the per-key limit it resolves) runs. A dynamic `max` function
reading a value `apiKeyAuth` sets would be evaluated before that value
exists. Rather than depend on fragile hook-ordering, the per-minute
throttle for `/v1` is a standalone Redis counter (`lib/throttle.ts`),
identical in shape to the quota module, giving full explicit control
over execution order. `@fastify/rate-limit` (Redis-backed, `skipOnError:
true`) is still used as-is for the existing session-based internal
routes, where this ordering issue doesn't apply.

---

## 6. Known trade-offs and deliberately deferred work

- **Guest/anonymous access** — not built. Would require a second,
  non-throwing auth mode, an anonymous identity strategy (cookie or
  IP-based), and frontend routing changes — a genuinely separate
  feature, not a rider on any existing one.
- **Circuit breaker on the Gemini call for `/v1`** — flagged as real
  future value (protects both Gemini and the app's own retry budget
  under sustained upstream degradation) but not built; not a
  correctness or security gap, unlike the items above it.
- **Streaming for the public API** — `/v1/recipes/generate` is
  non-streaming by design in this version. Retry logic and streaming
  don't mix safely (a partial chunk already sent to a client can't be
  silently retried), so retry needed to exist first. A streaming
  variant is a planned additive endpoint, not a breaking change to the
  existing one.
- **Billing/Stripe** — explicitly out of scope. Usage tracking and a
  fixed quota demonstrate the metering engineering without payment
  infrastructure.
- **`UsageRecord` has no `userId` column**, only `apiKeyId` — reachable
  via the relation. Denormalizing would only help a query pattern that
  doesn't exist yet; adding it now would be speculative.

---

## 7. Real bugs hit and fixed (worth not repeating)

- **Cookie re-signing corruption:** passing an already-signed cookie
  value back into `reply.setCookie(..., { signed: true })` re-signs and
  corrupts it. Use the unsigned `sessionId`, not the raw signed cookie
  value, when refreshing.
- **Edits not actually landing on disk:** more than once, a file that
  "should" have compiled/behaved differently didn't, because an edit
  was never actually saved (or, once, a line was silently dropped
  during an edit — the `accumulated += chunk` omission that broke
  streaming generation for a period). Always re-view the actual file
  content when behavior doesn't match expectation, rather than trusting
  that an edit landed as intended.
- **Duplicate plugin registration:** `@fastify/rate-limit` was
  registered twice in `app.ts` while wiring in the Redis-backed store
  for Phase 6 — decorator plugins should be registered exactly once at
  a given scope.
- **File mix-ups during editing:** `auth.routes.ts` and
  `recipe.routes.ts` contents were once swapped mid-edit — caught by
  typecheck producing an obviously-wrong missing-module error, a
  reliable signal of a copy-paste mix-up rather than a real missing
  file.
- **`ioredis` v6** requires the named import `{ Redis }`, not a default
  import.
- **`@fastify/cookie` / `@fastify/rate-limit`** latest majors target
  Fastify 5; pinned to `^9.x` for Fastify `^4.28.0`.
- **Windows/PowerShell:** `curl` is aliased to `Invoke-WebRequest`,
  which does not accept real curl flags — use `curl.exe` explicitly, or
  `Invoke-RestMethod` natively. Line continuation is a backtick, not
  `\`. File locking (`EPERM`) blocks `prisma generate` while the dev
  server is running.
- **`packages/shared` must be rebuilt**, not just typechecked, before
  `apps/api` can see new exports — `apps/api` resolves against
  `packages/shared`'s built `dist/`, not its source.