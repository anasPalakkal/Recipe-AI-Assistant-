import { z } from "zod";

export const nutritionEstimateSchema = z.object({
  calories: z.number().nonnegative(),
  proteinGrams: z.number().nonnegative(),
  carbsGrams: z.number().nonnegative(),
  fatGrams: z.number().nonnegative(),
  // Literal, not a free string - forces every food_analysis response to
  // carry this flag, so the client can never render nutrition as precise.
  confidence: z.literal("estimated"),
});

export const imageAnalysisResponseSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("food_analysis"),
    foodName: z.string().min(1),
    description: z.string().min(1),
    likelyIngredients: z.array(z.string()).min(1),
    nutrition: nutritionEstimateSchema,
    // A short, generic phrase suitable to pass directly into
    // /recipes/generate as the prompt - not a full recipe itself.
    suggestedRecipePrompt: z.string().min(1),
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