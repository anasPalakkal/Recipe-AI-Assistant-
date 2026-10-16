import Link from "next/link";
import { APP_NAME } from "@/lib/brand";

export function Logo({ href }: { href?: string }) {
  const content = (
    <>
      <span className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
        <svg viewBox="0 0 64 64" fill="none" aria-hidden="true" className="size-6">
          <path
            fill="currentColor"
            fillRule="evenodd"
            d="M13.62 50.38 C25.28 62.05 46.61 40.73 50.38 13.62 C23.27 17.39 1.95 38.72 13.62 50.38 Z M22.98 43.57 L42.83 23.71 A1.8 1.8 0 0 0 40.29 21.17 L20.43 41.02 A1.8 1.8 0 0 0 22.98 43.57 Z"
          />
        </svg>
      </span>
      <span className="font-serif text-lg font-semibold">{APP_NAME}</span>
    </>
  );

  if (!href) return <div className="flex items-center gap-2">{content}</div>;

  return (
    <Link href={href} className="flex items-center gap-2 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 rounded-md">
      {content}
    </Link>
  );
}