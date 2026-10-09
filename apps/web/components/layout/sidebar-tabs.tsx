"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "cn";
import { useCloseMobileNav } from "@/components/layout/mobile-nav-context";

const TABS = [
  { label: "Chat", href: "/chat", match: (p: string) => p.startsWith("/chat") || p.startsWith("/recipes") },
  { label: "API", href: "/api-keys", match: (p: string) => p.startsWith("/api-keys") },
];

export function SidebarTabs() {
  const pathname = usePathname() ?? "";
  const closeMobileNav = useCloseMobileNav();

  return (
    <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
      {TABS.map((tab) => {
        const active = tab.match(pathname);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            onClick={closeMobileNav}
            className={cn(
              "rounded-md px-3 py-1.5 text-center text-sm font-medium transition-colors",
              active ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}