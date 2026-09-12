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

// Reverse index: lets us find and revoke every active session for a user
// (e.g. on password reset) without scanning all Redis keys. Not a TTL'd
// key — cleaned lazily whenever revokeAllSessions runs.
function userSessionsKey(userId: string): string {
  return `user-sessions:${userId}`;
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
  await redis.sadd(userSessionsKey(userId), sessionId);
  reply.setCookie(SESSION_COOKIE_NAME, sessionId, cookieOptions());
}

export async function destroySession(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const raw = request.cookies[SESSION_COOKIE_NAME];
  if (raw) {
    const unsigned = request.unsignCookie(raw);
    if (unsigned.valid && unsigned.value) {
      const sessionId = unsigned.value;
      const userId = await redis.get(sessionKey(sessionId));
      await redis.del(sessionKey(sessionId));
      if (userId) {
        await redis.srem(userSessionsKey(userId), sessionId);
      }
    }
  }
  reply.clearCookie(SESSION_COOKIE_NAME, { path: "/" });
}

// Used by password reset: invalidates every active session for a user,
// e.g. to log out a possible attacker who had a live session before the
// legitimate owner regained control of the account.
export async function revokeAllSessions(userId: string): Promise<void> {
  const sessionIds = await redis.smembers(userSessionsKey(userId));
  if (sessionIds.length > 0) {
    await redis.del(...sessionIds.map(sessionKey));
  }
  await redis.del(userSessionsKey(userId));
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
    reply.setCookie(SESSION_COOKIE_NAME, sessionId, cookieOptions());

    request.userId = userId;
  });
});