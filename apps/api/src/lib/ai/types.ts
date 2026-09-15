import type { RecipeDraft } from "@recipeai/shared";

export type ConsumerType = "internal" | "public";

export interface RecipeGenerationResult {
  draft: RecipeDraft;
  raw: unknown;
}

// One turn of conversational history for recipe refinement. "user" turns
// are prompt text; "model" turns are the previously generated recipe draft,
// serialized back as JSON so the model can reference/modify its own output.
export interface ChatTurn {
  role: "user" | "model";
  content: string;
}

export interface AiProvider {
  generateRecipe(prompt: string, consumerType: ConsumerType): Promise<RecipeGenerationResult>;
  generateRecipeStream(
    prompt: string,
    consumerType: ConsumerType,
    signal?: AbortSignal,
  ): AsyncGenerator<string>;
  generateRecipeInContext(
    history: ChatTurn[],
    consumerType: ConsumerType,
  ): Promise<RecipeGenerationResult>;
}