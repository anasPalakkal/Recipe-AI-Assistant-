"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import type { ConversationSummary } from "@recipeai/shared";

interface ChatListContextValue {
  conversations: ConversationSummary[];
  upsertConversation: (conversation: ConversationSummary) => void;
  removeConversation: (id: string) => void;
}

const ChatListContext = createContext<ChatListContextValue | null>(null);

interface ChatListProviderProps {
  initialConversations: ConversationSummary[];
  children: ReactNode;
}

export function ChatListProvider({ initialConversations, children }: ChatListProviderProps) {
  const [conversations, setConversations] = useState(initialConversations);

  // Covers both a brand-new conversation (insert) and an existing one
  // whose title/updatedAt just changed (replace) - same merge either way.
  function upsertConversation(conversation: ConversationSummary) {
    setConversations((prev) => {
      const exists = prev.some((c) => c.id === conversation.id);
      return exists
        ? prev.map((c) => (c.id === conversation.id ? conversation : c))
        : [conversation, ...prev];
    });
  }

  function removeConversation(id: string) {
    setConversations((prev) => prev.filter((c) => c.id !== id));
  }

  return (
    <ChatListContext.Provider value={{ conversations, upsertConversation, removeConversation }}>
      {children}
    </ChatListContext.Provider>
  );
}

export function useChatList(): ChatListContextValue {
  const ctx = useContext(ChatListContext);
  if (!ctx) throw new Error("useChatList must be used within a ChatListProvider");
  return ctx;
}