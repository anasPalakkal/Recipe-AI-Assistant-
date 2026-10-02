"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import { Menu01Icon } from "@hugeicons/core-free-icons";
import type { PublicUser } from "@/lib/api/auth";
import { logout } from "@/lib/api/auth";
import { Button } from "@/components/ui/button";
import { SidebarTabs } from "@/components/layout/sidebar-tabs";
import { MobileNavProvider } from "@/components/layout/mobile-nav-context";
import { getDisplayName } from "@/lib/utils";

interface AppShellProps {
  user: PublicUser | null;
  sidebarContent: React.ReactNode;
  children: React.ReactNode;
}

export function AppShell({ user, sidebarContent, children }: AppShellProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const router = useRouter();

  async function handleLogout() {
    await logout();
    router.push("/login");
  }

  return (
    <MobileNavProvider close={() => setMobileNavOpen(false)}>
      <div className="flex h-dvh w-full overflow-hidden">
        <div
          className={`fixed inset-y-0 left-0 z-40 flex w-72 shrink-0 flex-col border-r bg-sidebar transition-transform md:static md:translate-x-0 ${mobileNavOpen ? "translate-x-0" : "-translate-x-full"
            }`}
        >
          <div className="flex flex-col gap-3 p-3 pb-0">
            <div className="flex items-center gap-2 px-1">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary font-serif text-sm font-bold text-primary-foreground">
                R
              </div>
              <span className="font-serif text-lg font-semibold">RecipeAI</span>
            </div>
            <SidebarTabs />
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-3 pt-3">{sidebarContent}</div>

          {user && (
            <div className="border-t p-3">
              <div className="flex items-center justify-between px-1">
                <span className="truncate text-sm text-muted-foreground">{getDisplayName(user)}</span>
                <Button variant="ghost" size="sm" onClick={handleLogout}>
                  Log out
                </Button>
              </div>
            </div>
          )}
        </div>

        {mobileNavOpen && (
          <button
            type="button"
            aria-label="Close navigation"
            className="fixed inset-0 z-30 bg-black/40 md:hidden"
            onClick={() => setMobileNavOpen(false)}
          />
        )}

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center border-b p-3 md:hidden">
            <Button variant="ghost" size="icon" aria-label="Open navigation" onClick={() => setMobileNavOpen(true)}>
              <HugeiconsIcon icon={Menu01Icon} />
            </Button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
        </div>
      </div>
    </MobileNavProvider>
  );
}