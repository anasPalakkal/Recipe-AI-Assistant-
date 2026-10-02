"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { updateProfile, type PublicUser } from "@/lib/api/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const MAX_NAME_LENGTH = 100;

export function ProfileSection({ user }: { user: PublicUser }) {
  const router = useRouter();
  const [name, setName] = useState(user.name ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trimmed = name.trim();
  const canSave = trimmed.length > 0 && trimmed !== (user.name ?? "") && !saving;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!canSave) return;

    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      await updateProfile({ name: trimmed });
      setName(trimmed);
      setSaved(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update name");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="settings-name">Name</Label>
        <Input
          id="settings-name"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setSaved(false);
          }}
          maxLength={MAX_NAME_LENGTH}
          autoComplete="name"
          placeholder="What should we call you?"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="settings-email">Email</Label>
        <Input id="settings-email" value={user.email} readOnly disabled />
        <p className="text-xs text-muted-foreground">Your email address can't be changed.</p>
      </div>

      <div className="flex items-center gap-3">
        <p
          role={error ? "alert" : "status"}
          className={`mr-auto text-sm ${error ? "text-destructive" : "text-muted-foreground"}`}
        >
          {error ?? (saved ? "Saved" : "")}
        </p>
        <Button type="submit" disabled={!canSave}>
          {saving ? "Saving…" : "Save"}
        </Button>
      </div>
    </form>
  );
}