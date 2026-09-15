import { z } from "zod";
import { createRecipeSchema } from "./recipe.schema.js";

export const sendMessageSchema = z.object({
  prompt: z.string().trim().min(3).max(500),
});

export const conversationIdParamSchema = z.object({
  conversationId: z.string().cuid(),
});

export const messageIdParamSchema = z.object({
  conversationId: z.string().cuid(),
  messageId: z.string().cuid(),
});

export interface ConversationSummary {
  id: string;
  title: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MessageResponse {
  id: string;
  role: "USER" | "ASSISTANT";
  content: string | null;
  recipeDraft: z.infer<typeof createRecipeSchema> | null;
  savedRecipeId: string | null;
  createdAt: string;
}

export interface SendMessageResponse {
  userMessage: MessageResponse;
  assistantMessage: MessageResponse;
}

export type SendMessageInput = z.infer<typeof sendMessageSchema>;
export type ConversationIdParam = z.infer<typeof conversationIdParamSchema>;
export type MessageIdParam = z.infer<typeof messageIdParamSchema>;