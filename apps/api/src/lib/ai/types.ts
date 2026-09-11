import type { RecipeDraft } from "@recipeai/shared";

export interface RecipeGenerationResult {
  draft: RecipeDraft;
  raw: unknown;
}

export interface AiProvider {
  generateRecipe(prompt: string): Promise<RecipeGenerationResult>;
  generateRecipeStream(prompt: string, signal?: AbortSignal): AsyncGenerator<string>;
}