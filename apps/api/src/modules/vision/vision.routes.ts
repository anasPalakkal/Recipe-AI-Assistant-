import type { FastifyInstance } from "fastify";
import { z } from "zod";
import * as visionService from "./vision.service.js";
import { sessionRateLimitKey } from "../../lib/rate-limit.js";
import { BadRequestError } from "../../lib/errors.js";

const visionAnalyzeQuerySchema = z.object({
  question: z.string().trim().min(1).max(300).optional(),
});

// Coarse per-minute cap in addition to the daily quota - stops a burst of
// rapid uploads before the daily counter is even the limiting factor.
const VISION_RATE_LIMIT = { max: 5, timeWindow: "1 minute", keyGenerator: sessionRateLimitKey };

export default async function visionRoutes(app: FastifyInstance) {
  app.post(
    "/analyze",
    { config: { rateLimit: VISION_RATE_LIMIT } },
    async (request, reply) => {
      const { question } = visionAnalyzeQuerySchema.parse(request.query);

      const file = await request.file();
      if (!file) {
        throw new BadRequestError("No image file provided", "IMAGE_REQUIRED");
      }

      const buffer = await file.toBuffer();
      if (file.file.truncated) {
        throw new BadRequestError("Image exceeds the upload limit", "IMAGE_TOO_LARGE");
      }

      const result = await visionService.analyzeImage(request.userId!, buffer, question, request.log);
      return reply.send(result);
    },
  );
}