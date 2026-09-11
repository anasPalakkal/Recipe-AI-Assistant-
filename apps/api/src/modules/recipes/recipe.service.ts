import { Prisma, GenerationStatus } from "@prisma/client";
import { aiProvider } from "../../lib/ai/index.js";
import { prisma } from "../../lib/prisma.js";
import { NotFoundError, UpstreamServiceError } from "../../lib/errors.js";
import { createRecipeSchema, type CreateRecipeInput, type UpdateRecipeInput, type ListRecipesQuery, type RecipeDraft } from "@recipeai/shared";

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

export async function generateRecipeDraft(userId: string, prompt: string) {
  try {
    const { draft, raw } = await aiProvider.generateRecipe(prompt);

    await prisma.aiGeneration.create({
      data: {
        userId,
        prompt,
        rawResponse: raw as Prisma.InputJsonValue,
        status: GenerationStatus.SUCCESS,
      },
    });

    return draft;
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
}

export type GenerateStreamEvent =
  | { type: "chunk"; text: string }
  | { type: "done"; draft: RecipeDraft }
  | { type: "error"; message: string };

export async function* generateRecipeDraftStream(
  userId: string,
  prompt: string,
  signal?: AbortSignal,
): AsyncGenerator<GenerateStreamEvent> {
  let accumulated = "";

  try {
    for await (const chunk of aiProvider.generateRecipeStream(prompt, signal)) {
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

    const result = createRecipeSchema.safeParse(parsed);
    if (!result.success) {
      throw new UpstreamServiceError("AI provider returned a recipe that failed validation");
    }

    await prisma.aiGeneration.create({
      data: {
        userId,
        prompt,
        rawResponse: parsed as Prisma.InputJsonValue,
        status: GenerationStatus.SUCCESS,
      },
    });

    yield { type: "done", draft: result.data as RecipeDraft };
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