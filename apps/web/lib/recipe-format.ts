import type { IngredientResponse, RecipeResponse  } from "@recipeai/shared";

export function formatQuantity(quantity: number): string {
  return String(Math.round(quantity * 100) / 100);
}

export function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder === 0 ? `${hours} h` : `${hours} h ${remainder} min`;
}

export function formatIngredientAmount({
  quantity,
  unit,
}: Pick<IngredientResponse, "quantity" | "unit">): string {
  return [quantity !== null ? formatQuantity(quantity) : null, unit]
    .filter(Boolean)
    .join(" ");
}

export function buildRecipeText(recipe: RecipeResponse): string {
  const ingredients = recipe.ingredients.map(
    (ingredient) =>
      `- ${[formatIngredientAmount(ingredient), ingredient.name].filter(Boolean).join(" ")}`,
  );
  const steps = recipe.steps.map((step, index) => `${index + 1}. ${step.content}`);

  return [
    recipe.title,
    recipe.description,
    "",
    "Ingredients:",
    ...ingredients,
    "",
    "Steps:",
    ...steps,
  ]
    .filter((line): line is string => line !== null)
    .join("\n");
}