import type { FastifyRequest } from "fastify";

export function sessionRateLimitKey(request: FastifyRequest): string {
  return request.cookies?.sid ?? request.ip;
}

// apiKeyId is set by apiKeyAuth before rate limiting runs. Falling back to
// IP should never actually trigger in practice — it's a defensive floor,
// not an expected path.
export function apiKeyRateLimitKey(request: FastifyRequest): string {
  return request.apiKeyId ?? request.ip;
}