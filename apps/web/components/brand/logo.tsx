import Link from "next/link";
import { APP_NAME } from "@/lib/brand";

export function Logo({ href }: { href?: string }) {
  const content = (
    <>
      <span className="flex size-8 items-center justify-center rounded-md bg-primary font-serif text-sm font-bold text-primary-foreground">
        {APP_NAME.charAt(0)}
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