// app/(app)/layout.tsx
import type { ReactNode } from "react";
import { requireVerifiedUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: ReactNode }) {
  await requireVerifiedUser();
  return children;
}