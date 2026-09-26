import type {
  ConversationSummary,
  MessageResponse,
  SendMessageResponse,
  UpdateConversationInput,
} from "@recipeai/shared";
import type { RecipeResponse } from "@recipeai/shared";
import { apiGet, apiPost, apiPatch, apiDelete, apiPostForm } from "./request";

export function createConversation(): Promise<ConversationSummary> {
  return apiPost<ConversationSummary>("/api/chat/conversations", {});
}

export function listConversations(): Promise<ConversationSummary[]> {
  return apiGet<ConversationSummary[]>("/api/chat/conversations");
}

export function getConversation(conversationId: string): Promise<MessageResponse[]> {
  return apiGet<MessageResponse[]>(`/api/chat/conversations/${conversationId}`);
}

export function sendMessage(conversationId: string, prompt: string): Promise<SendMessageResponse> {
  return apiPost<SendMessageResponse>(`/api/chat/conversations/${conversationId}/messages`, {
    prompt,
  });
}

export function regenerateMessage(
  conversationId: string,
  messageId: string,
): Promise<MessageResponse> {
  return apiPost<MessageResponse>(
    `/api/chat/conversations/${conversationId}/messages/${messageId}/regenerate`,
    {},
  );
}

export function saveMessageAsRecipe(
  conversationId: string,
  messageId: string,
): Promise<RecipeResponse> {
  return apiPost<RecipeResponse>(
    `/api/chat/conversations/${conversationId}/messages/${messageId}/save`,
    {},
  );
}

export function updateConversation(
  conversationId: string,
  input: UpdateConversationInput,
): Promise<ConversationSummary> {
  return apiPatch<ConversationSummary>(`/api/chat/conversations/${conversationId}`, input);
}

export function deleteConversation(conversationId: string): Promise<void> {
  return apiDelete<void>(`/api/chat/conversations/${conversationId}`);
}

export function sendImageMessage(
  conversationId: string,
  file: File,
  question: string | undefined,
): Promise<SendMessageResponse> {
  const formData = new FormData();
  formData.append("image", file);
  if (question) formData.append("question", question);
  return apiPostForm<SendMessageResponse>(
    `/api/chat/conversations/${conversationId}/messages`,
    formData,
  );
}