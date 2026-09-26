"use client";

import { useState, useRef, type FormEvent } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { SentIcon, Image01Icon } from "@hugeicons/core-free-icons";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface ChatComposerProps {
  onSend: (prompt: string) => void;
  onSendImage: (file: File, question: string | undefined) => void;
  disabled?: boolean;
}

export function ChatComposer({ onSend, onSendImage, disabled }: ChatComposerProps) {
  const [value, setValue] = useState("");
  const [pendingImage, setPendingImage] = useState<{ file: File; previewUrl: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = ""; // allow re-selecting the same file later

    if (!file) return;

    setPendingImage((prev) => {
      if (prev) URL.revokeObjectURL(prev.previewUrl);
      return { file, previewUrl: URL.createObjectURL(file) };
    });
  }

  function clearPendingImage() {
    setPendingImage((prev) => {
      if (prev) URL.revokeObjectURL(prev.previewUrl);
      return null;
    });
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (disabled) return;

    const trimmed = value.trim();

    if (pendingImage) {
      onSendImage(pendingImage.file, trimmed || undefined);
      clearPendingImage();
      setValue("");
      return;
    }

    if (trimmed.length < 3) return;
    onSend(trimmed);
    setValue("");
  }

  const canSubmit = Boolean(pendingImage) || value.trim().length >= 3;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      {pendingImage && (
        <div className="flex w-fit items-center gap-2 rounded-xl border bg-muted/50 p-1.5 pr-3">
          <img
            src={pendingImage.previewUrl}
            alt="Attached photo preview"
            className="h-10 w-10 rounded-lg object-cover"
          />
          <span className="max-w-[160px] truncate text-xs text-muted-foreground">
            {pendingImage.file.name}
          </span>
          <button
            type="button"
            onClick={clearPendingImage}
            aria-label="Remove attached photo"
            className="ml-1 text-sm text-muted-foreground hover:text-foreground"
          >
            ×
          </button>
        </div>
      )}

      <div className="flex items-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleFileChange}
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          disabled={disabled}
          onClick={() => fileInputRef.current?.click()}
          className="h-12 w-12 shrink-0 rounded-full"
          aria-label="Attach a photo"
        >
          <HugeiconsIcon icon={Image01Icon} size={18} />
        </Button>
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={
            pendingImage
              ? "Add a question about this photo (optional)..."
              : "Describe a recipe, an ingredient, or a craving..."
          }
          maxLength={500}
          disabled={disabled}
          className="h-12 flex-1 rounded-full px-4"
        />
        <Button
          type="submit"
          size="icon"
          disabled={disabled || !canSubmit}
          className="h-12 w-12 shrink-0 rounded-full"
          aria-label="Send"
        >
          <HugeiconsIcon icon={SentIcon} size={18} />
        </Button>
      </div>
    </form>
  );
}