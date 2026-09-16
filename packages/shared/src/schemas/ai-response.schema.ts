import { z } from "zod";
import { createRecipeSchema } from "./recipe.schema.js"; // adjust path to wherever this is actually defined

export const aiRefusalReasonSchema = z.enum(["out_of_scope", "unsafe_or_unclear"]);

export const aiResponseSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("recipe"),
    recipe: createRecipeSchema,
  }),
  z.object({
    type: z.literal("food_info"),
    answer: z.string().min(1),
  }),
  z.object({
    type: z.literal("refused"),
    reason: aiRefusalReasonSchema,
  }),
]);

export type AiResponse = z.infer<typeof aiResponseSchema>;
export type AiRefusalReason = z.infer<typeof aiRefusalReasonSchema>;