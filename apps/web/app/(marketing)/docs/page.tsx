import type { Metadata } from "next";
import { ApiDocsMarkdown } from "@/components/docs/api-docs-markdown";
import { extractHeadings, readApiDocs } from "@/lib/docs";

export const metadata: Metadata = {
  title: "API documentation",
  description:
    "Authentication, rate limits, quotas, idempotency and error codes for the recipe generation API.",
};

export default async function DocsPage() {
  const markdown = await readApiDocs();
  const headings = extractHeadings(markdown);

  return (
    <div className="mx-auto flex max-w-6xl gap-12 px-6 py-12">
      <article className="min-w-0 max-w-3xl flex-1">
        <ApiDocsMarkdown markdown={markdown} />
      </article>

      <aside className="hidden w-56 shrink-0 lg:block">
        <nav aria-label="On this page" className="sticky top-24">
          <p className="mb-3 text-sm font-medium">On this page</p>
          <ul className="space-y-2 border-l text-sm">
            {headings.map((heading) => (
              <li key={heading.id}>
                <a
                  href={`#${heading.id}`}
                  className="-ml-px block border-l border-transparent pl-4 text-muted-foreground transition-colors hover:border-foreground hover:text-foreground"
                >
                  {heading.title}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </aside>
    </div>
  );
}