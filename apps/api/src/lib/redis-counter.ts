import { redis } from "./redis.js";

// A plain DECR on a missing or expired key creates it at -1 with no TTL,
// which makes the next INCR return 0 and skips the EXPIRE branch.
const DECREMENT_IF_POSITIVE = `
local current = tonumber(redis.call('GET', KEYS[1]))
if current and current > 0 then
  return redis.call('DECR', KEYS[1])
end
return 0`;

export async function decrementIfPositive(key: string): Promise<void> {
  await redis.eval(DECREMENT_IF_POSITIVE, 1, key);
}