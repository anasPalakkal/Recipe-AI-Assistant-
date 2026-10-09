import { beforeEach, describe, expect, it, vi } from "vitest";
import Fastify from "fastify";
import type { FastifyRequest } from "fastify";
import { ZodError } from "zod";

vi.mock("../../lib/prisma.js", () => ({
  prisma: { usageRecord: { create: vi.fn() } },
}));
vi.mock("../../lib/api-key-auth.js", () => ({
  apiKeyAuth: vi.fn(async (request: FastifyRequest) => {
    request.userId = "user-1";
    request.apiKeyId = "key-1";
    request.apiKeyRateLimitPerMinute = 20;
    request.apiKeyMonthlyQuota = 300;
  }),
}));
vi.mock("../../lib/throttle.js", () => ({ checkAndIncrementThrottle: vi.fn() }));
vi.mock("../../lib/quota.js", () => ({ checkAndIncrementQuota: vi.fn() }));
vi.mock("../../lib/idempotency.js", () => ({
  getCachedResponse: vi.fn(),
  cacheResponse: vi.fn(),
}));
vi.mock("../recipes/recipe.service.js", () => ({ generateRecipeDraft: vi.fn() }));
vi.mock("../../lib/daily-limit.js", () => ({ checkAndIncrementDaily: vi.fn() }));

import publicRecipeRoutes from "./recipe.routes.js";
import { prisma } from "../../lib/prisma.js";
import { checkAndIncrementThrottle } from "../../lib/throttle.js";
import { checkAndIncrementQuota } from "../../lib/quota.js";
import { getCachedResponse, cacheResponse } from "../../lib/idempotency.js";
import * as recipeService from "../recipes/recipe.service.js";
import { UnprocessableEntityError } from "../../lib/errors.js";
import { checkAndIncrementDaily } from "../../lib/daily-limit.js";

const throttle = vi.mocked(checkAndIncrementThrottle);
const quota = vi.mocked(checkAndIncrementQuota);
const getCached = vi.mocked(getCachedResponse);
const cache = vi.mocked(cacheResponse);
const generate = vi.mocked(recipeService.generateRecipeDraft);
const createUsage = vi.mocked(prisma.usageRecord.create);

const allowedThrottle = { allowed: true, limit: 20, count: 1, resetAt: 1_800_000_000 } as never;
const allowedQuota = { allowed: true, limit: 300, used: 1, resetAt: 1_800_000_000 } as never;
const draft = { recipe: { title: "Pasta" }, image: null } as never;
const daily = vi.mocked(checkAndIncrementDaily);
const allowedDaily = { allowed: true, limit: 3, used: 1, resetAt: 1_800_000_000 } as never;

async function buildTestApp() {
  const app = Fastify();
  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof ZodError) {
      return reply.status(400).send({ error: { code: "VALIDATION_ERROR" } });
    }
    return reply.status(500).send({ error: { code: "INTERNAL_ERROR" } });
  });
  await app.register(publicRecipeRoutes, { prefix: "/v1/recipes" });
  return app;
}

function post(app: Awaited<ReturnType<typeof buildTestApp>>, headers: Record<string, string> = {}) {
  return app.inject({
    method: "POST",
    url: "/v1/recipes/generate",
    headers,
    payload: { prompt: "pasta" },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  getCached.mockResolvedValue(null);
  throttle.mockResolvedValue(allowedThrottle);
  quota.mockResolvedValue(allowedQuota);
  generate.mockResolvedValue(draft);
  createUsage.mockResolvedValue({} as never);
  daily.mockResolvedValue(allowedDaily);
});

describe("POST /v1/recipes/generate", () => {
  it("runs throttle, then quota, then generation", async () => {
    const app = await buildTestApp();

    const response = await post(app);

    expect(response.statusCode).toBe(200);
    expect(throttle.mock.invocationCallOrder[0]).toBeLessThan(quota.mock.invocationCallOrder[0]!);
    expect(quota.mock.invocationCallOrder[0]).toBeLessThan(generate.mock.invocationCallOrder[0]!);
    expect(response.headers["x-ratelimit-limit"]).toBe("20");
    expect(response.headers["x-quota-limit"]).toBe("300");
    expect(createUsage).toHaveBeenCalledWith({
      data: expect.objectContaining({ apiKeyId: "key-1", statusCode: 200 }),
    });
  });

  it("replays a cached idempotent response without consuming throttle, quota or generation", async () => {
    getCached.mockResolvedValue({ statusCode: 200, body: { cached: true } } as never);
    const app = await buildTestApp();

    const response = await post(app, { "idempotency-key": "abc" });

    expect(response.json()).toEqual({ cached: true });
    expect(throttle).not.toHaveBeenCalled();
    expect(quota).not.toHaveBeenCalled();
    expect(generate).not.toHaveBeenCalled();
  });

  it("rejects an invalid body before throttle or quota are consumed", async () => {
    const app = await buildTestApp();

    const response = await app.inject({
      method: "POST",
      url: "/v1/recipes/generate",
      payload: {},
    });

    expect(response.statusCode).toBe(400);
    expect(throttle).not.toHaveBeenCalled();
    expect(quota).not.toHaveBeenCalled();
  });

  it("returns RATE_LIMITED with Retry-After and skips quota and generation", async () => {
    throttle.mockResolvedValue({ ...(allowedThrottle as object), allowed: false } as never);
    const app = await buildTestApp();

    const response = await post(app);

    expect(response.statusCode).toBe(429);
    expect(response.json().error.code).toBe("RATE_LIMITED");
    expect(response.headers["retry-after"]).toBe("60");
    expect(quota).not.toHaveBeenCalled();
    expect(generate).not.toHaveBeenCalled();
  });

  it("returns QUOTA_EXCEEDED without Retry-After and skips generation", async () => {
    quota.mockResolvedValue({ ...(allowedQuota as object), allowed: false } as never);
    const app = await buildTestApp();

    const response = await post(app);

    expect(response.statusCode).toBe(429);
    expect(response.json().error.code).toBe("QUOTA_EXCEEDED");
    expect(response.headers["retry-after"]).toBeUndefined();
    expect(generate).not.toHaveBeenCalled();
  });

  it("reports a Redis outage during the quota check as an upstream error, not over-quota", async () => {
    quota.mockResolvedValue({
      ...(allowedQuota as object),
      allowed: false,
      redisUnavailable: true,
    } as never);
    const app = await buildTestApp();

    const response = await post(app);

    expect(response.statusCode).toBe(502);
    expect(response.json().error.code).toBe("UPSTREAM_SERVICE_ERROR");
  });

  it("caches classified failures for idempotent replay", async () => {
    generate.mockRejectedValue(new UnprocessableEntityError("nope", "OUT_OF_SCOPE"));
    const app = await buildTestApp();

    const response = await post(app, { "idempotency-key": "abc" });

    expect(response.statusCode).toBe(422);
    expect(cache).toHaveBeenCalledWith(
      "key-1",
      "abc",
      expect.objectContaining({ statusCode: 422 }),
      expect.anything(),
    );
  });

  it("does not cache unexpected failures", async () => {
    generate.mockRejectedValue(new Error("boom"));
    const app = await buildTestApp();

    const response = await post(app, { "idempotency-key": "abc" });

    expect(response.statusCode).toBe(500);
    expect(cache).not.toHaveBeenCalled();
  });

    it("checks the daily limit after throttle and before quota", async () => {
    const app = await buildTestApp();

    await post(app);

    expect(throttle.mock.invocationCallOrder[0]).toBeLessThan(daily.mock.invocationCallOrder[0]!);
    expect(daily.mock.invocationCallOrder[0]).toBeLessThan(quota.mock.invocationCallOrder[0]!);
  });

  it("returns DAILY_LIMIT_EXCEEDED without consuming monthly quota or generating", async () => {
    daily.mockResolvedValue({ ...(allowedDaily as object), allowed: false, used: 4 } as never);
    const app = await buildTestApp();

    const response = await post(app);

    expect(response.statusCode).toBe(429);
    expect(response.json().error.code).toBe("DAILY_LIMIT_EXCEEDED");
    expect(response.headers["retry-after"]).toBeUndefined();
    expect(quota).not.toHaveBeenCalled();
    expect(generate).not.toHaveBeenCalled();
  });
}); 