import { timingSafeEqual } from "node:crypto";
import type { FastifyRequest } from "fastify";
import { env } from "../config/env.js";

const proxySecret = Buffer.from(env.INTERNAL_PROXY_SECRET);

function isTrustedProxy(request: FastifyRequest): boolean {
  const provided = request.headers["x-internal-proxy-secret"];
  if (typeof provided !== "string") return false;
  const candidate = Buffer.from(provided);
  return candidate.length === proxySecret.length && timingSafeEqual(candidate, proxySecret);
}

// Behind the Next.js proxy, request.ip is the proxy's egress address. The
// real client IP is trusted only when the proxy proves its identity.
export function clientIp(request: FastifyRequest): string {
  if (isTrustedProxy(request)) {
    const forwarded = request.headers["x-client-ip"];
    if (typeof forwarded === "string" && forwarded.length > 0 && forwarded.length <= 45) {
      return forwarded;
    }
  }
  return request.ip;
}

export function sessionRateLimitKey(request: FastifyRequest): string {
  return request.cookies?.sid ?? clientIp(request);
}

// apiKeyId is set by apiKeyAuth before rate limiting runs; the IP fallback is
// a defensive floor, not an expected path.
export function apiKeyRateLimitKey(request: FastifyRequest): string {
  return request.apiKeyId ?? clientIp(request);
}