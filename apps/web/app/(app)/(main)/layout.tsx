import type { ReactNode } from "react";
import { serverFetch } from "@/lib/api-client";
import { getCurrentUser } from "@/lib/session";
import type { ConversationSummary } from "@recipeai/shared";
import { AppShell } from "@/components/layout/app-shell";
import { ChatSidebar } from "@/components/chat/chat-sidebar";
import { ChatListProvider } from "@/components/chat/chat-list-context";

export const dynamic = "force-dynamic";

export default async function MainLayout({ children }: { children: ReactNode }) {
  const [conversations, user] = await Promise.all([
    serverFetch<ConversationSummary[]>("/internal/chat/conversations"),
    getCurrentUser(),
  ]);

  return (
    <ChatListProvider initialConversations={conversations}>
      <AppShell user={user} sidebarContent={<ChatSidebar />}>
        {children}
      </AppShell>
    </ChatListProvider>
  );
}