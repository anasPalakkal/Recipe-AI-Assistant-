"use server";

import { redirect } from "next/navigation";
import { serverFetch, ApiError } from "@/lib/api-client";

export async function deleteRecipeAndRedirect(recipeId: string): Promise<{ error: string } | undefined> {
  try {
    await serverFetch<void>(`/internal/recipes/${recipeId}`, { method: "DELETE" });
  } catch (err) {
    if (!(err instanceof ApiError && err.status === 404)) {
      return { error: err instanceof ApiError ? err.message : "Failed to delete recipe" };
    }
  }
  redirect("/recipes");
}