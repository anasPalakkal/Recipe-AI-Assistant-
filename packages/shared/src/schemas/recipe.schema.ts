import { z } from "zod";

const ingredientSchema = z.object({
  name: z.string().trim().min(1).max(200),
  quantity: z.number().positive().finite().nullable().optional(),
  unit: z.string().trim().max(50).nullable().optional(),
});

const instructionStepSchema = z.object({
  content: z.string().trim().min(1).max(2000),
});

export const createRecipeSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).nullable().optional(),
  servings: z.number().int().positive().nullable().optional(),
  prepTimeMinutes: z.number().int().nonnegative().nullable().optional(),
  cookTimeMinutes: z.number().int().nonnegative().nullable().optional(),
  ingredients: z.array(ingredientSchema).min(1).max(100),
  steps: z.array(instructionStepSchema).min(1).max(100),
});

export const updateRecipeSchema = createRecipeSchema.partial();

export const listRecipesQuerySchema = z.object({
  cursor: z.string().cuid().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const generateRecipeSchema = z.object({
  prompt: z.string().trim().min(3).max(500),
});

export const recipeIdParamSchema = z.object({
  id: z.string().cuid(),
});

export interface IngredientResponse {
  id: string;
  name: string;
  quantity: number | null;
  unit: string | null;
  order: number;
}

export interface InstructionStepResponse {
  id: string;
  content: string;
  order: number;
}

export interface RecipeResponse {
  id: string;
  title: string;
  description: string | null;
  servings: number | null;
  prepTimeMinutes: number | null;
  cookTimeMinutes: number | null;
  source: "USER" | "AI";
  createdAt: string;
  updatedAt: string;
  ingredients: IngredientResponse[];
  steps: InstructionStepResponse[];
}

export interface ListRecipesResponse {
  items: RecipeResponse[];
  nextCursor: string | null;
}

export type CreateRecipeInput = z.infer<typeof createRecipeSchema>;
export type UpdateRecipeInput = z.infer<typeof updateRecipeSchema>;
export type ListRecipesQuery = z.infer<typeof listRecipesQuerySchema>;
export type GenerateRecipeInput = z.infer<typeof generateRecipeSchema>;
export type RecipeIdParam = z.infer<typeof recipeIdParamSchema>;
export type RecipeDraft = z.infer<typeof createRecipeSchema>;