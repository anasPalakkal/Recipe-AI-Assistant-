import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { SectionHeading } from "./section-heading";

const CURL_EXAMPLE = `curl -X POST https://YOUR_API_HOST/v1/recipes/generate \\
  -H "Authorization: Bearer rk_live_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"prompt": "a quick vegetarian pasta dish"}'`;

const RESPONSE_EXAMPLE = `{
  "title": "Garlic Butter Pasta with Cherry Tomatoes",
  "servings": 2,
  "prepTimeMinutes": 10,
  "cookTimeMinutes": 15,
  "ingredients": [
    { "name": "spaghetti", "quantity": 200, "unit": "g" }
  ],
  "steps": [
    { "content": "Bring a large pot of salted water to a boil." }
  ]
}`;

const POINTS = [
  "Per-key rate limits and monthly quotas, reported in headers on every response",
  "Safe retries with an Idempotency-Key header",
  "Up to 3 active keys, so you can rotate without downtime",
  "A dashboard with daily usage for each key",
];

function CodeBlock({ code }: { code: string }) {
  return (
    <pre className="overflow-x-auto rounded-2xl border bg-card p-5 text-sm leading-relaxed">
      <code className="font-mono">{code}</code>
    </pre>
  );
}

export function Developers({ signedIn }: { signedIn: boolean }) {
  return (
    <section id="developers" className="mx-auto max-w-6xl scroll-mt-20 px-6 py-20">
      <SectionHeading
        eyebrow="For developers"
        title="Recipe generation as an API"
        description="One endpoint, simple authentication, and clear limits. Defaults are 20 requests per minute and 300 per month for each key."
      />
      <div className="grid items-start gap-10 lg:grid-cols-2">
        <div>
          <ul className="space-y-3 text-sm">
            {POINTS.map((point) => (
              <li key={point} className="flex gap-3">
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
                <span>{point}</span>
              </li>
            ))}
          </ul>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href={signedIn ? "/api-keys" : "/signup"} className={buttonVariants()}>
              {signedIn ? "Manage API keys" : "Get an API key"}
            </Link>
            <Link href="/docs" className={buttonVariants({ variant: "outline" })}>
              Read the docs
            </Link>
          </div>
        </div>
        <div className="min-w-0 space-y-4">
          <CodeBlock code={CURL_EXAMPLE} />
          <CodeBlock code={RESPONSE_EXAMPLE} />
        </div>
      </div>
    </section>
  );
}