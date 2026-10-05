import { SignupForm } from "@/components/signup-form";
import { redirectIfVerified } from "@/lib/session";

export default async function SignupPage() {
  await redirectIfVerified();
  return <SignupForm />;
}