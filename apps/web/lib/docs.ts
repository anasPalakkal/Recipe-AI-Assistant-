import { readFile } from "node:fs/promises";
import path from "node:path";

const API_DOCS_PATH = path.join(process.cwd(), "..", "..", "docs", "api.md");

export interface DocHeading {
  id: string;
  title: string;
}

export function readApiDocs(): Promise<string> {
  return readFile(API_DOCS_PATH, "utf-8");
}

// Mirrors the slug rule rehype-slug applies to heading ids. Fine for plain
// section titles; headings inside code fences are skipped.
function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-");
}

export function extractHeadings(markdown: string): DocHeading[] {
  const headings: DocHeading[] = [];
  let inFence = false;

  for (const line of markdown.split(/\r?\n/)) {
    if (line.startsWith("```")) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;

    const rawTitle = /^## (.+)$/.exec(line)?.[1];
    if (rawTitle) {
      const title = rawTitle.replace(/`/g, "").trim();
      headings.push({ id: slugify(title), title });
    }
  }
  return headings;
}