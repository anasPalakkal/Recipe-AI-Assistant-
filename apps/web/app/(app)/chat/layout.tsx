import type { ReactNode } from "react";
import { serverFetch } from "@/lib/api-client";
import { getCurrentUser } from "@/lib/session";
import type { ConversationSummary } from "@recipeai/shared";
import { ChatShell } from "@/components/chat/chat-shell";

export const dynamic = "force-dynamic";

export default async function ChatLayout({ children }: { children: ReactNode }) {
  const [conversations, user] = await Promise.all([
    serverFetch<ConversationSummary[]>("/internal/chat/conversations"),
    getCurrentUser(),
  ]);

  return (
    <ChatShell initialConversations={conversations} user={user}>
      {children}
    </ChatShell>
  );
}