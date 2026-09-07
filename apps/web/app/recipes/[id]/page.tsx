import { notFound } from "next/navigation";
import { serverFetch, ApiError } from "@/lib/api-client";
import type { RecipeResponse } from "@recipeai/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

interface RecipePageProps {
  params: Promise<{ id: string }>;
}

export default async function RecipePage({ params }: RecipePageProps) {
  const { id } = await params;

  let recipe: RecipeResponse;
  try {
    recipe = await serverFetch<RecipeResponse>(`/internal/recipes/${id}`);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      notFound();
    }
    throw err;
  }

  return (
    <main className="mx-auto max-w-2xl p-8">
      <h1 className="mb-2 text-2xl font-semibold">{recipe.title}</h1>
      {recipe.description && (
        <p className="mb-6 text-muted-foreground">{recipe.description}</p>
      )}

      <div className="mb-6 flex gap-4 text-sm text-muted-foreground">
        {recipe.servings && <span>{recipe.servings} servings</span>}
        {recipe.prepTimeMinutes && <span>{recipe.prepTimeMinutes} min prep</span>}
        {recipe.cookTimeMinutes && <span>{recipe.cookTimeMinutes} min cook</span>}
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Ingredients</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="list-disc space-y-1 pl-5">
            {recipe.ingredients.map((ingredient) => (
              <li key={ingredient.id}>
                {ingredient.quantity && `${ingredient.quantity} `}
                {ingredient.unit && `${ingredient.unit} `}
                {ingredient.name}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Steps</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="list-decimal space-y-2 pl-5">
            {recipe.steps.map((step) => (
              <li key={step.id}>{step.content}</li>
            ))}
          </ol>
        </CardContent>
      </Card>
    </main>
  );
}