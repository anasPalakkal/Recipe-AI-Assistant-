// app/(auth)/reset-password/page.tsx
import type { Metadata } from "next";
import { ExpiredLinkNotice, ResetPasswordForm } from "@/components/reset-password-form";

// The token is in the query string; keep it out of Referer headers.
export const metadata: Metadata = { referrer: "no-referrer" };

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  return token ? <ResetPasswordForm token={token} /> : <ExpiredLinkNotice />;
}