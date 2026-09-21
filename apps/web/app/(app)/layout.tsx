// app/(app)/layout.tsx
import type { ReactNode } from "react";
import { requireVerifiedUser } from "@/lib/session";

export default async function AppLayout({ children }: { children: ReactNode }) {
  await requireVerifiedUser();
  return children;
}