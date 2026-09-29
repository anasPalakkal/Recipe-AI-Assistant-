"use client";

import { useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Delete02Icon } from "@hugeicons/core-free-icons";
import { deleteRecipeAndRedirect } from "@/lib/actions/recipe-actions";
import { Button } from "@/components/ui/button";
import { DeleteRecipeDialog } from "./delete-recipe-dialog";

interface DeleteRecipeButtonProps {
  recipeId: string;
  title: string;
}

export function DeleteRecipeButton({ recipeId, title }: DeleteRecipeButtonProps) {
  const [open, setOpen] = useState(false);

  async function confirmDelete() {
    const result = await deleteRecipeAndRedirect(recipeId);
    if (result?.error) throw new Error(result.error);
  }

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)} className="gap-1.5">
        <HugeiconsIcon icon={Delete02Icon} size={16} />
        Delete
      </Button>
      <DeleteRecipeDialog
        open={open}
        onOpenChange={setOpen}
        title={title}
        onConfirm={confirmDelete}
      />
    </>
  );
}