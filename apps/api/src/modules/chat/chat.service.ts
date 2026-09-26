import { Prisma, MessageRole, MessageResponseType, ImageSource, GenerationStatus } from "@prisma/client";
import type { FastifyBaseLogger } from "fastify";
import { aiProvider } from "../../lib/ai/index.js";
import { MAX_CHAT_HISTORY_TURNS } from "../../lib/ai/gemini.provider.js";
import { resolveRecipeImage } from "../../lib/images/index.js";
import { validateAndProcessImage } from "../../lib/vision/validate-image.js";
import { checkAndIncrementVisionQuota, rollbackVisionQuota } from "../../lib/vision/quota.js";
import { uploadUserImage, getSignedImageUrl, deleteImage } from "../../lib/storage/cloudinary.service.js";
import type { ChatTurn } from "../../lib/ai/types.js";
import { prisma } from "../../lib/prisma.js";
import { NotFoundError, ConflictError, UnprocessableEntityError, TooManyRequestsError, UpstreamServiceError } from "../../lib/errors.js";
import * as recipeService from "../recipes/recipe.service.js";
import type { AiResponse, ImageAnalysisResponse, UpdateConversationInput } from "@recipeai/shared";

const REFUSAL_MESSAGES: Record<"out_of_scope" | "unsafe_or_unclear", string> = {
  out_of_scope:
    "I can only help with recipes, cooking, and nutrition questions. Try asking me for a recipe or a food-related question.",
  unsafe_or_unclear:
    "I can't help with that request. Feel free to ask me for a recipe or a food-related question instead.",
};

// Provisional - not derived from actual Gemini vision pricing or observed
// usage yet. See Phase 9 backlog: revisit once real usage data exists.
const VISION_DAILY_LIMIT = 5;

const MAX_TITLE_LENGTH = 60;

function deriveTitleFromPrompt(prompt: string): string {
  const trimmed = prompt.trim();
  return trimmed.length > MAX_TITLE_LENGTH ? `${trimmed.slice(0, MAX_TITLE_LENGTH).trimEnd()}…` : trimmed;
}

async function getOwnedConversation(userId: string, conversationId: string) {
  const conversation = await prisma.conversation.findFirst({
    where: { id: conversationId, userId },
  });
  if (!conversation) throw new NotFoundError("Conversation not found");
  return conversation;
}

interface StoredMessage {
  role: MessageRole;
  content: string | null;
  recipeDraft: unknown;
  imageAnalysis: unknown;
  responseType: MessageResponseType | null;
}

// Reconstructs each assistant turn's content for the model's own context
// window, using whichever field actually holds that turn's data.
function toChatTurns(messages: StoredMessage[]): ChatTurn[] {
  const recent = messages.slice(-MAX_CHAT_HISTORY_TURNS);
  return recent.map((message) => {
    if (message.role === MessageRole.USER) {
      return { role: "user" as const, content: message.content ?? "" };
    }
    if (message.responseType === MessageResponseType.RECIPE) {
      return { role: "model" as const, content: JSON.stringify(message.recipeDraft) };
    }
    if (message.responseType === MessageResponseType.IMAGE_ANALYSIS) {
      return { role: "model" as const, content: JSON.stringify(message.imageAnalysis) };
    }
    return { role: "model" as const, content: message.content ?? "" };
  });
}

async function toAssistantMessageData(response: AiResponse) {
  switch (response.type) {
    case "recipe": {
      const { imageSearchQuery, ...draft } = response.recipe;
      const image = await resolveRecipeImage(imageSearchQuery);
      return {
        responseType: MessageResponseType.RECIPE,
        content: null,
        recipeDraft: draft as unknown as Prisma.InputJsonValue,
        imageAnalysis: Prisma.JsonNull,
        imageUrl: image?.url ?? null,
        imageThumbnailUrl: image?.thumbnailUrl ?? null,
        imageSource: image ? ImageSource.PEXELS : ImageSource.NONE,
        imageAttributionName: image?.photographerName ?? null,
        imageAttributionUrl: image?.sourcePageUrl ?? null,
      };
    }
    case "food_info":
      return {
        responseType: MessageResponseType.FOOD_INFO,
        content: response.answer,
        recipeDraft: Prisma.JsonNull,
        imageAnalysis: Prisma.JsonNull,
        imageUrl: null,
        imageThumbnailUrl: null,
        imageSource: ImageSource.NONE,
        imageAttributionName: null,
        imageAttributionUrl: null,
      };
    case "refused":
      return {
        responseType: MessageResponseType.REFUSED,
        content: REFUSAL_MESSAGES[response.reason],
        recipeDraft: Prisma.JsonNull,
        imageAnalysis: Prisma.JsonNull,
        imageUrl: null,
        imageThumbnailUrl: null,
        imageSource: ImageSource.NONE,
        imageAttributionName: null,
        imageAttributionUrl: null,
      };
  }
}

// Vision responses never resolve a Pexels photo - they're about the
// user's own photo, not a generated recipe needing a stock image.
function toImageAnalysisMessageData(response: ImageAnalysisResponse) {
  return {
    responseType: MessageResponseType.IMAGE_ANALYSIS,
    content: response.type === "food_analysis" ? response.description : null,
    recipeDraft: Prisma.JsonNull,
    imageAnalysis: response as unknown as Prisma.InputJsonValue,
    imageUrl: null,
    imageThumbnailUrl: null,
    imageSource: ImageSource.NONE,
    imageAttributionName: null,
    imageAttributionUrl: null,
  };
}

async function generateAndLog(userId: string, promptLabel: string, history: ChatTurn[]): Promise<AiResponse> {
  try {
    const { response, raw } = await aiProvider.generateRecipeInContext(history, "internal");
    await prisma.aiGeneration.create({
      data: { userId, prompt: promptLabel, rawResponse: raw as Prisma.InputJsonValue, status: GenerationStatus.SUCCESS },
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

// Attaches a freshly signed R2 URL to any message with a stored image key.
// Signing is local HMAC computation (no network round-trip), so doing this
// per-request for every message in a conversation is cheap.
async function withSignedUserImageUrl<T extends { userImageKey: string | null }>(
  message: T,
): Promise<T & { userImageUrl: string | null }> {
  const userImageUrl = message.userImageKey ? await getSignedImageUrl(message.userImageKey) : null;
  return { ...message, userImageUrl };
}

export async function createConversation(userId: string) {
  return prisma.conversation.create({ data: { userId } });
}

export async function listConversations(userId: string) {
  return prisma.conversation.findMany({
    where: { userId },
    orderBy: [{ pinned: "desc" }, { updatedAt: "desc" }],
    select: { id: true, title: true, pinned: true, createdAt: true, updatedAt: true },
  });
}

export async function updateConversation(userId: string, conversationId: string, input: UpdateConversationInput) {
  await getOwnedConversation(userId, conversationId);
  return prisma.conversation.update({
    where: { id: conversationId },
    data: {
      ...(input.title !== undefined && { title: input.title }),
      ...(input.pinned !== undefined && { pinned: input.pinned }),
    },
  });
}

// R2 objects are deleted after the Prisma cascade succeeds, not before -
// if a message row still exists and its R2 delete fails, at worst there's
// a broken image on a message the user can retry deleting. Deleting R2
// first and then having the DB delete fail would leave a message row
// pointing at nothing, which is a worse, silent inconsistency.
export async function deleteConversation(userId: string, conversationId: string, logger: FastifyBaseLogger) {
  await getOwnedConversation(userId, conversationId);

  const imageKeys = (
    await prisma.message.findMany({
      where: { conversationId, userImageKey: { not: null } },
      select: { userImageKey: true },
    })
  )
    .map((m) => m.userImageKey)
    .filter((key): key is string => key !== null);

  await prisma.conversation.delete({ where: { id: conversationId } });

  await Promise.all(imageKeys.map((key) => deleteImage(key, logger)));
}

export async function getConversationWithMessages(userId: string, conversationId: string) {
  await getOwnedConversation(userId, conversationId);
  const messages = await prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: "asc" },
  });
  return Promise.all(messages.map(withSignedUserImageUrl));
}

export async function sendMessage(userId: string, conversationId: string, prompt: string) {
  const conversation = await getOwnedConversation(userId, conversationId);

  const priorMessages = await prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: "asc" },
  });

  const userMessage = await prisma.message.create({
    data: { conversationId, role: MessageRole.USER, content: prompt },
  });

  const history = [...toChatTurns(priorMessages), { role: "user" as const, content: prompt }];
  const response = await generateAndLog(userId, prompt, history);
  const assistantData = await toAssistantMessageData(response);

  const [assistantMessage, updatedConversation] = await prisma.$transaction([
    prisma.message.create({ data: { conversationId, role: MessageRole.ASSISTANT, ...assistantData } }),
    prisma.conversation.update({
      where: { id: conversationId },
      data: {
        updatedAt: new Date(),
        ...(conversation.title === null && { title: deriveTitleFromPrompt(prompt) }),
      },
    }),
  ]);

  return {
    userMessage: await withSignedUserImageUrl(userMessage),
    assistantMessage: await withSignedUserImageUrl(assistantMessage),
    conversation: updatedConversation,
  };
}

// The image-attached counterpart to sendMessage. Uploads to R2, runs
// vision analysis (reusing the exact same validate/quota/analyze pipeline
// the standalone vision endpoint used), and persists both turns - mirrors
// sendMessage's shape and transaction structure.
export async function sendImageMessage(
  userId: string,
  conversationId: string,
  rawBuffer: Buffer,
  question: string | undefined,
  logger: FastifyBaseLogger,
) {
  const conversation = await getOwnedConversation(userId, conversationId);

  const { base64, mimeType } = await validateAndProcessImage(rawBuffer);

  const quota = await checkAndIncrementVisionQuota(userId, VISION_DAILY_LIMIT, logger);
  if (!quota.allowed) {
    if (quota.redisUnavailable) {
      throw new UpstreamServiceError("Usage tracking is temporarily unavailable. Please retry shortly.");
    }
    throw new TooManyRequestsError("Daily image analysis limit reached. Try again tomorrow.", "VISION_QUOTA_EXCEEDED");
  }

  // validateAndProcessImage already re-encoded to JPEG - upload that same
  // processed buffer, not the raw upload, so the stored copy matches what
  // was actually analyzed and has already had EXIF/GPS stripped.
  const processedBuffer = Buffer.from(base64, "base64");
  let userImageKey: string;
  try {
    userImageKey = await uploadUserImage(userId, processedBuffer);
  } catch (err) {
    // Never reached Gemini - doesn't count against the daily allowance.
    await rollbackVisionQuota(userId, logger);
    logger.error({ err, userId }, "failed to upload user image to Cloudinary");
    throw new UpstreamServiceError("Failed to store the uploaded image. Please try again.");
  }

  const promptLabel = question ?? "[image analysis]";
  let analysisResponse: ImageAnalysisResponse;
  try {
    const { response, raw } = await aiProvider.analyzeImage(base64, mimeType, question, "internal");
    analysisResponse = response;
    await prisma.aiGeneration.create({
      data: { userId, prompt: promptLabel, rawResponse: raw as Prisma.InputJsonValue, status: GenerationStatus.SUCCESS },
    });
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

  const userMessage = await prisma.message.create({
    data: {
      conversationId,
      role: MessageRole.USER,
      content: question ?? null,
      userImageKey,
    },
  });

  const assistantData = toImageAnalysisMessageData(analysisResponse);
  const [assistantMessage, updatedConversation] = await prisma.$transaction([
    prisma.message.create({ data: { conversationId, role: MessageRole.ASSISTANT, ...assistantData } }),
    prisma.conversation.update({
      where: { id: conversationId },
      data: {
        updatedAt: new Date(),
        ...(conversation.title === null && { title: deriveTitleFromPrompt(question ?? "Photo analysis") }),
      },
    }),
  ]);

  return {
    userMessage: await withSignedUserImageUrl(userMessage),
    assistantMessage: await withSignedUserImageUrl(assistantMessage),
    conversation: updatedConversation,
  };
}

export async function regenerateMessage(userId: string, conversationId: string, messageId: string) {
  await getOwnedConversation(userId, conversationId);

  const target = await prisma.message.findFirst({
    where: { id: messageId, conversationId, role: MessageRole.ASSISTANT },
  });
  if (!target) throw new NotFoundError("Message not found");
  if (target.responseType === MessageResponseType.IMAGE_ANALYSIS) {
    throw new UnprocessableEntityError("Image analysis responses can't be regenerated", "CANNOT_REGENERATE");
  }

  const priorMessages = await prisma.message.findMany({
    where: { conversationId, createdAt: { lt: target.createdAt } },
    orderBy: { createdAt: "asc" },
  });

  const history = toChatTurns(priorMessages);
  const response = await generateAndLog(userId, "regenerate", history);
  const assistantData = await toAssistantMessageData(response);

  const updated = await prisma.message.update({
    where: { id: messageId },
    data: { ...assistantData, savedRecipeId: null },
  });
  return withSignedUserImageUrl(updated);
}

export async function saveMessageAsRecipe(userId: string, conversationId: string, messageId: string) {
  await getOwnedConversation(userId, conversationId);

  const message = await prisma.message.findFirst({
    where: { id: messageId, conversationId, role: MessageRole.ASSISTANT },
  });
  if (!message) throw new NotFoundError("Message not found");
  if (message.responseType !== MessageResponseType.RECIPE) {
    throw new UnprocessableEntityError("Only recipe responses can be saved", "NOT_A_RECIPE");
  }
  if (message.savedRecipeId) throw new ConflictError("This recipe has already been saved");

  const draft = {
    ...(message.recipeDraft as Record<string, unknown>),
    imageUrl: message.imageUrl,
    imageThumbnailUrl: message.imageThumbnailUrl,
    imageSource: message.imageSource,
    imageAttributionName: message.imageAttributionName,
    imageAttributionUrl: message.imageAttributionUrl,
  } as unknown as Parameters<typeof recipeService.createRecipe>[1];

  const recipe = await recipeService.createRecipe(userId, draft);
  await prisma.message.update({ where: { id: messageId }, data: { savedRecipeId: recipe.id } });
  return recipe;
}