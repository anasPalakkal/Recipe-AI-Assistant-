import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default function RecipeNotFound() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
      <h1 className="font-serif text-2xl font-semibold">Recipe not found</h1>
      <p className="text-sm text-muted-foreground">
        It may have been deleted, or the link is incorrect.
      </p>
      <Link href="/recipes" className={buttonVariants({ variant: "secondary" })}>
        Back to recipes
      </Link>
    </div>
  );
}