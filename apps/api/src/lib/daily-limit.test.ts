import { beforeEach, describe, expect, it, vi } from "vitest";
import type { FastifyBaseLogger } from "fastify";

vi.mock("./redis.js", () => ({ redis: { incr: vi.fn(), expire: vi.fn(), decr: vi.fn() } }));

import { redis } from "./redis.js";
import { checkAndIncrementDaily, rollbackDaily } from "./daily-limit.js";

const incr = vi.mocked(redis.incr);
const expire = vi.mocked(redis.expire);
const decr = vi.mocked(redis.decr);
const logger = { error: vi.fn(), warn: vi.fn() } as unknown as FastifyBaseLogger;

beforeEach(() => {
  vi.clearAllMocks();
});

describe("checkAndIncrementDaily", () => {
  it("allows up to the limit and sets expiry on the first use", async () => {
    incr.mockResolvedValue(1);

    const result = await checkAndIncrementDaily("chat", "user-1", 2, logger);

    expect(result).toMatchObject({ allowed: true, used: 1, limit: 2 });
    expect(expire).toHaveBeenCalledTimes(1);
  });

  it("rejects once the limit is exceeded and does not reset expiry", async () => {
    incr.mockResolvedValue(3);

    const result = await checkAndIncrementDaily("chat", "user-1", 2, logger);

    expect(result.allowed).toBe(false);
    expect(expire).not.toHaveBeenCalled();
  });

  it("fails closed when Redis is unavailable", async () => {
    incr.mockRejectedValue(new Error("down"));

    const result = await checkAndIncrementDaily("chat", "user-1", 2, logger);

    expect(result).toMatchObject({ allowed: false, redisUnavailable: true });
  });
});

describe("rollbackDaily", () => {
  it("decrements the counter and swallows Redis errors", async () => {
    decr.mockRejectedValue(new Error("down"));

    await expect(rollbackDaily("chat", "user-1", logger)).resolves.toBeUndefined();
    expect(decr).toHaveBeenCalledTimes(1);
  });
});