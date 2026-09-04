import fp from "fastify-plugin";
import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { randomUUID } from "node:crypto";
import { redis } from "../lib/redis.js";
import { env } from "../config/env.js";
import { UnauthorizedError } from "../lib/errors.js";

const SESSION_COOKIE_NAME = "sid";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days, sliding

declare module "fastify" {
  interface FastifyRequest {
    userId?: string;
  }
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

function sessionKey(sessionId: string): string {
  return `session:${sessionId}`;
}

function cookieOptions() {
  return {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    signed: true,
    maxAge: SESSION_TTL_SECONDS,
    domain: env.NODE_ENV === "production" ? env.COOKIE_DOMAIN : undefined,
  };
}

export async function createSession(reply: FastifyReply, userId: string): Promise<void> {
  const sessionId = randomUUID();
  await redis.set(sessionKey(sessionId), userId, "EX", SESSION_TTL_SECONDS);
  reply.setCookie(SESSION_COOKIE_NAME, sessionId, cookieOptions());
}

export async function destroySession(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const raw = request.cookies[SESSION_COOKIE_NAME];
  if (raw) {
    const unsigned = request.unsignCookie(raw);
    if (unsigned.valid && unsigned.value) {
      await redis.del(sessionKey(unsigned.value));
    }
  }
  reply.clearCookie(SESSION_COOKIE_NAME, { path: "/" });
}

export default fp(async function sessionPlugin(app: FastifyInstance) {
  app.decorate("authenticate", async (request: FastifyRequest, reply: FastifyReply) => {
    const raw = request.cookies[SESSION_COOKIE_NAME];
    if (!raw) throw new UnauthorizedError("Not authenticated");

    const unsigned = request.unsignCookie(raw);
    if (!unsigned.valid || !unsigned.value) throw new UnauthorizedError("Invalid session");

    const sessionId = unsigned.value;
    const userId = await redis.get(sessionKey(sessionId));
    if (!userId) throw new UnauthorizedError("Session expired");

    await redis.expire(sessionKey(sessionId), SESSION_TTL_SECONDS);
    reply.setCookie(SESSION_COOKIE_NAME, raw, cookieOptions());

    request.userId = userId;
  });
});