import { serverFetch } from "@/lib/api-client";
import type { ListRecipesResponse } from "@recipeai/shared";
import { RECIPES_PAGE_SIZE } from "@/lib/api/recipes";
import { RecipeList } from "@/components/recipes/recipe-list";
import { RecipesEmptyState } from "@/components/recipes/recipes-empty-state";

export const dynamic = "force-dynamic";

export default async function RecipesPage() {
  const { items, nextCursor } = await serverFetch<ListRecipesResponse>(
    `/internal/recipes?limit=${RECIPES_PAGE_SIZE}`,
  );

  return (
    <div className="p-6 md:p-8">
      <div className="mb-6">
        <h1 className="font-serif text-2xl font-semibold">Saved recipes</h1>
        <p className="mt-1 text-sm text-muted-foreground">Recipes you saved from your chats.</p>
      </div>

      {items.length === 0 ? (
        <RecipesEmptyState />
      ) : (
        <RecipeList initialItems={items} initialCursor={nextCursor} />
      )}
    </div>
  );
}