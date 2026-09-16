import { Prisma, MessageRole, MessageResponseType, GenerationStatus } from "@prisma/client";
import { aiProvider } from "../../lib/ai/index.js";
import { MAX_CHAT_HISTORY_TURNS } from "../../lib/ai/gemini.provider.js";
import type { ChatTurn } from "../../lib/ai/types.js";
import { prisma } from "../../lib/prisma.js";
import { NotFoundError, ConflictError, UnprocessableEntityError } from "../../lib/errors.js";
import * as recipeService from "../recipes/recipe.service.js";
import type { AiResponse, UpdateConversationInput } from "@recipeai/shared";

const REFUSAL_MESSAGES: Record<"out_of_scope" | "unsafe_or_unclear", string> = {
  out_of_scope:
    "I can only help with recipes, cooking, and nutrition questions. Try asking me for a recipe or a food-related question.",
  unsafe_or_unclear:
    "I can't help with that request. Feel free to ask me for a recipe or a food-related question instead.",
};

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
  responseType: MessageResponseType | null;
}

// Reconstructs each assistant turn's content using whichever field actually
// holds its data, based on responseType - recipeDraft for RECIPE turns,
// content (already the assistant's plain-text answer/refusal) otherwise.
function toChatTurns(messages: StoredMessage[]): ChatTurn[] {
  const recent = messages.slice(-MAX_CHAT_HISTORY_TURNS);
  return recent.map((message) => {
    if (message.role === MessageRole.USER) {
      return { role: "user" as const, content: message.content ?? "" };
    }
    const content =
      message.responseType === MessageResponseType.RECIPE
        ? JSON.stringify(message.recipeDraft)
        : (message.content ?? "");
    return { role: "model" as const, content };
  });
}

// Maps a validated AiResponse onto the Prisma fields for an assistant
// Message row. Each response type owns exactly one of content/recipeDraft -
// the other is left null, so a row's shape always matches its responseType.
function toAssistantMessageData(response: AiResponse) {
  switch (response.type) {
    case "recipe":
      return {
        responseType: MessageResponseType.RECIPE,
        content: null,
        recipeDraft: response.recipe as unknown as Prisma.InputJsonValue,
      };
    case "food_info":
      return {
        responseType: MessageResponseType.FOOD_INFO,
        content: response.answer,
        recipeDraft: Prisma.JsonNull,
      };
    case "refused":
      return {
        responseType: MessageResponseType.REFUSED,
        content: REFUSAL_MESSAGES[response.reason],
        recipeDraft: Prisma.JsonNull,
      };
  }
}

// Wraps a generation call with the same audit-logging contract used
// elsewhere: every attempt gets an AiGeneration row, SUCCESS or FAILED,
// before the caller sees the result or the error. Chat treats "refused"
// and "food_info" as successful generations, not failures - the model
// did its job correctly by declining or answering informationally.
async function generateAndLog(
  userId: string,
  promptLabel: string,
  history: ChatTurn[],
): Promise<AiResponse> {
  try {
    const { response, raw } = await aiProvider.generateRecipeInContext(history, "internal");
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

export async function updateConversation(
  userId: string,
  conversationId: string,
  input: UpdateConversationInput,
) {
  await getOwnedConversation(userId, conversationId);

  return prisma.conversation.update({
    where: { id: conversationId },
    data: {
      ...(input.title !== undefined && { title: input.title }),
      ...(input.pinned !== undefined && { pinned: input.pinned }),
    },
  });
}

export async function deleteConversation(userId: string, conversationId: string) {
  await getOwnedConversation(userId, conversationId);
  // Messages cascade via the FK — no manual cleanup needed.
  await prisma.conversation.delete({ where: { id: conversationId } });
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

  // If generation fails outright (upstream error), the user's message stays
  // persisted but no assistant reply follows - retry is available. A
  // refusal or food-info answer is NOT a failure - it's a valid reply.
  const response = await generateAndLog(userId, prompt, history);

  const [assistantMessage] = await prisma.$transaction([
    prisma.message.create({
      data: { conversationId, role: MessageRole.ASSISTANT, ...toAssistantMessageData(response) },
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
  const response = await generateAndLog(userId, "regenerate", history);

  return prisma.message.update({
    where: { id: messageId },
    data: {
      ...toAssistantMessageData(response),
      savedRecipeId: null, // a save from before regeneration is stale regardless of new type
    },
  });
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

  const draft = message.recipeDraft as unknown as Parameters<typeof recipeService.createRecipe>[1];
  const recipe = await recipeService.createRecipe(userId, draft);

  await prisma.message.update({
    where: { id: messageId },
    data: { savedRecipeId: recipe.id },
  });

  return recipe;
}