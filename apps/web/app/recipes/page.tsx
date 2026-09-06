import Link from "next/link";
import { serverFetch } from "@/lib/api-client";
import type { ListRecipesResponse } from "@recipeai/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function RecipesPage() {
  const { items } = await serverFetch<ListRecipesResponse>("/internal/recipes");

  return (
    <main className="mx-auto max-w-3xl p-8">
      <h1 className="mb-6 text-2xl font-semibold">Your recipes</h1>
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