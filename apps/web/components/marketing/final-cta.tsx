import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export function FinalCta({ signedIn }: { signedIn: boolean }) {
  return (
    <section className="mx-auto max-w-6xl px-6 pb-24">
      <div className="rounded-3xl border bg-card px-6 py-14 text-center">
        <h2 className="font-serif text-3xl font-semibold tracking-tight sm:text-4xl">
          Ready to cook something new?
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
          Start a chat, describe what you want, and have a recipe in front of you.
        </p>
        <Link
          href={signedIn ? "/chat" : "/signup"}
          className={`${buttonVariants({ size: "lg" })} mt-8`}
        >
          {signedIn ? "Open app" : "Get started"}
        </Link>
      </div>
    </section>
  );
}