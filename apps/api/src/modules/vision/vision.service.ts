import { Prisma, GenerationStatus } from "@prisma/client";
import type { FastifyBaseLogger } from "fastify";
import { aiProvider } from "../../lib/ai/index.js";
import { validateAndProcessImage } from "../../lib/vision/validate-image.js";
import { checkAndIncrementVisionQuota } from "../../lib/vision/quota.js";
import { prisma } from "../../lib/prisma.js";
import { TooManyRequestsError, UpstreamServiceError } from "../../lib/errors.js";

// Provisional - not derived from actual Gemini vision pricing or observed
// usage yet. See Phase 9 backlog: revisit once real usage data exists.
const VISION_DAILY_LIMIT = 5;

export async function analyzeImage(
  userId: string,
  rawBuffer: Buffer,
  question: string | undefined,
  logger: FastifyBaseLogger,
) {
  // Validate first (free, local) before charging quota - a rejected
  // upload (wrong type, too large) shouldn't cost the user their daily
  // allowance for a call that never reached Gemini.
  const { base64, mimeType } = await validateAndProcessImage(rawBuffer);

  const quota = await checkAndIncrementVisionQuota(userId, VISION_DAILY_LIMIT, logger);
  if (!quota.allowed) {
    if (quota.redisUnavailable) {
      throw new UpstreamServiceError("Usage tracking is temporarily unavailable. Please retry shortly.");
    }
    throw new TooManyRequestsError(
      "Daily image analysis limit reached. Try again tomorrow.",
      "VISION_QUOTA_EXCEEDED",
    );
  }

  const promptLabel = question ?? "[image analysis]";

  try {
    const { response, raw } = await aiProvider.analyzeImage(base64, mimeType, question, "internal");
    await prisma.aiGeneration.create({
      data: {
        userId,
        prompt: promptLabel,
        rawResponse: raw as Prisma.InputJsonValue,
        status: GenerationStatus.SUCCESS,
      },
    });
    return response;
  } catch (err) {
    await prisma.aiGeneration.create({
      data: {
        userId,
        prompt: promptLabel,
        rawResponse: { error: err instanceof Error ? err.message : "Unknown error" },
        status: GenerationStatus.FAILED,
      },
    });
    throw err;
  }
}