import { LoginForm } from "@/components/login-form";
import { redirectIfVerified } from "@/lib/session";

export default async function LoginPage() {
  await redirectIfVerified();
  return <LoginForm />;
}