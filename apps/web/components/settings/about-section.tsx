import { APP_NAME } from "@/lib/brand";

export function AboutSection() {
  return (
    <div className="space-y-2 text-sm">
      <h3 className="font-serif text-lg font-semibold">{APP_NAME}</h3>
      <p className="text-muted-foreground">
        Generate, refine and save recipes with AI. Chat in plain language, or send a photo of a
        dish.
      </p>
      <p className="text-muted-foreground">
        Developers can use the public API. Create keys under API keys.
      </p>
    </div>
  );
}