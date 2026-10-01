"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { MessageResponse } from "@recipeai/shared";
import * as chatApi from "@/lib/api/chat";
import { useChatList } from "@/components/chat/chat-list-context";
import { MessageList } from "./message-list";
import { ChatComposer, type ComposerDraft } from "./chat-composer";
import { MessageScroller } from "./message-scroller";

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
  // The composer remounts when the layout switches between the empty state
  // and the message view, so a failed draft is held here and handed back
  // through initialDraft. The id forces a fresh composer per failure.
  const [failedDraft, setFailedDraft] = useState<{ id: number; draft: ComposerDraft } | null>(null);

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
    setFailedDraft(null);
    setPendingPrompt(prompt);
    setSending(true);

    try {
      const targetId = await ensureConversationId();
      const result = await chatApi.sendMessage(targetId, prompt);
      upsertConversation(result.conversation);

      if (!conversationId) {
        router.replace(`/chat/${targetId}`);
        return;
      }

      setMessages((prev) => [...prev, result.userMessage, result.assistantMessage]);
    } catch (err) {
      setError(toErrorMessage(err, "Failed to send message"));
      setFailedDraft({ id: Date.now(), draft: { text: prompt, image: null } });
    } finally {
      clearPending();
    }
  }

  async function handleSendImage(file: File, question: string | undefined) {
    setError(null);
    setFailedDraft(null);
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
    } catch (err) {
      setError(toErrorMessage(err, "Failed to analyze image"));
      setFailedDraft({ id: Date.now(), draft: { text: question ?? "", image: file } });
    } finally {
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

  const composer = (
    <ChatComposer
      key={failedDraft?.id}
      initialDraft={failedDraft?.draft}
      onSend={handleSend}
      onSendImage={handleSendImage}
      disabled={sending}
    />
  );

  if (isEmpty) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-6">
        <h1 className="mb-6 text-center font-serif text-3xl font-semibold">
          What do you want to cook today?
        </h1>
        <div className="w-full max-w-xl">{composer}</div>
        {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <MessageScroller isSending={sending}>
        <MessageList
          messages={messages}
          pendingPrompt={pendingPrompt}
          pendingImagePreview={pendingImagePreview}
          regeneratingId={regeneratingId}
          onRegenerate={handleRegenerate}
          onSave={handleSave}
        />
      </MessageScroller>
      <div className="border-t p-4">
        <div className="mx-auto w-full max-w-2xl">
          {composer}
          {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
        </div>
      </div>
    </div>
  );
}