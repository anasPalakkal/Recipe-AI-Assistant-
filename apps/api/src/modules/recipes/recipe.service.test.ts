import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../lib/prisma.js", () => ({
  prisma: { recipe: { findMany: vi.fn(), findFirst: vi.fn(), delete: vi.fn() } },
}));

import { prisma } from "../../lib/prisma.js";
import { listRecipes, deleteRecipe } from "./recipe.service.js";
import { NotFoundError } from "../../lib/errors.js";

const findMany = vi.mocked(prisma.recipe.findMany);
const findFirst = vi.mocked(prisma.recipe.findFirst);
const remove = vi.mocked(prisma.recipe.delete);

function row(id: string) {
  return { id, title: id, _count: { ingredients: 2, steps: 3 } } as never;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("listRecipes", () => {
  it("returns a next cursor when more rows exist", async () => {
    findMany.mockResolvedValue([row("a"), row("b"), row("c")]);

    const result = await listRecipes("user-1", { limit: 2 });

    expect(result.items.map((item) => item.id)).toEqual(["a", "b"]);
    expect(result.nextCursor).toBe("b");
    expect(result.items[0]).toMatchObject({ ingredientCount: 2, stepCount: 3 });
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: "user-1" }, take: 3 }),
    );
  });

  it("returns a null cursor on the last page", async () => {
    findMany.mockResolvedValue([row("a")]);

    const result = await listRecipes("user-1", { limit: 2 });

    expect(result.nextCursor).toBeNull();
  });

  it("skips the cursor row itself when a cursor is given", async () => {
    findMany.mockResolvedValue([]);

    await listRecipes("user-1", { limit: 2, cursor: "b" });

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ cursor: { id: "b" }, skip: 1 }),
    );
  });
});

describe("deleteRecipe", () => {
  it("refuses to delete a recipe owned by someone else", async () => {
    findFirst.mockResolvedValue(null);

    await expect(deleteRecipe("user-1", "recipe-9")).rejects.toBeInstanceOf(NotFoundError);
    expect(findFirst).toHaveBeenCalledWith({ where: { id: "recipe-9", userId: "user-1" } });
    expect(remove).not.toHaveBeenCalled();
  });

  it("deletes a recipe the user owns", async () => {
    findFirst.mockResolvedValue({ id: "recipe-1" } as never);

    await deleteRecipe("user-1", "recipe-1");

    expect(remove).toHaveBeenCalledWith({ where: { id: "recipe-1" } });
  });
});