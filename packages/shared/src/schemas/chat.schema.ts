import { z } from "zod";
import { recipeContentSchema } from "./recipe.schema.js";

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

export const messageImageSourceSchema = z.enum(["PEXELS", "AI_GENERATED", "NONE"]);

export interface ConversationSummary {
  id: string;
  title: string | null;
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MessageResponse {
  id: string;
  role: "USER" | "ASSISTANT";
  content: string | null;
  recipeDraft: z.infer<typeof recipeContentSchema> | null;
  savedRecipeId: string | null;
  imageUrl: string | null;
  imageThumbnailUrl: string | null;
  imageSource: z.infer<typeof messageImageSourceSchema>;
  imageAttributionName: string | null;
  imageAttributionUrl: string | null;
  createdAt: string;
}

export interface SendMessageResponse {
  userMessage: MessageResponse;
  assistantMessage: MessageResponse;
}

export const updateConversationSchema = z
  .object({
    title: z.string().trim().min(1).max(100).nullable().optional(),
    pinned: z.boolean().optional(),
  })
  .refine((data) => data.title !== undefined || data.pinned !== undefined, {
    message: "At least one field (title or pinned) must be provided",
  });

export type SendMessageInput = z.infer<typeof sendMessageSchema>;
export type ConversationIdParam = z.infer<typeof conversationIdParamSchema>;
export type MessageIdParam = z.infer<typeof messageIdParamSchema>;
export type UpdateConversationInput = z.infer<typeof updateConversationSchema>;