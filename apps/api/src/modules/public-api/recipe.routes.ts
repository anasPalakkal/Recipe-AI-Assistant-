import type { FastifyInstance, FastifyReply, FastifyBaseLogger } from "fastify";
import { generateRecipeSchema } from "@recipeai/shared";
import * as recipeService from "../recipes/recipe.service.js";
import { prisma } from "../../lib/prisma.js";
import { apiKeyAuth } from "../../lib/api-key-auth.js";
import { checkAndIncrementThrottle, type ThrottleCheckResult } from "../../lib/throttle.js";
import { checkAndIncrementQuota, type QuotaCheckResult } from "../../lib/quota.js";
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

function setThrottleHeaders(reply: FastifyReply, throttle: ThrottleCheckResult): void {
  reply.header("X-RateLimit-Limit", String(throttle.limit));
  reply.header("X-RateLimit-Remaining", String(Math.max(throttle.limit - throttle.count, 0)));
  reply.header("X-RateLimit-Reset", String(throttle.resetAt));
}

function setQuotaHeaders(reply: FastifyReply, quota: QuotaCheckResult): void {
  reply.header("X-Quota-Limit", String(quota.limit));
  reply.header("X-Quota-Remaining", String(Math.max(quota.limit - quota.used, 0)));
  reply.header("X-Quota-Reset", String(quota.resetAt));
}

export default async function publicRecipeRoutes(app: FastifyInstance) {
  app.addHook("preHandler", apiKeyAuth);

  app.post("/generate", async (request, reply) => {
    const apiKeyId = request.apiKeyId!;
    const userId = request.userId!;
    const idempotencyKey = readIdempotencyKey(request.headers["idempotency-key"]);

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
    setThrottleHeaders(reply, throttle);

    if (!throttle.allowed) {
      const err = new TooManyRequestsError("Rate limit exceeded. Try again shortly.", "RATE_LIMITED", 60);
      reply.header("Retry-After", "60");
      await logUsage(apiKeyId, err.statusCode, request.log);
      return reply.status(err.statusCode).send(formatAppErrorBody(err));
    }

    const quota = await checkAndIncrementQuota(
      apiKeyId,
      request.apiKeyMonthlyQuota ?? DEFAULT_MONTHLY_QUOTA,
      request.log,
    );
    setQuotaHeaders(reply, quota);

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

      await logUsage(apiKeyId, 500, request.log);
      throw err;
    }
  });
}