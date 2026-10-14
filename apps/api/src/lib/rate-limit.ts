import type { FastifyRequest } from "fastify";
import { clientIp } from "./internal-proxy.js";

export function sessionRateLimitKey(request: FastifyRequest): string {
  return request.cookies?.sid ?? clientIp(request);
}

// apiKeyId is set by apiKeyAuth before rate limiting runs; the IP fallback is
// a defensive floor, not an expected path.
export function apiKeyRateLimitKey(request: FastifyRequest): string {
  return request.apiKeyId ?? clientIp(request);
}