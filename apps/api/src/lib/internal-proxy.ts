import { timingSafeEqual } from "node:crypto";
import type { FastifyRequest } from "fastify";
import { env } from "../config/env.js";
import { ForbiddenError } from "./errors.js";

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

export async function requireInternalProxy(request: FastifyRequest): Promise<void> {
  if (!isTrustedProxy(request)) {
    throw new ForbiddenError("Forbidden");
  }
}