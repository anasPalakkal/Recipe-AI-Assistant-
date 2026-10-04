import type { ReactNode } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { SentIcon, Image01Icon, Book02Icon } from "@hugeicons/core-free-icons";
import { SectionHeading } from "./section-heading";

interface Feature {
  icon: ReactNode;
  title: string;
  body: string;
}

const FEATURES: Feature[] = [
  {
    icon: <HugeiconsIcon icon={SentIcon} size={20} />,
    title: "Recipes by conversation",
    body: "Describe a dish or a craving, then keep chatting: make it vegetarian, cut the time, change the servings. Every reply is a complete, updated recipe.",
  },
  {
    icon: <HugeiconsIcon icon={Image01Icon} size={20} />,
    title: "Photo analysis",
    body: "Send a photo of a dish to learn what it is, what is likely in it, and a rough nutrition estimate, or ask how to make it. Daily limits apply.",
  },
  {
    icon: <HugeiconsIcon icon={Book02Icon} size={20} />,
    title: "Your recipe library",
    body: "Save the ones you like with their photos, ingredients and numbered steps. Share any recipe as text whenever you want.",
  },
  {
    icon: <span className="font-mono text-sm font-semibold">{"</>"}</span>,
    title: "A public API",
    body: "Generate recipes from your own apps with API keys, per-key rate limits and monthly quotas, and a dashboard that shows your usage.",
  },
];

export function Features() {
  return (
    <section id="features" className="mx-auto max-w-6xl scroll-mt-20 px-6 py-20">
      <SectionHeading
        eyebrow="Features"
        title="Everything between the craving and the kitchen"
      />
      <div className="grid gap-5 sm:grid-cols-2">
        {FEATURES.map((feature) => (
          <div key={feature.title} className="rounded-2xl border bg-card p-6">
            <div className="mb-4 flex size-10 items-center justify-center rounded-xl bg-accent text-accent-foreground">
              {feature.icon}
            </div>
            <h3 className="font-serif text-xl font-semibold">{feature.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{feature.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}