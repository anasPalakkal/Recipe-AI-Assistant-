"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ApiKeySummary } from "@recipeai/shared";
import * as apiKeysApi from "@/lib/api/api-keys";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatRelative(iso: string | null): string {
  if (!iso) return "Never used";
  const hours = Math.floor((Date.now() - new Date(iso).getTime()) / 3_600_000);
  if (hours < 1) return "Used just now";
  if (hours < 24) return `Last used ${hours}h ago`;
  return `Last used ${Math.floor(hours / 24)}d ago`;
}

export function ApiKeyCard({ apiKey }: { apiKey: ApiKeySummary }) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleRevoke() {
    setBusy(true);
    try {
      await apiKeysApi.revokeApiKey(apiKey.id);
      setConfirmOpen(false);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center justify-between rounded-2xl border bg-card p-5">
      <div className="min-w-0">
        <p className="font-medium">{apiKey.name}</p>
        <code className="mt-1 inline-block rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">
          {apiKey.keyPrefix}···
        </code>
        <p className="mt-2 text-xs text-muted-foreground">
          Created {formatDate(apiKey.createdAt)} · {formatRelative(apiKey.lastUsedAt)} ·{" "}
          {apiKey.rateLimitPerMinute} req/min · {apiKey.monthlyQuota.toLocaleString()}/mo
        </p>
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <Button variant="outline" onClick={() => setConfirmOpen(true)}>
          Delete
        </Button>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete "{apiKey.name}"?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Any application using this key will immediately lose access. This can't be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleRevoke} disabled={busy}>
              {busy ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}