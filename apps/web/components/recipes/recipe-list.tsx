"use client";

import { useState } from "react";
import type { RecipeListItem } from "@recipeai/shared";
import * as recipesApi from "@/lib/api/recipes";
import { Button } from "@/components/ui/button";
import { RecipeCard } from "./recipe-card";
import { RecipesEmptyState } from "./recipes-empty-state";

interface RecipeListProps {
  initialItems: RecipeListItem[];
  initialCursor: string | null;
}

export function RecipeList({ initialItems, initialCursor }: RecipeListProps) {
  const [items, setItems] = useState(initialItems);
  const [cursor, setCursor] = useState(initialCursor);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadPage(nextCursor?: string, replace = false) {
    setLoading(true);
    setError(null);
    try {
      const page = await recipesApi.listRecipes(nextCursor);
      setItems((prev) => (replace ? page.items : [...prev, ...page.items]));
      setCursor(page.nextCursor);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load recipes");
    } finally {
      setLoading(false);
    }
  }

  function handleLoadMore() {
    if (cursor && !loading) void loadPage(cursor);
  }

  // Prisma cursors must reference an existing row, so a deleted cursor
  // item would make the next "Load more" return nothing.
  function handleDeleted(recipeId: string) {
    const index = items.findIndex((item) => item.id === recipeId);
    setItems((prev) => prev.filter((item) => item.id !== recipeId));

    if (recipeId !== cursor) return;

    const previous = items[index - 1];
    if (previous) setCursor(previous.id);
    else void loadPage(undefined, true);
  }

  if (items.length === 0 && !cursor && !loading) return <RecipesEmptyState />;

  return (
    <div>
      <div className="@container">
        <div className="grid grid-cols-2 gap-3 @3xl:grid-cols-3 @3xl:gap-5">
          {items.map((recipe) => (
            <RecipeCard key={recipe.id} recipe={recipe} onDeleted={handleDeleted} />
          ))}
        </div>
      </div>

      {error && <p className="mt-4 text-center text-sm text-destructive">{error}</p>}

      {cursor && (
        <div className="mt-8 flex justify-center">
          <Button variant="outline" onClick={handleLoadMore} disabled={loading}>
            {loading ? "Loading…" : "Load more"}
          </Button>
        </div>
      )}
    </div>
  );
}