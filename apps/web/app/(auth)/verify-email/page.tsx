// app/(auth)/verify-email/page.tsx
import { redirect } from "next/navigation";
import { VerifyEmailForm } from "@/components/verify-email-form";
import { requireUser } from "@/lib/session";

export default async function VerifyEmailPage() {
  const user = await requireUser();
  if (user.emailVerified) redirect("/recipes");
  return <VerifyEmailForm email={user.email} />;
}