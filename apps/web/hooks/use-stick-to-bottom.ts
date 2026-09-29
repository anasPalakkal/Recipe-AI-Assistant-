"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

const BOTTOM_THRESHOLD_PX = 100;

export function useStickToBottom() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const isPinnedRef = useRef(true);
  const isAutoScrollingRef = useRef(false);
  const [isAtBottom, setIsAtBottom] = useState(true);

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, []);

  useEffect(() => {
    const scrollEl = scrollRef.current;
    const contentEl = contentRef.current;
    if (!scrollEl || !contentEl) return;

    // Content growth (streamed text, late-loading images, cards) and viewport
    // shrink (composer growing) both change the distance from the bottom
    // without a scroll event, so they must be handled here, not in onScroll.
    const observer = new ResizeObserver(() => {
      if (isPinnedRef.current) scrollEl.scrollTop = scrollEl.scrollHeight;
    });
    observer.observe(contentEl);
    observer.observe(scrollEl);

    // A user gesture during a smooth scroll cancels the programmatic scroll.
    const cancelAutoScroll = () => {
      isAutoScrollingRef.current = false;
    };
    scrollEl.addEventListener("wheel", cancelAutoScroll, { passive: true });
    scrollEl.addEventListener("touchstart", cancelAutoScroll, { passive: true });

    return () => {
      observer.disconnect();
      scrollEl.removeEventListener("wheel", cancelAutoScroll);
      scrollEl.removeEventListener("touchstart", cancelAutoScroll);
    };
  }, []);

  const onScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;

    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;

    if (isAutoScrollingRef.current) {
      if (distance < 2) isAutoScrollingRef.current = false;
      return;
    }

    const nearBottom = distance < BOTTOM_THRESHOLD_PX;
    isPinnedRef.current = nearBottom;
    setIsAtBottom(nearBottom);
  }, []);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    const el = scrollRef.current;
    if (!el) return;

    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    isPinnedRef.current = true;
    setIsAtBottom(true);
    isAutoScrollingRef.current = behavior === "smooth" && distance > 2;
    el.scrollTo({ top: el.scrollHeight, behavior });
  }, []);

  return { scrollRef, contentRef, isAtBottom, onScroll, scrollToBottom };
}