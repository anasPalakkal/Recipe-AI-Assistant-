import type { ReactNode } from "react";
import { getCurrentUser } from "@/lib/session";
import { AppShell } from "@/components/layout/app-shell";
import { ApiKeysSidebarNav } from "@/components/api-keys/api-keys-sidebar-nav";

export const dynamic = "force-dynamic";

export default async function ApiKeysLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();

  return (
    <AppShell user={user} sidebarContent={<ApiKeysSidebarNav />}>
      {children}
    </AppShell>
  );
}