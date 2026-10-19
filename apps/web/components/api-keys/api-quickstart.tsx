import Link from "next/link";
import { buildCurlExample, DEFAULT_LIMITS } from "@/lib/api-example";

export function ApiQuickstart() {
  return (
    <section className="mt-8 rounded-2xl border bg-card p-5">
      <h2 className="font-serif text-lg font-medium">Quickstart</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Send your key in the Authorization header. Default limits per key: {DEFAULT_LIMITS.perMinute} per
        minute, {DEFAULT_LIMITS.perDay} per day, {DEFAULT_LIMITS.perMonth} per month. Every response reports
        your remaining budget in its headers.
      </p>
      <pre className="mt-3 overflow-x-auto rounded-xl border bg-muted p-4 text-sm leading-relaxed">
        <code className="font-mono">{buildCurlExample()}</code>
      </pre>
      <Link href="/docs" className="mt-3 inline-block text-sm font-medium underline-offset-4 hover:underline">
        Full API reference
      </Link>
    </section>
  );
}