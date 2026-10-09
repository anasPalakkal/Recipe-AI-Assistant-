import { beforeEach, describe, expect, it, vi } from "vitest";
import type { FastifyReply, FastifyRequest } from "fastify";

vi.mock("./prisma.js", () => ({
  prisma: { apiKey: { findUnique: vi.fn(), update: vi.fn() } },
}));

import { prisma } from "./prisma.js";
import { apiKeyAuth } from "./api-key-auth.js";
import { hashApiKey } from "./api-key.js";
import { UnauthorizedError } from "./errors.js";

const findUnique = vi.mocked(prisma.apiKey.findUnique);
const update = vi.mocked(prisma.apiKey.update);

function makeRequest(authorization?: string) {
  return {
    headers: { authorization },
    log: { error: vi.fn() },
  } as unknown as FastifyRequest;
}

const reply = {} as FastifyReply;

const activeKey = {
  id: "key-1",
  userId: "user-1",
  rateLimitPerMinute: 20,
  monthlyQuota: 300,
  revokedAt: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  update.mockResolvedValue({} as never);
});

describe("apiKeyAuth", () => {
  it.each([undefined, "Basic abc", "Bearer ", "Bearer    "])(
    "rejects a missing or malformed header (%s) before any database lookup",
    async (header) => {
      await expect(apiKeyAuth(makeRequest(header), reply)).rejects.toBeInstanceOf(UnauthorizedError);
      expect(findUnique).not.toHaveBeenCalled();
    },
  );

  it("looks the key up by its hash, never the raw value", async () => {
    findUnique.mockResolvedValue(null);

    await expect(apiKeyAuth(makeRequest("Bearer rk_live_secret"), reply)).rejects.toBeInstanceOf(
      UnauthorizedError,
    );
    expect(findUnique).toHaveBeenCalledWith({ where: { keyHash: hashApiKey("rk_live_secret") } });
  });

  it("returns the same error for unknown and revoked keys", async () => {
    findUnique.mockResolvedValueOnce(null);
    const unknown = await apiKeyAuth(makeRequest("Bearer rk_live_a"), reply).catch((e: Error) => e);

    findUnique.mockResolvedValueOnce({ ...activeKey, revokedAt: new Date() } as never);
    const revoked = await apiKeyAuth(makeRequest("Bearer rk_live_b"), reply).catch((e: Error) => e);

    expect(unknown).toBeInstanceOf(UnauthorizedError);
    expect(revoked).toBeInstanceOf(UnauthorizedError);
    expect((revoked as Error).message).toBe((unknown as Error).message);
  });

  it("populates the request and records last use for a valid key", async () => {
    findUnique.mockResolvedValue(activeKey as never);
    const request = makeRequest("Bearer rk_live_valid");

    await apiKeyAuth(request, reply);

    expect(request.userId).toBe("user-1");
    expect(request.apiKeyId).toBe("key-1");
    expect(request.apiKeyRateLimitPerMinute).toBe(20);
    expect(request.apiKeyMonthlyQuota).toBe(300);
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "key-1" } }),
    );
  });

  it("does not fail the request when the last-used update fails", async () => {
    findUnique.mockResolvedValue(activeKey as never);
    update.mockRejectedValue(new Error("db down"));
    const request = makeRequest("Bearer rk_live_valid");

    await expect(apiKeyAuth(request, reply)).resolves.toBeUndefined();
  });
});