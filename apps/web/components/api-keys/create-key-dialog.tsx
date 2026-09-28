"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
// Verify Copy01Icon exists; Tick02Icon is confirmed (used in dropdown-menu.tsx).
import { PlusSignIcon, Copy01Icon, Tick02Icon } from "@hugeicons/core-free-icons";
import type { CreatedApiKeyResponse } from "@recipeai/shared";
import * as apiKeysApi from "@/lib/api/api-keys";
import { ApiError } from "@/lib/api-errors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function CreateKeyDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<CreatedApiKeyResponse | null>(null);
  const [copied, setCopied] = useState(false);

  function reset() {
    setName("");
    setBusy(false);
    setError(null);
    setCreated(null);
    setCopied(false);
  }

  function handleOpenChange(next: boolean) {
    // Refresh server-rendered data (key list, dashboard counts) only after
    // a successful create, once the raw key has actually been shown.
    if (!next && created) router.refresh();
    setOpen(next);
    if (!next) reset();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;

    setBusy(true);
    setError(null);
    try {
      const result = await apiKeysApi.createApiKey({ name: trimmed });
      setCreated(result);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not create key. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function handleCopy() {
    if (!created) return;
    await navigator.clipboard.writeText(created.rawKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <Button onClick={() => setOpen(true)} className="gap-2">
        <HugeiconsIcon icon={PlusSignIcon} size={18} />
        Create key
      </Button>
      <DialogContent>
        {created ? (
          <>
            <DialogHeader>
              <DialogTitle>Key created</DialogTitle>
              <DialogDescription>
                Copy this key now — for your security, it won't be shown again.
              </DialogDescription>
            </DialogHeader>
            <div className="flex items-center gap-2 rounded-md border bg-muted px-3 py-2">
              <code className="flex-1 overflow-x-auto text-sm">{created.rawKey}</code>
              <Button variant="ghost" size="icon-sm" onClick={handleCopy} aria-label="Copy key">
                <HugeiconsIcon icon={copied ? Tick02Icon : Copy01Icon} size={16} />
              </Button>
            </div>
            <DialogFooter>
              <Button onClick={() => handleOpenChange(false)}>Done</Button>
            </DialogFooter>
          </>
        ) : (
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>Create API key</DialogTitle>
              <DialogDescription>
                Give this key a name so you can recognize it later, e.g. "Production" or "Local dev".
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4 space-y-1.5">
              <Label htmlFor="key-name">Name</Label>
              <Input
                id="key-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={100}
                placeholder="Production"
                autoFocus
                disabled={busy}
              />
            </div>
            {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={busy}>
                Cancel
              </Button>
              <Button type="submit" disabled={busy || !name.trim()}>
                {busy ? "Creating…" : "Create key"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}