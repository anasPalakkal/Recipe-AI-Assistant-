import { Prisma, GenerationStatus } from "@prisma/client";
import type { ConsumerType } from "../../lib/ai/types.js";
import { aiProvider } from "../../lib/ai/index.js";
import { prisma } from "../../lib/prisma.js";
import { NotFoundError, UpstreamServiceError, UnprocessableEntityError } from "../../lib/errors.js";
import {
  // createRecipeSchema,
  aiResponseSchema,
  type AiResponse,
  type CreateRecipeInput,
  type UpdateRecipeInput,
  type ListRecipesQuery,
  type RecipeDraft,
} from "@recipeai/shared";
const recipeInclude = {
  ingredients: { orderBy: { order: "asc" } },
  steps: { orderBy: { order: "asc" } },
} satisfies Prisma.RecipeInclude;

export async function createRecipe(userId: string, input: CreateRecipeInput) {
  return prisma.recipe.create({
    data: {
      userId,
      title: input.title,
      description: input.description ?? null,
      servings: input.servings ?? null,
      prepTimeMinutes: input.prepTimeMinutes ?? null,
      cookTimeMinutes: input.cookTimeMinutes ?? null,
      ingredients: {
        create: input.ingredients.map((ingredient, order) => ({ ...ingredient, order })),
      },
      steps: {
        create: input.steps.map((step, order) => ({ ...step, order })),
      },
    },
    include: recipeInclude,
  });
}

export async function listRecipes(userId: string, query: ListRecipesQuery) {
  const recipes = await prisma.recipe.findMany({
    where: { userId },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: query.limit + 1,
    ...(query.cursor && { cursor: { id: query.cursor }, skip: 1 }),
    include: recipeInclude,
  });

  const hasMore = recipes.length > query.limit;
  const items = hasMore ? recipes.slice(0, query.limit) : recipes;
  const nextCursor = hasMore ? (items[items.length - 1]?.id ?? null) : null;

  return { items, nextCursor };
}

export async function getRecipeById(userId: string, id: string) {
  const recipe = await prisma.recipe.findFirst({
    where: { id, userId },
    include: recipeInclude,
  });
  if (!recipe) throw new NotFoundError("Recipe not found");
  return recipe;
}

export async function updateRecipe(userId: string, id: string, input: UpdateRecipeInput) {
  const existing = await prisma.recipe.findFirst({ where: { id, userId } });
  if (!existing) throw new NotFoundError("Recipe not found");

  return prisma.$transaction(async (tx) => {
    if (input.ingredients) {
      await tx.ingredient.deleteMany({ where: { recipeId: id } });
    }
    if (input.steps) {
      await tx.instructionStep.deleteMany({ where: { recipeId: id } });
    }

    return tx.recipe.update({
      where: { id },
      data: {
        ...(input.title !== undefined && { title: input.title }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.servings !== undefined && { servings: input.servings }),
        ...(input.prepTimeMinutes !== undefined && { prepTimeMinutes: input.prepTimeMinutes }),
        ...(input.cookTimeMinutes !== undefined && { cookTimeMinutes: input.cookTimeMinutes }),
        ...(input.ingredients && {
          ingredients: {
            create: input.ingredients.map((ingredient, order) => ({ ...ingredient, order })),
          },
        }),
        ...(input.steps && {
          steps: { create: input.steps.map((step, order) => ({ ...step, order })) },
        }),
      },
      include: recipeInclude,
    });
  });
}

export async function deleteRecipe(userId: string, id: string) {
  const existing = await prisma.recipe.findFirst({ where: { id, userId } });
  if (!existing) throw new NotFoundError("Recipe not found");
  await prisma.recipe.delete({ where: { id } });
}

// Maps a non-recipe AiResponse to the error this endpoint returns. Reaching
// the provider and getting a valid, schema-conforming response is still a
// successful generation (logged as SUCCESS below) even when it's a refusal
// or a food-info answer - this is a caller-contract mismatch (this endpoint
// promises a recipe), not an upstream failure, so it's never logged FAILED.
function toRecipeOnlyError(response: Extract<AiResponse, { type: "food_info" | "refused" }>) {
  if (response.type === "food_info") {
    return new UnprocessableEntityError(
      "This looks like a food question rather than a recipe request.",
      "FOOD_INFO_NOT_RECIPE",
      { answer: response.answer },
    );
  }
  return new UnprocessableEntityError(
    response.reason === "out_of_scope"
      ? "This request isn't related to recipes or cooking."
      : "This request couldn't be processed.",
    response.reason === "out_of_scope" ? "OUT_OF_SCOPE" : "UNSAFE_OR_UNCLEAR",
  );
}

export async function generateRecipeDraft(userId: string, prompt: string, consumerType: ConsumerType) {
  let response: AiResponse;
  let raw: unknown;

  try {
    ({ response, raw } = await aiProvider.generateRecipe(prompt, consumerType));
  } catch (err) {
    await prisma.aiGeneration.create({
      data: {
        userId,
        prompt,
        rawResponse: { error: err instanceof Error ? err.message : "Unknown error" },
        status: GenerationStatus.FAILED,
      },
    });
    throw err;
  }

  await prisma.aiGeneration.create({
    data: {
      userId,
      prompt,
      rawResponse: raw as Prisma.InputJsonValue,
      status: GenerationStatus.SUCCESS,
    },
  });

  if (response.type !== "recipe") {
    throw toRecipeOnlyError(response);
  }

  return response.recipe;
}

export type GenerateStreamEvent =
  | { type: "chunk"; text: string }
  | { type: "done"; draft: RecipeDraft }
  | { type: "refused"; message: string; reasonCode: "OUT_OF_SCOPE" | "FOOD_INFO_NOT_RECIPE" | "UNSAFE_OR_UNCLEAR" }
  | { type: "error"; message: string };

export async function* generateRecipeDraftStream(
  userId: string,
  prompt: string,
  consumerType: ConsumerType,
  signal?: AbortSignal,
): AsyncGenerator<GenerateStreamEvent> {
  let accumulated = "";

  try {
    for await (const chunk of aiProvider.generateRecipeStream(prompt, consumerType, signal)) {
      accumulated += chunk;
      yield { type: "chunk", text: chunk };
    }
    if (signal?.aborted) return;

    let parsed: unknown;
    try {
      parsed = JSON.parse(accumulated);
    } catch {
      throw new UpstreamServiceError("AI provider returned malformed JSON");
    }

    const result = aiResponseSchema.safeParse(parsed);
    if (!result.success) {
      throw new UpstreamServiceError("AI provider returned a response that failed validation");
    }

    await prisma.aiGeneration.create({
      data: {
        userId,
        prompt,
        rawResponse: parsed as Prisma.InputJsonValue,
        status: GenerationStatus.SUCCESS,
      },
    });

    const response = result.data;
    if (response.type !== "recipe") {
      const reasonCode =
        response.type === "food_info"
          ? "FOOD_INFO_NOT_RECIPE"
          : response.reason === "out_of_scope"
            ? "OUT_OF_SCOPE"
            : "UNSAFE_OR_UNCLEAR";
      const message =
        response.type === "food_info"
          ? response.answer
          : reasonCode === "OUT_OF_SCOPE"
            ? "This request isn't related to recipes or cooking."
            : "This request couldn't be processed.";
      yield { type: "refused", message, reasonCode };
      return;
    }

    yield { type: "done", draft: response.recipe as RecipeDraft };
  } catch (err) {
    if (signal?.aborted) return;

    const message = err instanceof Error ? err.message : "Unknown error";
    await prisma.aiGeneration.create({
      data: {
        userId,
        prompt,
        rawResponse: { error: message, partialText: accumulated },
        status: GenerationStatus.FAILED,
      },
    });
    yield { type: "error", message };
  }
}