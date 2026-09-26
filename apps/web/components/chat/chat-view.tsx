"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { MessageResponse } from "@recipeai/shared";
import * as chatApi from "@/lib/api/chat";
import { useChatList } from "@/components/chat/chat-list-context";
import { MessageList } from "./message-list";
import { ChatComposer } from "./chat-composer";

interface ChatViewProps {
  conversationId: string | null;
  initialMessages: MessageResponse[];
}

function toErrorMessage(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback;
}

export function ChatView({ conversationId, initialMessages }: ChatViewProps) {
  const router = useRouter();
  const { upsertConversation } = useChatList();

  const [messages, setMessages] = useState(initialMessages);
  const [pendingPrompt, setPendingPrompt] = useState<string | null>(null);
  // Local object URL for the attached photo, shown as an optimistic
  // preview in the pending bubble while the upload/analysis is in
  // flight. Revoked as soon as it's no longer needed to avoid leaking
  // the blob URL for the lifetime of the page.
  const [pendingImagePreview, setPendingImagePreview] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isEmpty = messages.length === 0 && !pendingPrompt && !pendingImagePreview;

  async function ensureConversationId(): Promise<string> {
    if (conversationId) return conversationId;
    const conversation = await chatApi.createConversation();
    upsertConversation(conversation);
    return conversation.id;
  }

  function clearPending() {
    setPendingPrompt(null);
    if (pendingImagePreview) {
      URL.revokeObjectURL(pendingImagePreview);
      setPendingImagePreview(null);
    }
    setSending(false);
  }

  async function handleSend(prompt: string) {
    setError(null);
    setPendingPrompt(prompt);
    setSending(true);

    try {
      const targetId = await ensureConversationId();
      const result = await chatApi.sendMessage(targetId, prompt);
      upsertConversation(result.conversation);

      if (!conversationId) {
        // Brand-new chat: hand off to its real URL. The [id] page re-fetches
        // these same messages from the server on mount, so we deliberately
        // leave sending/pendingPrompt as-is here rather than resetting them -
        // this instance is being replaced, not continuing to render.
        router.replace(`/chat/${targetId}`);
        return;
      }

      setMessages((prev) => [...prev, result.userMessage, result.assistantMessage]);
      clearPending();
    } catch (err) {
      setError(toErrorMessage(err, "Failed to send message"));
      clearPending();
    }
  }

  async function handleSendImage(file: File, question: string | undefined) {
    setError(null);
    setPendingPrompt(question ?? null);
    setPendingImagePreview(URL.createObjectURL(file));
    setSending(true);

    try {
      const targetId = await ensureConversationId();
      const result = await chatApi.sendImageMessage(targetId, file, question);
      upsertConversation(result.conversation);

      if (!conversationId) {
        router.replace(`/chat/${targetId}`);
        return;
      }

      setMessages((prev) => [...prev, result.userMessage, result.assistantMessage]);
      clearPending();
    } catch (err) {
      setError(toErrorMessage(err, "Failed to analyze image"));
      clearPending();
    }
  }

  async function handleRegenerate(messageId: string) {
    if (!conversationId) return;
    setError(null);
    setRegeneratingId(messageId);
    try {
      const updated = await chatApi.regenerateMessage(conversationId, messageId);
      setMessages((prev) => prev.map((m) => (m.id === messageId ? updated : m)));
    } catch (err) {
      setError(toErrorMessage(err, "Failed to regenerate"));
    } finally {
      setRegeneratingId(null);
    }
  }

  async function handleSave(messageId: string) {
    if (!conversationId) return;
    setError(null);
    try {
      const recipe = await chatApi.saveMessageAsRecipe(conversationId, messageId);
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, savedRecipeId: recipe.id } : m)),
      );
    } catch (err) {
      setError(toErrorMessage(err, "Failed to save recipe"));
    }
  }

  if (isEmpty) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-6">
        <h1 className="mb-6 text-center font-serif text-3xl font-semibold">
          What do you want to cook today?
        </h1>
        <div className="w-full max-w-xl">
          <ChatComposer onSend={handleSend} onSendImage={handleSendImage} disabled={sending} />
        </div>
        {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto">
        <MessageList
          messages={messages}
          pendingPrompt={pendingPrompt}
          pendingImagePreview={pendingImagePreview}
          regeneratingId={regeneratingId}
          onRegenerate={handleRegenerate}
          onSave={handleSave}
        />
      </div>
      <div className="border-t p-4">
        <div className="mx-auto w-full max-w-2xl">
          <ChatComposer onSend={handleSend} onSendImage={handleSendImage} disabled={sending} />
          {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
        </div>
      </div>
    </div>
  );
}