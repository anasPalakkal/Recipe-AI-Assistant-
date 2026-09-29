# RecipeAI Public API (v1)

Base URL: `http://localhost:4000` in local development. Replace with your deployed host in production.

## Quick start

```bash
curl -X POST http://localhost:4000/v1/recipes/generate \
  -H "Authorization: Bearer rk_live_YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"prompt": "a quick vegetarian pasta dish"}'
```

## Authentication

All `/v1` requests require an API key sent as a Bearer token:

```
Authorization: Bearer <YOUR_API_KEY>
```

Keys start with `rk_live_` followed by 64 hex characters. The scheme name is matched case-sensitively (`Bearer`).

Requests fail with `401 UNAUTHORIZED` in these cases:

| Cause | Message |
|---|---|
| Header missing, or not in `Bearer <key>` form | `Missing or malformed Authorization header` |
| Key unknown or deleted | `Invalid API key` |

Unknown and deleted keys deliberately return the same response, so a caller cannot probe whether a key string was ever valid.

```json
HTTP 401
{ "error": { "code": "UNAUTHORIZED", "message": "Invalid API key" } }
```

## Managing keys

Keys are created and deleted from the dashboard in the RecipeAI web app. Key management is session-authenticated and is **not** part of the public API. The underlying endpoints are listed for reference only:

| Action | Endpoint |
|---|---|
| Create a key | `POST /internal/api-keys` |
| List keys | `GET /internal/api-keys` |
| Delete a key | `DELETE /internal/api-keys/:id` |
| Dashboard summary | `GET /internal/api-keys/dashboard` |
| Usage history | `GET /internal/api-keys/usage?range=7d\|30d\|90d&keyId=<id>` |

- The raw key is shown **once**, at creation, and cannot be retrieved again. If lost, delete it and create a new one.
- You can hold up to 5 active keys, so you can rotate without downtime: create the new key, roll it out, then delete the old one.
- Deleting a key takes effect immediately, and further requests with it return `401`. Its usage history is kept.
- Deleting is idempotent.
- Limits (`rateLimitPerMinute`, `monthlyQuota`) are per key and are currently set server-side. They cannot be changed from the dashboard.

## Endpoints

### `POST /v1/recipes/generate`

Generates a recipe draft from a natural-language prompt. The draft is returned only. Nothing is saved to any recipe collection.

**Request body**

```json
{ "prompt": "a quick vegetarian pasta dish" }
```

| Field | Type | Constraints |
|---|---|---|
| `prompt` | string | 3–500 characters |

**Optional request header**

| Header | Purpose |
|---|---|
| `Idempotency-Key` | Safe retries. See [Idempotency](#idempotency). |

**Success response: `200`**

```json
{
  "title": "Garlic Butter Pasta with Cherry Tomatoes",
  "description": "A quick weeknight pasta with a light garlic butter sauce.",
  "servings": 2,
  "prepTimeMinutes": 10,
  "cookTimeMinutes": 15,
  "ingredients": [
    { "name": "spaghetti", "quantity": 200, "unit": "g" }
  ],
  "steps": [
    { "content": "Bring a large pot of salted water to a boil." }
  ]
}
```

**Scope.** This endpoint only generates recipes:

- A prompt unrelated to food, cooking or nutrition returns `422 OUT_OF_SCOPE`.
- A food question that is not a recipe request (for example, "how much protein is in 100g of chicken") returns `422 FOOD_INFO_NOT_RECIPE`. The answer is included in `details.answer` so you can show it instead of treating it as a dead end.
- A prompt that tries to bypass or redefine the assistant's scope returns `422 UNSAFE_OR_UNCLEAR`.

These `422` responses still count against your monthly quota, because the request reached generation.

## Response headers

Sent on every response after authentication, including rejections, so a client can see its remaining budget without a separate call.

| Header | Meaning |
|---|---|
| `X-RateLimit-Limit` | Requests allowed per minute for this key |
| `X-RateLimit-Remaining` | Requests left in the current window |
| `X-RateLimit-Reset` | When the current window resets |
| `X-Quota-Limit` | Requests allowed per month for this key |
| `X-Quota-Remaining` | Requests left this month |
| `X-Quota-Reset` | Unix time (seconds) when the quota resets: the start of next month, UTC |
| `Retry-After` | Seconds to wait. Sent only with `RATE_LIMITED`. |

`X-Quota-*` headers are absent on responses rejected by the rate limiter, because the quota check is never reached. They are also absent on `400` and `401` responses and on idempotent replays.

## Rate limits and quota

Two independent limits apply per API key:

| Limit | Default | Window |
|---|---|---|
| Requests per minute | 20 | Fixed 60-second window |
| Requests per month | 300 | Calendar month, resets on the 1st at 00:00 UTC |

Your key's actual values may differ. Read them from the response headers or the dashboard.

Checks run in this order: authentication, validation, rate limit, quota, generation. This determines what counts:

| Outcome | Consumes rate limit | Consumes quota |
|---|---|---|
| `400` validation error | No | No |
| `429 RATE_LIMITED` | Yes | **No** |
| `429 QUOTA_EXCEEDED` | Yes | Already over the limit |
| Request that reaches generation and succeeds | Yes | Yes |
| Request that reaches generation and fails (`422`, `502`) | Yes | **Yes** |

The quota is charged before generation starts, so a client that disconnects mid-request is still counted.

### `429 RATE_LIMITED`

```json
{ "error": { "code": "RATE_LIMITED", "message": "Rate limit exceeded. Try again shortly." } }
```

Includes `Retry-After: 60`. Back off and retry.

### `429 QUOTA_EXCEEDED`

```json
{ "error": { "code": "QUOTA_EXCEEDED", "message": "Monthly quota exceeded." } }
```

No `Retry-After` is sent. Retrying will not succeed until the quota resets (see `X-Quota-Reset`).

Handle these two `429` cases differently, using `error.code`: retry shortly for `RATE_LIMITED`, and stop for `QUOTA_EXCEEDED`.

## Idempotency

To retry safely after a network error or timeout without a duplicate generation or duplicate quota use, send an `Idempotency-Key` header with a value unique to each logical request (for example, a UUID per user action):

```
Idempotency-Key: a-unique-value-you-generate
```

If a request with the same key was already processed in the last 24 hours, the original response is replayed with its original status code. A replay:

- is checked before validation, rate limiting and quota, so it consumes none of them
- does not re-run generation
- does not create a usage record

Keys are scoped per API key. Responses from unexpected `500` errors are never cached, so those requests can be retried. Reusing a key by accident returns the stale cached result instead of a new generation.

## Usage tracking

Every request that passes authentication and validation is recorded and shown in the dashboard: requests per day, and per key, with separate counts for rate-limited and quota-exceeded requests. Idempotent replays and `400` responses are not recorded. The dashboard's "Quota used" figure excludes rate-limited requests, since they don't consume quota.

## Errors

All errors use this shape (`details` is omitted when not applicable):

```json
{
  "error": {
    "code": "MACHINE_READABLE_CODE",
    "message": "Human-readable description",
    "details": {}
  }
}
```

| Status | Code | Meaning |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Request body failed validation. `details` describes the fields. |
| 401 | `UNAUTHORIZED` | Missing, malformed, unknown or deleted API key |
| 422 | `OUT_OF_SCOPE` | Prompt is not about recipes, cooking or nutrition |
| 422 | `FOOD_INFO_NOT_RECIPE` | Prompt was a food question, not a recipe request. See `details.answer`. |
| 422 | `UNSAFE_OR_UNCLEAR` | Prompt tried to bypass or redefine the assistant's scope |
| 429 | `RATE_LIMITED` | Too many requests per minute. Respect `Retry-After`. |
| 429 | `QUOTA_EXCEEDED` | Monthly quota used up. Resets on the 1st, UTC. |
| 500 | `INTERNAL_ERROR` | Unexpected server error |
| 502 | `UPSTREAM_SERVICE_ERROR` | The generation provider failed, or usage tracking was temporarily unavailable. Safe to retry. |

## Notes

- This endpoint is non-streaming. Streaming will be added as a separate endpoint, not as a breaking change to this one.
- Public API traffic uses a dedicated upstream capacity pool, isolated from RecipeAI's own application traffic.