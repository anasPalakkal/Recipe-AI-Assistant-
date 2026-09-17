import { createPexelsProvider } from "./pexels.provider.js";
import type { ImageProvider, PhotoResult } from "./types.js";
import { env } from "../../config/env.js";
import { redis } from "../redis.js";

export const imageProvider: ImageProvider = createPexelsProvider(env.PEXELS_API_KEY);

// Stock photos for a given dish don't go stale, and Pexels' free tier is a
// single shared budget across all three callers (internal generate, public
// generate, chat) - caching common queries now avoids burning that budget
// on repeat lookups, rather than waiting to add this after the limit is hit.
const CACHE_TTL_SECONDS = 60 * 60 * 24 * 7;
const CACHE_KEY_PREFIX = "image:pexels:";

function normalizeQuery(query: string): string {
  return query.trim().toLowerCase();
}

// Image lookup never fails generation - a recipe with no photo is still a
// valid result, a missing recipe is not. Failures are logged, not thrown,
// at every stage: cache read, live lookup, and cache write are each
// independently allowed to fail without affecting the caller.
export async function resolveRecipeImage(query: string): Promise<PhotoResult | null> {
  const cacheKey = `${CACHE_KEY_PREFIX}${normalizeQuery(query)}`;

  try {
    const cached = await redis.get(cacheKey);
    if (cached !== null) {
      // Empty string marks a cached "no result" - avoids repeatedly
      // burning quota on a query Pexels has nothing for.
      return cached === "" ? null : (JSON.parse(cached) as PhotoResult);
    }
  } catch (err) {
    console.warn("image cache read failed, falling back to live lookup", err);
  }

  let result: PhotoResult | null;
  try {
    result = await imageProvider.searchPhoto(query);
  } catch (err) {
    console.warn("image lookup failed, continuing without image", err);
    return null;
  }

  try {
    await redis.set(cacheKey, result ? JSON.stringify(result) : "", "EX", CACHE_TTL_SECONDS);
  } catch (err) {
    console.warn("image cache write failed", err);
  }

  return result;
}

export type { ImageProvider, PhotoResult } from "./types.js";