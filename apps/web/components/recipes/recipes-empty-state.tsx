import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export function RecipesEmptyState() {
  return (
    <div className="rounded-2xl border border-dashed bg-card p-10 text-center">
      <p className="font-serif text-lg font-medium">No saved recipes yet</p>
      <p className="mt-1 text-sm text-muted-foreground">
        Ask for a recipe in chat and save the ones you like.
      </p>
      <Link href="/chat" className={`${buttonVariants()} mt-5`}>
        Start a chat
      </Link>
    </div>
  );
}