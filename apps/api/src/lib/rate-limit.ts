import type { FastifyRequest } from "fastify";

export function sessionRateLimitKey(request: FastifyRequest): string {
  return request.cookies?.sid ?? request.ip;
}