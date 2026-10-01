"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { SentIcon, Image01Icon } from "@hugeicons/core-free-icons";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

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
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!imageFile) return;
    const url = URL.createObjectURL(imageFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [imageFile]);

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
            imageFile
              ? "Add a question about this photo (optional)..."
              : "Describe a recipe, an ingredient, or a craving..."
          }
          maxLength={500}
          disabled={disabled}
          autoFocus={Boolean(initialDraft)}
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