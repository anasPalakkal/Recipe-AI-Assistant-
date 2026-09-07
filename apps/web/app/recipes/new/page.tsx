"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { generateRecipeSchema } from "@recipeai/shared";
import type { RecipeDraft } from "@recipeai/shared";
import { extractErrorMessage } from "@/lib/api-errors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RecipeDraftPreview } from "@/components/recipe-draft-preview";

type Status = "idle" | "generating" | "saving";

export default function NewRecipePage() {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [draft, setDraft] = useState<RecipeDraft | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  async function runGenerate(promptValue: string) {
    const parsed = generateRecipeSchema.safeParse({ prompt: promptValue });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid prompt");
      return;
    }

    setError(null);
    setStatus("generating");
    try {
      const response = await fetch("/api/recipes/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(parsed.data),
      });

      const body: unknown = await response.json().catch(() => null);

      if (!response.ok) {
        const { message } = extractErrorMessage(body);
        setError(message ?? "Failed to generate recipe");
        return;
      }

      setDraft(body as RecipeDraft);
    } finally {
      setStatus("idle");
    }
  }

  async function handleSave() {
    if (!draft) return;

    setError(null);
    setStatus("saving");
    try {
      const response = await fetch("/api/recipes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(draft),
      });

      const body: unknown = await response.json().catch(() => null);

      if (!response.ok) {
        const { message } = extractErrorMessage(body);
        setError(message ?? "Failed to save recipe");
        return;
      }

      const saved = body as { id: string };
      router.push(`/recipes/${saved.id}`);
    } finally {
      setStatus("idle");
    }
  }

  return (
    <main className="mx-auto max-w-2xl p-8">
      <h1 className="mb-6 text-2xl font-semibold">Generate a recipe</h1>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          void runGenerate(prompt);
        }}
        className="mb-8 space-y-4"
      >
        <div className="space-y-2">
          <Label htmlFor="prompt">What do you want to cook?</Label>
          <Input
            id="prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g. a quick weeknight chicken curry, serves 4"
            required
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button type="submit" disabled={status === "generating"}>
          {status === "generating" ? "Generating..." : "Generate"}
        </Button>
      </form>

      {draft && (
        <div className="space-y-4">
          <RecipeDraftPreview draft={draft} />
          <div className="flex gap-3">
            <Button onClick={handleSave} disabled={status === "saving"}>
              {status === "saving" ? "Saving..." : "Save recipe"}
            </Button>
            <Button
              variant="outline"
              onClick={() => void runGenerate(prompt)}
              disabled={status === "generating"}
            >
              Regenerate
            </Button>
          </div>
        </div>
      )}
    </main>
  );
}