"use client";

import { useEffect, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { MoreVerticalIcon, Share08Icon, Delete02Icon } from "@hugeicons/core-free-icons";
import type { RecipeListItem } from "@recipeai/shared";
import * as recipesApi from "@/lib/api/recipes";
import { shareRecipe } from "@/lib/share-recipe";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DeleteRecipeDialog } from "./delete-recipe-dialog";

const NOTICE_DURATION_MS = 2500;

interface RecipeCardMenuProps {
  recipe: RecipeListItem;
  onDeleted: (recipeId: string) => void;
}

export function RecipeCardMenu({ recipe, onDeleted }: RecipeCardMenuProps) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), NOTICE_DURATION_MS);
    return () => clearTimeout(timer);
  }, [notice]);

  async function handleShare() {
    try {
      const full = await recipesApi.getRecipe(recipe.id);
      if ((await shareRecipe(full)) === "copied") setNotice("Recipe copied to clipboard");
    } catch {
      setNotice("Couldn't share this recipe");
    }
  }

  async function confirmDelete() {
    await recipesApi.deleteRecipe(recipe.id);
    onDeleted(recipe.id);
  }

  return (
    <>
      {notice && (
        <p
          role="status"
          className="absolute left-2 top-2 z-10 rounded-full bg-background/90 px-3 py-1 text-xs shadow-sm"
        >
          {notice}
        </p>
      )}
      <div className="absolute right-2 top-2 z-10">
        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label="Recipe options"
            className="flex size-8 items-center justify-center rounded-full bg-background/80 backdrop-blur-sm outline-none hover:bg-background focus-visible:ring-[3px] focus-visible:ring-ring/50 data-popup-open:bg-background"
          >
            <HugeiconsIcon icon={MoreVerticalIcon} size={16} />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleShare}>
              <HugeiconsIcon icon={Share08Icon} size={16} className="mr-2" />
              Share
            </DropdownMenuItem>
            <DropdownMenuItem variant="destructive" onClick={() => setDeleteOpen(true)}>
              <HugeiconsIcon icon={Delete02Icon} size={16} className="mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <DeleteRecipeDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={recipe.title}
        onConfirm={confirmDelete}
      />
    </>
  );
}