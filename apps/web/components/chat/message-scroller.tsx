"use client";

import { useEffect, type ReactNode } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowDown01Icon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { useStickToBottom } from "@/hooks/use-stick-to-bottom";

interface MessageScrollerProps {
  isSending: boolean;
  children: ReactNode;
}

export function MessageScroller({ isSending, children }: MessageScrollerProps) {
  const { scrollRef, contentRef, isAtBottom, onScroll, scrollToBottom } = useStickToBottom();

  useEffect(() => {
    if (isSending) scrollToBottom();
  }, [isSending, scrollToBottom]);

  return (
    <div className="relative min-h-0 flex-1">
      <div ref={scrollRef} onScroll={onScroll} className="h-full overflow-y-auto">
        <div ref={contentRef}>{children}</div>
      </div>
      {!isAtBottom && (
        <Button
          type="button"
          variant="outline"
          size="icon-lg"
          onClick={() => scrollToBottom()}
          aria-label="Scroll to latest message"
          className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-background shadow-md hover:bg-muted"
        >
          <HugeiconsIcon icon={ArrowDown01Icon} size={18} />
        </Button>
      )}
    </div>
  );
}