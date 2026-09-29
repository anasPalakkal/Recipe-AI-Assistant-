import type { ListRecipesResponse, RecipeResponse } from "@recipeai/shared";
import { apiGet, apiDelete } from "./request";

export const RECIPES_PAGE_SIZE = 12;

export function listRecipes(cursor?: string): Promise<ListRecipesResponse> {
  const params = new URLSearchParams({ limit: String(RECIPES_PAGE_SIZE) });
  if (cursor) params.set("cursor", cursor);
  return apiGet<ListRecipesResponse>(`/api/recipes?${params.toString()}`);
}

export function deleteRecipe(recipeId: string): Promise<void> {
  return apiDelete<void>(`/api/recipes/${recipeId}`);
}

export function getRecipe(recipeId: string): Promise<RecipeResponse> {
  return apiGet<RecipeResponse>(`/api/recipes/${recipeId}`);
}