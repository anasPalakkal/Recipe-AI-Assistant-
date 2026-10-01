import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { Image01Icon } from "@hugeicons/core-free-icons";
import type { RecipeListItem } from "@recipeai/shared";
import { formatMinutes } from "@/lib/recipe-format";
import { RecipeCardMenu } from "./recipe-card-menu";

interface RecipeCardProps {
  recipe: RecipeListItem;
  onDeleted: (recipeId: string) => void;
}

export function RecipeCard({ recipe, onDeleted }: RecipeCardProps) {
  const totalMinutes = (recipe.prepTimeMinutes ?? 0) + (recipe.cookTimeMinutes ?? 0);
  const meta = [
    totalMinutes > 0 ? formatMinutes(totalMinutes) : null,
    recipe.servings ? `${recipe.servings} servings` : null,
    `${recipe.ingredientCount} ingredients`,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-2xl border bg-card transition-shadow hover:shadow-md has-[a:focus-visible]:ring-[3px] has-[a:focus-visible]:ring-ring/50">
      <div className="aspect-4/3 overflow-hidden bg-muted">
        {recipe.imageThumbnailUrl ? (
          <img
            src={recipe.imageThumbnailUrl}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <HugeiconsIcon icon={Image01Icon} size={32} />
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3 sm:gap-1.5 sm:p-4">
        <h2 className="line-clamp-2 font-serif text-base font-semibold leading-snug sm:text-lg">
          <Link
            href={`/recipes/${recipe.id}`}
            className="outline-none after:absolute after:inset-0"
          >
            {recipe.title}
          </Link>
        </h2>
        {recipe.description && (
          <p className="line-clamp-2 hidden text-sm text-muted-foreground sm:block">
            {recipe.description}
          </p>
        )}
        <p className="mt-auto pt-1 text-xs text-muted-foreground sm:pt-2">{meta}</p>
      </div>
      <RecipeCardMenu recipe={recipe} onDeleted={onDeleted} />
    </div>
  );
}