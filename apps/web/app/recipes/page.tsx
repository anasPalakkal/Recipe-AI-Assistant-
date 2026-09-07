import Link from "next/link";
import { serverFetch } from "@/lib/api-client";
import type { ListRecipesResponse } from "@recipeai/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function RecipesPage() {
  const { items } = await serverFetch<ListRecipesResponse>("/internal/recipes");

  return (
    <main className="mx-auto max-w-3xl p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Your recipes</h1>
        <Link href="/recipes/new" className={buttonVariants()}>
          New recipe
        </Link>
      </div>

      {items.length === 0 ? (
        <p className="text-muted-foreground">No recipes yet.</p>
      ) : (
        <div className="space-y-4">
          {items.map((recipe) => (
            <Link key={recipe.id} href={`/recipes/${recipe.id}`}>
              <Card>
                <CardHeader>
                  <CardTitle>{recipe.title}</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  {recipe.ingredients.length} ingredients · {recipe.steps.length} steps
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}