import { z } from "zod";
import { aiRecipeDraftSchema } from "./recipe.schema.js";

export const nutritionEstimateSchema = z.object({
  calories: z.number().nonnegative(),
  proteinGrams: z.number().nonnegative(),
  carbsGrams: z.number().nonnegative(),
  fatGrams: z.number().nonnegative(),
  confidence: z.literal("estimated"),
});

export const imageAnalysisResponseSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("food_analysis"),
    foodName: z.string().min(1),
    description: z.string().min(1),
    likelyIngredients: z.array(z.string()).min(1),
    nutrition: nutritionEstimateSchema,
    suggestedRecipePrompt: z.string().min(1),
  }),
  // The user asked how to cook the pictured dish rather than what's in
  // it - same recipe shape text chat already produces, so it persists
  // and renders through the exact same RecipeMessageCard path, not a
  // separate one.
  z.object({
    type: z.literal("recipe"),
    recipe: aiRecipeDraftSchema,
  }),
  z.object({
    type: z.literal("not_food"),
    detectedSubject: z.string().min(1),
  }),
  z.object({
    type: z.literal("unclear"),
    reason: z.string().min(1),
  }),
]);

export type NutritionEstimate = z.infer<typeof nutritionEstimateSchema>;
export type ImageAnalysisResponse = z.infer<typeof imageAnalysisResponseSchema>;