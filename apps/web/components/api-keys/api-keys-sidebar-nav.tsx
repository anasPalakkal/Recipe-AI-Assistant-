"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
// Verify these three icon names exist in your @hugeicons/core-free-icons
// version; swap for equivalents if TS reports them missing.
import { AnalyticsUpIcon, Key01Icon, ChartLineData01Icon } from "@hugeicons/core-free-icons";
import { cn } from "cn";
import { useCloseMobileNav } from "@/components/layout/mobile-nav-context";

const LINKS = [
  { href: "/api-keys", label: "Dashboard", icon: AnalyticsUpIcon, exact: true },
  { href: "/api-keys/keys", label: "API keys", icon: Key01Icon, exact: false },
  { href: "/api-keys/usage", label: "Usage", icon: ChartLineData01Icon, exact: false },
];

export function ApiKeysSidebarNav() {
  const pathname = usePathname() ?? "";
  const closeMobileNav = useCloseMobileNav();

  return (
    <nav className="space-y-0.5">
      {LINKS.map((link) => {
        const active = link.exact ? pathname === link.href : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            onClick={closeMobileNav}
            className={cn(
              "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-sidebar-accent",
              active ? "bg-sidebar-accent font-medium" : "text-sidebar-foreground",
            )}
          >
            <HugeiconsIcon icon={link.icon} size={18} />
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}