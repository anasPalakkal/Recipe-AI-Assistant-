"use client";

import { useState, type FormEvent } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { SentIcon } from "@hugeicons/core-free-icons";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface ChatComposerProps {
  onSend: (prompt: string) => void;
  disabled?: boolean;
}

export function ChatComposer({ onSend, disabled }: ChatComposerProps) {
  const [value, setValue] = useState("");

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = value.trim();
    if (trimmed.length < 3 || disabled) return;
    onSend(trimmed);
    setValue("");
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2">
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Describe a recipe, an ingredient, or a craving..."
        maxLength={500}
        disabled={disabled}
        className="h-12 flex-1 rounded-full px-4"
      />
      <Button
        type="submit"
        size="icon"
        disabled={disabled || value.trim().length < 3}
        className="h-12 w-12 shrink-0 rounded-full"
        aria-label="Send"
      >
        <HugeiconsIcon icon={SentIcon} size={18} />
      </Button>
    </form>
  );
}