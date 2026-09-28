import { notFound } from "next/navigation";
import { serverFetch, ApiError } from "@/lib/api-client";
import type { MessageResponse } from "@recipeai/shared";
import { ChatView } from "@/components/chat/chat-view";

export const dynamic = "force-dynamic";

interface ChatConversationPageProps {
  params: Promise<{ id: string }>;
}

export default async function ChatConversationPage({ params }: ChatConversationPageProps) {
  const { id } = await params;

  let messages: MessageResponse[];
  try {
    messages = await serverFetch<MessageResponse[]>(`/internal/chat/conversations/${id}`);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      notFound();
    }
    throw err;
  }

  return <ChatView conversationId={id} initialMessages={messages} />;
}