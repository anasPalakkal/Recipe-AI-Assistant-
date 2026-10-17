"use client";

import { useEffect, useLayoutEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { SentIcon, Image01Icon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";

const MAX_TEXTAREA_HEIGHT_PX = 160;

export interface ComposerDraft {
  text: string;
  image: File | null;
}

interface ChatComposerProps {
  onSend: (prompt: string) => void;
  onSendImage: (file: File, question: string | undefined) => void;
  disabled?: boolean;
  initialDraft?: ComposerDraft;
}

export function ChatComposer({ onSend, onSendImage, disabled, initialDraft }: ChatComposerProps) {
  const [value, setValue] = useState(initialDraft?.text ?? "");
  const [imageFile, setImageFile] = useState<File | null>(initialDraft?.image ?? null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!imageFile) return;
    const url = URL.createObjectURL(imageFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

  // Runs before paint so the box never flashes at the wrong height.
  // Resetting to "auto" first lets it shrink when text is deleted.
  useLayoutEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    const contentHeight = textarea.scrollHeight;
    textarea.style.height = `${Math.min(contentHeight, MAX_TEXTAREA_HEIGHT_PX)}px`;
    textarea.style.overflowY = contentHeight > MAX_TEXTAREA_HEIGHT_PX ? "auto" : "hidden";
  }, [value]);

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = ""; // allow re-selecting the same file later
    if (file) setImageFile(file);
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (disabled) return;

    const trimmed = value.trim();

    if (imageFile) {
      onSendImage(imageFile, trimmed || undefined);
      setImageFile(null);
      setValue("");
      return;
    }

    if (trimmed.length < 3) return;
    onSend(trimmed);
    setValue("");
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return;
    if (window.matchMedia("(pointer: coarse)").matches) return;
    event.preventDefault();
    event.currentTarget.form?.requestSubmit();
  }

  const canSubmit = Boolean(imageFile) || value.trim().length >= 3;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      {imageFile && previewUrl && (
        <div className="flex w-fit items-center gap-2 rounded-xl border bg-muted/50 p-1.5 pr-3">
          <img
            src={previewUrl}
            alt="Attached photo preview"
            className="h-10 w-10 rounded-lg object-cover"
          />
          <span className="max-w-[160px] truncate text-xs text-muted-foreground">
            {imageFile.name}
          </span>
          <button
            type="button"
            onClick={() => setImageFile(null)}
            aria-label="Remove attached photo"
            className="ml-1 text-sm text-muted-foreground hover:text-foreground"
          >
            ×
          </button>
        </div>
      )}

      <div className="flex items-end gap-1 rounded-3xl border bg-background p-1.5 focus-within:ring-2 focus-within:ring-ring/50">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleFileChange}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled={disabled}
          onClick={() => fileInputRef.current?.click()}
          className="h-9 w-9 shrink-0 rounded-full"
          aria-label="Attach a photo"
        >
          <HugeiconsIcon icon={Image01Icon} size={18} />
        </Button>
        <textarea
          ref={textareaRef}
          rows={1}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={imageFile ? "Ask about this photo..." : "What are you craving?"}
          maxLength={500}
          disabled={disabled}
          autoFocus={Boolean(initialDraft)}
          className="min-h-9 min-w-0 flex-1 resize-none self-center bg-transparent px-2 py-1.5 text-base leading-6 outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
        />
        <Button
          type="submit"
          size="icon"
          disabled={disabled || !canSubmit}
          className="h-9 w-9 shrink-0 rounded-full"
          aria-label="Send"
        >
          <HugeiconsIcon icon={SentIcon} size={18} />
        </Button>
      </div>
    </form>
  );
}