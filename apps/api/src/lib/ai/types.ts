import type { RecipeDraft } from "@recipeai/shared";

export type ConsumerType = "internal" | "public";

export interface RecipeGenerationResult {
  draft: RecipeDraft;
  raw: unknown;
}

export interface AiProvider {
  generateRecipe(prompt: string, consumerType: ConsumerType): Promise<RecipeGenerationResult>;
  generateRecipeStream(
    prompt: string,
    consumerType: ConsumerType,
    signal?: AbortSignal,
  ): AsyncGenerator<string>;
}