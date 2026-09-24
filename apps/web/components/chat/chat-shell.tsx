"use client";

import { useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Menu01Icon } from "@hugeicons/core-free-icons";
import type { ConversationSummary } from "@recipeai/shared";
import type { PublicUser } from "@/lib/api/auth";
import { ChatSidebar } from "@/components/chat/chat-sidebar";
import { ChatListProvider } from "@/components/chat/chat-list-context";
import { Button } from "@/components/ui/button";

interface ChatShellProps {
  initialConversations: ConversationSummary[];
  user: PublicUser | null;
  children: React.ReactNode;
}

export function ChatShell({ initialConversations, user, children }: ChatShellProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <ChatListProvider initialConversations={initialConversations}>
      <div className="flex h-dvh w-full overflow-hidden">
        <div
          className={`fixed inset-y-0 left-0 z-40 w-72 shrink-0 border-r bg-sidebar transition-transform md:static md:translate-x-0 ${
            mobileNavOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <ChatSidebar user={user} onNavigate={() => setMobileNavOpen(false)} />
        </div>

        {mobileNavOpen && (
          <button
            type="button"
            aria-label="Close navigation"
            className="fixed inset-0 z-30 bg-black/40 md:hidden"
            onClick={() => setMobileNavOpen(false)}
          />
        )}

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center border-b p-3 md:hidden">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Open navigation"
              onClick={() => setMobileNavOpen(true)}
            >
              <HugeiconsIcon icon={Menu01Icon} />
            </Button>
          </div>
          <div className="min-h-0 flex-1">{children}</div>
        </div>
      </div>
    </ChatListProvider>
  );
}