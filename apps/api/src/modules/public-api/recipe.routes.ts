import type { FastifyInstance, FastifyBaseLogger } from "fastify";
import { generateRecipeSchema } from "@recipeai/shared";
import * as recipeService from "../recipes/recipe.service.js";
import { prisma } from "../../lib/prisma.js";
import { apiKeyAuth } from "../../lib/api-key-auth.js";
import { checkAndIncrementThrottle } from "../../lib/throttle.js";
import { checkAndIncrementQuota } from "../../lib/quota.js";
import { getCachedResponse, cacheResponse } from "../../lib/idempotency.js";
import { AppError, TooManyRequestsError, formatAppErrorBody } from "../../lib/errors.js";

const ENDPOINT = "POST /v1/recipes/generate";
const DEFAULT_RATE_LIMIT_PER_MINUTE = 20;
const DEFAULT_MONTHLY_QUOTA = 300;

async function logUsage(
  apiKeyId: string,
  statusCode: number,
  logger: FastifyBaseLogger,
): Promise<void> {
  try {
    await prisma.usageRecord.create({ data: { apiKeyId, endpoint: ENDPOINT, statusCode } });
  } catch (err) {
    logger.error({ err, apiKeyId, statusCode }, "failed to write usage record");
  }
}

function readIdempotencyKey(header: string | string[] | undefined): string | undefined {
  return Array.isArray(header) ? header[0] : header;
}

export default async function publicRecipeRoutes(app: FastifyInstance) {
  app.addHook("preHandler", apiKeyAuth);

  app.post("/generate", async (request, reply) => {
    const apiKeyId = request.apiKeyId!;
    const userId = request.userId!;
    const idempotencyKey = readIdempotencyKey(request.headers["idempotency-key"]);

    // Checked before validation or any other work: a genuine retry with
    // the same key should replay the exact prior outcome without redoing
    // anything, including body validation.
    if (idempotencyKey) {
      const cached = await getCachedResponse(apiKeyId, idempotencyKey, request.log);
      if (cached) {
        return reply.status(cached.statusCode).send(cached.body);
      }
    }

    const { prompt } = generateRecipeSchema.parse(request.body);

    const throttle = await checkAndIncrementThrottle(
      apiKeyId,
      request.apiKeyRateLimitPerMinute ?? DEFAULT_RATE_LIMIT_PER_MINUTE,
      request.log,
    );
    if (!throttle.allowed) {
      const err = new TooManyRequestsError("Rate limit exceeded. Try again shortly.", "RATE_LIMITED", 60);
      reply.header("Retry-After", "60");
      await logUsage(apiKeyId, err.statusCode, request.log);
      return reply.status(err.statusCode).send(formatAppErrorBody(err));
    }

    // Quota is checked (and incremented) before generation begins, so a
    // disconnected or aborted request never gets a free uncounted call.
    // This does mean requests that fail after this point still count —
    // see architecture.md §6 for the policy and reasoning.
    const quota = await checkAndIncrementQuota(
      apiKeyId,
      request.apiKeyMonthlyQuota ?? DEFAULT_MONTHLY_QUOTA,
      request.log,
    );
    if (!quota.allowed) {
      const err = new TooManyRequestsError("Monthly quota exceeded.", "QUOTA_EXCEEDED");
      await logUsage(apiKeyId, err.statusCode, request.log);
      return reply.status(err.statusCode).send(formatAppErrorBody(err));
    }

    try {
      const draft = await recipeService.generateRecipeDraft(userId, prompt, "public");
      await logUsage(apiKeyId, 200, request.log);
      if (idempotencyKey) {
        await cacheResponse(apiKeyId, idempotencyKey, { statusCode: 200, body: draft }, request.log);
      }
      return reply.status(200).send(draft);
    } catch (err) {
      if (err instanceof AppError) {
        const body = formatAppErrorBody(err);
        await logUsage(apiKeyId, err.statusCode, request.log);
        if (idempotencyKey) {
          await cacheResponse(apiKeyId, idempotencyKey, { statusCode: err.statusCode, body }, request.log);
        }
        return reply.status(err.statusCode).send(body);
      }

      // Unexpected, non-AppError failure: log for usage purposes, but
      // rethrow so the global error handler produces the standard 500 —
      // and deliberately don't cache it, since an unclassified failure
      // isn't safe to treat as a deterministic, replayable outcome.
      await logUsage(apiKeyId, 500, request.log);
      throw err;
    }
  });
}