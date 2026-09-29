import Link from "next/link";
import { notFound } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowLeft01Icon } from "@hugeicons/core-free-icons";
import { serverFetch, ApiError } from "@/lib/api-client";
import type { RecipeResponse } from "@recipeai/shared";
import { formatIngredientAmount, formatMinutes } from "@/lib/recipe-format";
import { buttonVariants } from "@/components/ui/button";
import { DeleteRecipeButton } from "@/components/recipes/delete-recipe-button";

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

  const stats = [
    { label: "Prep", value: recipe.prepTimeMinutes ? formatMinutes(recipe.prepTimeMinutes) : null },
    { label: "Cook", value: recipe.cookTimeMinutes ? formatMinutes(recipe.cookTimeMinutes) : null },
    { label: "Serves", value: recipe.servings ? String(recipe.servings) : null },
  ].filter((stat): stat is { label: string; value: string } => stat.value !== null);

  return (
    <div className="mx-auto max-w-4xl p-6 md:p-8">
      <Link
        href="/recipes"
        className={`${buttonVariants({ variant: "ghost", size: "sm" })} -ml-3 mb-4`}
      >
        <HugeiconsIcon icon={ArrowLeft01Icon} size={16} />
        Recipes
      </Link>

      {recipe.imageUrl && (
        <figure className="mb-6">
          <img
            src={recipe.imageUrl}
            alt={recipe.title}
            className="aspect-3/2 w-full rounded-2xl object-cover"
          />
          {recipe.imageAttributionName && (
            <figcaption className="mt-2 text-xs text-muted-foreground">
              Photo by{" "}
              {recipe.imageAttributionUrl ? (
                <a
                  href={recipe.imageAttributionUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="underline"
                >
                  {recipe.imageAttributionName}
                </a>
              ) : (
                recipe.imageAttributionName
              )}
              {recipe.imageSource === "PEXELS" && " on Pexels"}
            </figcaption>
          )}
        </figure>
      )}

      <div className="mb-3 flex items-start justify-between gap-4">
        <h1 className="font-serif text-3xl font-semibold leading-tight">{recipe.title}</h1>
        <DeleteRecipeButton recipeId={recipe.id} title={recipe.title} />
      </div>

      {recipe.description && (
        <p className="mb-5 leading-relaxed text-muted-foreground">{recipe.description}</p>
      )}

      {stats.length > 0 && (
        <div className="mb-8 flex flex-wrap gap-3">
          {stats.map((stat) => (
            <div key={stat.label} className="rounded-xl border bg-card px-4 py-2">
              <p className="text-xs text-muted-foreground">{stat.label}</p>
              <p className="text-sm font-medium">{stat.value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <section className="self-start rounded-2xl border bg-card p-6">
          <h2 className="mb-4 font-serif text-lg font-medium">Ingredients</h2>
          <ul className="space-y-2.5 text-sm">
            {recipe.ingredients.map((ingredient) => {
              const amount = formatIngredientAmount(ingredient);
              return (
                <li key={ingredient.id} className="flex gap-3">
                  <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
                  <span>
                    {amount && <span className="font-medium">{amount} </span>}
                    {ingredient.name}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="rounded-2xl border bg-card p-6">
          <h2 className="mb-4 font-serif text-lg font-medium">Steps</h2>
          <ol className="space-y-4">
            {recipe.steps.map((step, index) => (
              <li key={step.id} className="flex gap-4">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-semibold text-accent-foreground">
                  {index + 1}
                </span>
                <p className="pt-0.5 text-sm leading-relaxed">{step.content}</p>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </div>
  );
}