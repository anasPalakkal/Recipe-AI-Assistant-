import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { APP_NAME } from "@/lib/brand";
import { MediaFrame } from "./media-frame";

export function Hero({ signedIn }: { signedIn: boolean }) {
  return (
    <section className="mx-auto max-w-6xl px-6 pb-20 pt-16 md:pt-24">
      <div className="mx-auto max-w-3xl text-center">
        <h1 className="font-serif text-4xl font-semibold leading-tight tracking-tight sm:text-5xl md:text-6xl">
          Tell it what you crave. Get a recipe you can cook.
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg text-muted-foreground">
          Chat with {APP_NAME} to generate recipes, adjust them in plain language, identify dishes
          from a photo, and keep your favorites in one place.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href={signedIn ? "/chat" : "/signup"} className={buttonVariants({ size: "lg" })}>
            {signedIn ? "Open app" : "Get started"}
          </Link>
          <Link href="#developers" className={buttonVariants({ variant: "outline", size: "lg" })}>
            View the API
          </Link>
        </div>
      </div>

      <div className="mx-auto mt-14 max-w-4xl">
        <MediaFrame label="Demo video placeholder: typing a prompt and watching the recipe generate" />
      </div>
    </section>
  );
}