# Recipe Generation API (v1)

Generate structured recipes from a natural-language prompt.

Base URL: `https://YOUR_API_HOST`

## Quick start

Create an API key on the API keys page, then send a request:

```bash
curl -X POST https://YOUR_API_HOST/v1/recipes/generate \
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

Create and delete keys on the API keys page of the web app. The page also shows daily usage for each key.

- The raw key is shown **once**, when you create it, and cannot be retrieved again. If you lose it, delete it and create a new one.
- You can hold up to 3 active keys, so you can rotate without downtime: create the new key, roll it out, then delete the old one.
- Deleting a key takes effect immediately, and further requests with it return `401`.
- Rate limit, daily limit and monthly quota are set per key and cannot currently be changed from the dashboard.

## Generate a recipe

### `POST /v1/recipes/generate`

Generates a recipe from a prompt. The recipe is returned only. Nothing is saved.

**Request body**

```json
{ "prompt": "a quick vegetarian pasta dish" }
```

| Field | Type | Constraints |
|---|---|---|
| `prompt` | string | 3 to 500 characters |

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
- A food question that is not a recipe request (for example, "how much protein is in 100g of chicken") returns `422 FOOD_INFO_NOT_RECIPE`. The answer is included in `details.answer`, so you can show it instead of treating it as a dead end.
- A prompt that tries to bypass or redefine the assistant's scope returns `422 UNSAFE_OR_UNCLEAR`.

These `422` responses still count against your daily limit and monthly quota, because the request reached generation.

## Rate limits and quota

Three independent limits apply to each API key:

| Limit | Default | Window |
|---|---|---|
| Requests per minute | 5 | Fixed 60-second window |
| Requests per day | 3 | UTC day, resets at 00:00 UTC |
| Requests per month | 30 | Calendar month, resets on the 1st at 00:00 UTC |

Your key's actual values may differ. Read them from the response headers or the dashboard.

### Response headers

Sent on every response after authentication, including rejections, so a client can see its remaining budget without a separate call.

| Header | Meaning |
|---|---|
| `X-RateLimit-Limit` | Requests allowed per minute for this key |
| `X-Daily-Limit` | Requests allowed per day for this key |
| `X-Daily-Remaining` | Requests left today |
| `X-Daily-Reset` | Unix time (seconds) when the daily limit resets: 00:00 UTC |
| `X-RateLimit-Remaining` | Requests left in the current window |
| `X-RateLimit-Reset` | Unix time (seconds) when the current window resets |
| `X-Quota-Limit` | Requests allowed per month for this key |
| `X-Quota-Remaining` | Requests left this month |
| `X-Quota-Reset` | Unix time (seconds) when the quota resets: the start of next month, UTC |
| `Retry-After` | Seconds to wait. Sent only with `RATE_LIMITED`. |

`X-Daily-*` headers are absent on responses rejected by the rate limiter, and `X-Quota-*` headers are absent on responses rejected by the rate limiter or the daily limit, because those checks are never reached. Both are also absent on `400` and `401` responses and on idempotent replays.

### What counts against your limits

Checks run in this order: authentication, validation, rate limit, daily limit, quota, generation.

| Outcome | Consumes rate limit | Consumes quota |
|---|---|---|
| `400` validation error | No | No |
| `429 RATE_LIMITED` | Yes | No |
| `429 QUOTA_EXCEEDED` | Yes | Already over the limit |
| `429 DAILY_LIMIT_EXCEEDED` | Yes | No |
| Reaches generation and succeeds | Yes | Yes |
| Reaches generation and fails (`422`, `502`) | Yes | Yes |

The quota is charged before generation starts, so a client that disconnects mid-request is still counted.

### `429 RATE_LIMITED`

```json
{ "error": { "code": "RATE_LIMITED", "message": "Rate limit exceeded. Try again shortly." } }
```

Includes `Retry-After: 60`. Back off and retry.

### `429 DAILY_LIMIT_EXCEEDED`

```json
{ "error": { "code": "DAILY_LIMIT_EXCEEDED", "message": "Daily limit exceeded. Resets at 00:00 UTC." } }
```

No `Retry-After` is sent. Retrying will not succeed until the daily limit resets (see `X-Daily-Reset`).

Handle the three `429` cases differently, using `error.code`: retry shortly for `RATE_LIMITED`, and stop until the reset time for `DAILY_LIMIT_EXCEEDED` and `QUOTA_EXCEEDED`.

## Idempotency

To retry safely after a network error or timeout without a duplicate generation or a duplicate quota charge, send an `Idempotency-Key` header with a value unique to each logical request (for example, a UUID per user action):

```
Idempotency-Key: a-unique-value-you-generate
```

If a request with the same key was already processed in the last 24 hours, the original response is replayed with its original status code. A replay:

- is checked before validation, rate limiting and quota, so it consumes none of them
- does not run generation again
- does not appear in your usage history

Keys are scoped per API key. Responses from unexpected `500` errors are never cached, so those requests can be retried. Reusing a key by accident returns the stale cached result instead of a new generation.

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
| 429 | `DAILY_LIMIT_EXCEEDED` | Daily limit used up. Resets at 00:00 UTC. |
| 503 | `AI_QUOTA_EXHAUSTED` | The AI provider's daily capacity is used up. Try again later. |
| 500 | `INTERNAL_ERROR` | Unexpected server error |
| 502 | `UPSTREAM_SERVICE_ERROR` | The generation provider failed, or usage tracking was temporarily unavailable. Safe to retry. |