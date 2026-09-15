import { Prisma, MessageRole, GenerationStatus } from "@prisma/client";
import { aiProvider } from "../../lib/ai/index.js";
import { MAX_CHAT_HISTORY_TURNS } from "../../lib/ai/gemini.provider.js";
import type { ChatTurn } from "../../lib/ai/types.js";
import { prisma } from "../../lib/prisma.js";
import { NotFoundError, ConflictError } from "../../lib/errors.js";
import * as recipeService from "../recipes/recipe.service.js";
import type { RecipeDraft } from "@recipeai/shared";

async function getOwnedConversation(userId: string, conversationId: string) {
  const conversation = await prisma.conversation.findFirst({
    where: { id: conversationId, userId },
  });
  if (!conversation) throw new NotFoundError("Conversation not found");
  return conversation;
}

function toChatTurns(
  messages: Array<{ role: MessageRole; content: string | null; recipeDraft: unknown }>,
): ChatTurn[] {
  const recent = messages.slice(-MAX_CHAT_HISTORY_TURNS);
  return recent.map((message) => ({
    role: message.role === MessageRole.USER ? "user" : "model",
    content:
      message.role === MessageRole.USER
        ? (message.content ?? "")
        : JSON.stringify(message.recipeDraft),
  }));
}

// Wraps a generateRecipeInContext call with the same audit-logging contract
// generateRecipeDraft already follows: every attempt gets an AiGeneration
// row, SUCCESS or FAILED, before the caller sees the result or the error.
async function generateAndLog(userId: string, promptLabel: string, history: ChatTurn[]) {
  try {
    const { draft, raw } = await aiProvider.generateRecipeInContext(history, "internal");
    await prisma.aiGeneration.create({
      data: {
        userId,
        prompt: promptLabel,
        rawResponse: raw as Prisma.InputJsonValue,
        status: GenerationStatus.SUCCESS,
      },
    });
    return draft;
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

export async function createConversation(userId: string) {
  return prisma.conversation.create({ data: { userId } });
}

export async function listConversations(userId: string) {
  return prisma.conversation.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    select: { id: true, title: true, createdAt: true, updatedAt: true },
  });
}

export async function getConversationWithMessages(userId: string, conversationId: string) {
  await getOwnedConversation(userId, conversationId);
  return prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: "asc" },
  });
}

export async function sendMessage(userId: string, conversationId: string, prompt: string) {
  await getOwnedConversation(userId, conversationId);

  const priorMessages = await prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: "asc" },
  });

  const userMessage = await prisma.message.create({
    data: { conversationId, role: MessageRole.USER, content: prompt },
  });

  const history = [...toChatTurns(priorMessages), { role: "user" as const, content: prompt }];

  // If generation fails, the user's message stays persisted (visible in
  // history) but no assistant reply follows - same failure UX as any chat
  // app: your message sent, the response errored, retry is available.
  const draft = await generateAndLog(userId, prompt, history);

  const [assistantMessage] = await prisma.$transaction([
    prisma.message.create({
      data: {
        conversationId,
        role: MessageRole.ASSISTANT,
        recipeDraft: draft as unknown as Prisma.InputJsonValue,
      },
    }),
    prisma.conversation.update({ where: { id: conversationId }, data: { updatedAt: new Date() } }),
  ]);

  return { userMessage, assistantMessage };
}

export async function regenerateMessage(userId: string, conversationId: string, messageId: string) {
  await getOwnedConversation(userId, conversationId);

  const target = await prisma.message.findFirst({
    where: { id: messageId, conversationId, role: MessageRole.ASSISTANT },
  });
  if (!target) throw new NotFoundError("Message not found");

  const priorMessages = await prisma.message.findMany({
    where: { conversationId, createdAt: { lt: target.createdAt } },
    orderBy: { createdAt: "asc" },
  });

  const history = toChatTurns(priorMessages);
  const draft = await generateAndLog(userId, "regenerate", history);

  return prisma.message.update({
    where: { id: messageId },
    data: {
      recipeDraft: draft as unknown as Prisma.InputJsonValue,
      savedRecipeId: null,
    },
  });
}

export async function saveMessageAsRecipe(userId: string, conversationId: string, messageId: string) {
  await getOwnedConversation(userId, conversationId);

  const message = await prisma.message.findFirst({
    where: { id: messageId, conversationId, role: MessageRole.ASSISTANT },
  });
  if (!message) throw new NotFoundError("Message not found");
  if (message.savedRecipeId) throw new ConflictError("This recipe has already been saved");

  const draft = message.recipeDraft as unknown as RecipeDraft;
  const recipe = await recipeService.createRecipe(userId, draft);

  await prisma.message.update({
    where: { id: messageId },
    data: { savedRecipeId: recipe.id },
  });

  return recipe;
}