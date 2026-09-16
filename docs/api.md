# RecipeAI Public API (v1)

Base URL: `https://api.recipeai.app` (replace with your deployed host; `http://localhost:4000` in local development)

## Authentication

All `/v1` requests require an API key, sent as a Bearer token:


Keys are prefixed `rk_live_` followed by a random hex string.
```
Authorization: Bearer <YOUR_API_KEY>
```

API keys are created and managed from your account dashboard (session-authenticated, not part of this API):

| Action | Endpoint |
|---|---|
| Create a key | `POST /internal/api-keys` |
| List your keys | `GET /internal/api-keys` |
| Revoke a key | `DELETE /internal/api-keys/:id` |

Your raw key is shown exactly once, at creation. It cannot be retrieved again — store it securely. If lost, revoke it and create a new one.

You may have up to 5 active keys at a time, so you can rotate a key (issue a new one, roll it out, then revoke the old one) without downtime.

A request with a missing, malformed, unknown, or revoked key returns:

```json
HTTP 401
{ "error": { "code": "UNAUTHORIZED", "message": "Invalid API key" } }
```

## Endpoints

### `POST /v1/recipes/generate`

Generates a recipe draft from a natural-language prompt.

**Request body**

```json
{ "prompt": "a quick vegetarian pasta dish" }
```

| Field | Type | Constraints |
|---|---|---|
| `prompt` | string | 3–500 characters |

**Success response — `200`**

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

### Scope

This endpoint only generates recipes. A prompt unrelated to food, cooking,
or nutrition is rejected with `422 OUT_OF_SCOPE`. A prompt that asks a
food-related question rather than requesting a recipe (e.g. "how much
protein is in 100g of chicken") is rejected with `422
FOOD_INFO_NOT_RECIPE` — the answer is still included in `details.answer`
in case you want to surface it to your users rather than treat it as a
dead end.

**A rejected prompt for scope reasons (`422`) still counts against your
monthly quota**, consistent with the rule above: the request reached
this endpoint and was attempted.
```

This endpoint returns the generated draft only. It does not save anything to your recipe collection — that requires a separate authenticated save step (not part of this API version).

## Rate limits

Two independent limits apply per API key:

| Limit | Default | Resets |
|---|---|---|
| Requests per minute | 20 | Every 60 seconds (fixed window) |
| Requests per month | 300 | 1st of each month, UTC |

Limits may be configured differently for your specific key — check the response headers or your dashboard for your key's actual values.

**Failed generations still count against your monthly quota.** A request that reaches this endpoint and is attempted counts, whether or not the underlying generation succeeds. Requests rejected for rate limiting, quota, or validation before generation begins do not count against the monthly quota (validation and rate-limit rejections don't consume it; quota rejections are, by definition, already over the limit).

### Rate limit exceeded — `429`

```json
{ "error": { "code": "RATE_LIMITED", "message": "Rate limit exceeded. Try again shortly." } }
```

Response includes a `Retry-After: 60` header. Wait at least this long before retrying.

### Monthly quota exceeded — `429`

```json
{ "error": { "code": "QUOTA_EXCEEDED", "message": "Monthly quota exceeded." } }
```

No `Retry-After` header is sent — quota resets on the calendar month boundary, not after a short delay. Retrying sooner will not succeed.

These two `429` cases are distinguished by `error.code` so you can handle them differently: back off and retry shortly for `RATE_LIMITED`, but stop and wait for the next billing period for `QUOTA_EXCEEDED`.

## Idempotency

To safely retry a request after a network error or timeout without risking a duplicate generation (and duplicate quota usage), send an `Idempotency-Key` header with a unique value per logical request:

```
Idempotency-Key: a-unique-value-you-generate
```

If a request with the same key was already processed in the last 24 hours, the identical original response (including its original status code) is replayed immediately, without re-running generation or consuming additional quota.

Use a new, unique key for each distinct generation request (e.g. a UUID generated client-side per user action). Reusing a key intentionally is exactly how you get a safe replay; reusing it by accident will return a stale cached result instead of a new generation.

Idempotency keys are scoped per API key — the same key value used with two different API keys is treated as two separate requests.

## Error format

All errors follow this shape:

```json
{
  "error": {
    "code": "MACHINE_READABLE_CODE",
    "message": "Human-readable description",
    "details": { }
  }
}
```

`details` is omitted when not applicable.

| Status | Code | Meaning |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Request body failed validation |
| 401 | `UNAUTHORIZED` | Missing, malformed, unknown, or revoked API key |
| 429 | `RATE_LIMITED` | Too many requests per minute; retry after the given `Retry-After` |
| 429 | `QUOTA_EXCEEDED` | Monthly quota used up; resets next calendar month (UTC) |
| 502 | `UPSTREAM_SERVICE_ERROR` | The generation provider failed or timed out after internal retries |
| 500 | `INTERNAL_ERROR` | Unexpected server error |
| 422 | `OUT_OF_SCOPE` | Prompt isn't related to recipes, cooking, or nutrition |
| 422 | `FOOD_INFO_NOT_RECIPE` | Prompt was a food/nutrition question rather than a recipe request — see `details.answer` |
| 422 | `UNSAFE_OR_UNCLEAR` | Prompt attempted to bypass or redefine the assistant's scope |

## Notes

- This endpoint is non-streaming. Streaming support is planned as a future addition and will be a separate endpoint, not a breaking change to this one.
- All traffic to this API is generated using a dedicated upstream capacity pool, isolated from RecipeAI's own internal application traffic — heavy usage on this API does not affect the availability of the RecipeAI app itself, or vice versa.