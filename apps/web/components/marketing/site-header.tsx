import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Logo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { getOptionalUser } from "@/lib/session";

const NAV_LINKS = [
  { href: "/#features", label: "Features" },
  { href: "/#workflow", label: "Workflow" },
  { href: "/#developers", label: "API" },
  { href: "/docs", label: "Docs" },
];

export async function SiteHeader() {
  const user = await getOptionalUser();

  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-8 px-6">
        <Logo href="/" />

        <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
          {NAV_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="transition-colors hover:text-foreground">
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
          {user ? (
            <Link href="/chat" className={buttonVariants()}>
              Open app
            </Link>
          ) : (
            <>
              <span className="hidden sm:block">
                <Link href="/login" className={buttonVariants({ variant: "ghost" })}>
                  Log in
                </Link>
              </span>
              <Link href="/signup" className={buttonVariants()}>
                Get started
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}