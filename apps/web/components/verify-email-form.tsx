// components/verify-email-form.tsx
"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { REGEXP_ONLY_DIGITS } from "input-otp";
import { verifyEmailSchema } from "@recipeai/shared";
import { logout, resendVerification, verifyEmail } from "@/lib/api/auth";
import { ApiError, getRetryAfterSeconds } from "@/lib/api-errors";
import { useCooldown } from "@/hooks/use-cooldown";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

// Mirrors COOLDOWN_TTL_SECONDS in apps/api otp.service.ts
const RESEND_COOLDOWN_SECONDS = 60;
const CODE_LENGTH = 6;

function describeVerifyError(err: ApiError): string {
  const remaining = err.details?.remainingAttempts;
  if (err.code === "EMAIL_VERIFICATION_INVALID_CODE" && typeof remaining === "number") {
    return `${err.message}. ${remaining} ${remaining === 1 ? "attempt" : "attempts"} left.`;
  }

  const retryAfter = getRetryAfterSeconds(err);
  if (err.code === "VERIFICATION_TEMPORARILY_LOCKED" && retryAfter) {
    return `${err.message}. Try again in ${Math.ceil(retryAfter / 60)} min.`;
  }

  return err.message;
}

export function VerifyEmailForm({ email }: { email: string }) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const { secondsLeft, start: startCooldown } = useCooldown();

  async function handleVerify(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setNotice(null);

    const parsed = verifyEmailSchema.safeParse({ code });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid code");
      return;
    }

    setIsVerifying(true);
    try {
      await verifyEmail(parsed.data);
      router.push("/recipes");
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? describeVerifyError(err) : "Verification failed");
      setCode("");
    } finally {
      setIsVerifying(false);
    }
  }

  async function handleResend() {
    setError(null);
    setNotice(null);
    setIsResending(true);
    try {
      await resendVerification();
      setCode("");
      setNotice("A new code is on its way.");
      startCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (err) {
      if (err instanceof ApiError) {
        const retryAfter = getRetryAfterSeconds(err);
        if (retryAfter) startCooldown(retryAfter);
        setError(err.message);
      } else {
        setError("Could not resend the code. Please try again.");
      }
    } finally {
      setIsResending(false);
    }
  }

  async function handleLogout() {
    await logout().catch(() => undefined);
    router.push("/login");
    router.refresh();
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Verify your email</CardTitle>
        <p className="text-sm text-muted-foreground">
          Enter the {CODE_LENGTH}-digit code sent to{" "}
          <span className="font-medium text-foreground">{email}</span>.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleVerify} className="space-y-4">
          <div className="flex justify-center">
            <InputOTP
              maxLength={CODE_LENGTH}
              pattern={REGEXP_ONLY_DIGITS}
              value={code}
              onChange={setCode}
              disabled={isVerifying}
              autoFocus
            >
              <InputOTPGroup>
                {Array.from({ length: CODE_LENGTH }, (_, index) => (
                  <InputOTPSlot key={index} index={index} className="size-10 text-lg sm:size-11" />
                ))}
              </InputOTPGroup>
            </InputOTP>
          </div>

          {error && <p className="text-center text-sm text-destructive">{error}</p>}
          {notice && <p className="text-center text-sm text-muted-foreground">{notice}</p>}

          <Button type="submit" className="w-full" disabled={isVerifying || code.length < CODE_LENGTH}>
            {isVerifying ? "Verifying..." : "Verify"}
          </Button>
        </form>

        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <button
            type="button"
            onClick={handleResend}
            disabled={isResending || secondsLeft > 0}
            className="font-medium text-primary disabled:text-muted-foreground"
          >
            {secondsLeft > 0 ? `Resend in ${secondsLeft}s` : "Resend code"}
          </button>
          <button type="button" onClick={handleLogout} className="hover:text-foreground">
            Log out
          </button>
        </div>
      </CardContent>
    </Card>
  );
}