import { afterAll, afterEach, describe, expect, it } from "vitest";
import { redis } from "./redis.js";
import { decrementIfPositive } from "./redis-counter.js";

const key = `test:redis-counter:${process.pid}`;

afterEach(async () => {
  await redis.del(key);
});

afterAll(async () => {
  await redis.quit();
});

describe("decrementIfPositive", () => {
  it("leaves a missing key missing", async () => {
    await decrementIfPositive(key);

    expect(await redis.get(key)).toBeNull();
  });

  it("does not go below zero", async () => {
    await redis.set(key, "0");

    await decrementIfPositive(key);

    expect(await redis.get(key)).toBe("0");
  });

  it("decrements a positive value", async () => {
    await redis.set(key, "3");

    await decrementIfPositive(key);

    expect(await redis.get(key)).toBe("2");
  });
});