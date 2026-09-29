import type { RecipeResponse } from "@recipeai/shared";
import { buildRecipeText } from "./recipe-format";

export type ShareOutcome = "shared" | "copied" | "cancelled";

export async function shareRecipe(recipe: RecipeResponse): Promise<ShareOutcome> {
  const text = buildRecipeText(recipe);

  if (typeof navigator.share === "function") {
    try {
      await navigator.share({ title: recipe.title, text });
      return "shared";
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return "cancelled";
    }
  }

  await navigator.clipboard.writeText(text);
  return "copied";
}