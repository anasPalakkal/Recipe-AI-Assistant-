import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";

const components: Components = {
  h1: ({ children }) => (
    <h1 className="font-serif text-4xl font-semibold tracking-tight">{children}</h1>
  ),
  h2: ({ id, children }) => (
    <h2 id={id} className="mt-14 scroll-mt-24 border-b pb-2 font-serif text-2xl font-semibold">
      {children}
    </h2>
  ),
  h3: ({ id, children }) => (
    <h3 id={id} className="mt-8 scroll-mt-24 font-serif text-xl font-semibold">
      {children}
    </h3>
  ),
  p: ({ children }) => <p className="my-4 leading-relaxed">{children}</p>,
  a: ({ href, children }) => {
    const external = href?.startsWith("http");
    return (
      <a
        href={href}
        className="text-primary underline underline-offset-4"
        {...(external && { target: "_blank", rel: "noreferrer" })}
      >
        {children}
      </a>
    );
  },
  ul: ({ children }) => <ul className="my-4 list-disc space-y-1.5 pl-6">{children}</ul>,
  ol: ({ children }) => <ol className="my-4 list-decimal space-y-1.5 pl-6">{children}</ol>,
  hr: () => <hr className="my-10" />,
  blockquote: ({ children }) => (
    <blockquote className="my-4 border-l-2 border-primary pl-4 text-muted-foreground">
      {children}
    </blockquote>
  ),
  code: ({ children }) => (
    <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.85em]">{children}</code>
  ),
  pre: ({ children }) => (
    <pre className="my-5 overflow-x-auto rounded-2xl border bg-card p-5 text-sm leading-relaxed [&>code]:rounded-none [&>code]:bg-transparent [&>code]:p-0 [&>code]:text-[1em]">
      {children}
    </pre>
  ),
  table: ({ children }) => (
    <div className="my-5 overflow-x-auto rounded-xl border">
      <table className="w-full text-left text-sm">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-muted/50">{children}</thead>,
  th: ({ children }) => <th className="px-4 py-2.5 font-medium">{children}</th>,
  td: ({ children }) => <td className="border-t px-4 py-2.5 align-top">{children}</td>,
};

export function ApiDocsMarkdown({ markdown }: { markdown: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeSlug]}
      components={components}
    >
      {markdown}
    </ReactMarkdown>
  );
}