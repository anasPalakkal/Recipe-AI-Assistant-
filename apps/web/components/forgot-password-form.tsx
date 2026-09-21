// components/forgot-password-form.tsx
"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { Mail01Icon } from "@hugeicons/core-free-icons";
import { forgotPasswordSchema } from "@recipeai/shared";
import { forgotPassword } from "@/lib/api/auth";
import { ApiError, getRetryAfterSeconds } from "@/lib/api-errors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AuthNotice } from "@/components/auth/auth-notice";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSent, setIsSent] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    const parsed = forgotPasswordSchema.safeParse({ email });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid email");
      return;
    }

    setIsSubmitting(true);
    try {
      await forgotPassword(parsed.data);
      setIsSent(true);
    } catch (err) {
      if (err instanceof ApiError) {
        const seconds = getRetryAfterSeconds(err);
        setError(seconds ? `${err.message} (${seconds}s)` : err.message);
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isSent) {
    return (
      <AuthNotice
        icon={Mail01Icon}
        title="Check your email"
        description="If an account exists for that address, we've sent a link to reset your password."
        action={{ href: "/login", label: "Back to log in" }}
      />
    );
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Reset your password</CardTitle>
        <p className="text-sm text-muted-foreground">
          Enter your account email and we&apos;ll send you a reset link.
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Sending..." : "Send reset link"}
          </Button>
        </form>
        <Link href="/login" className="mt-4 block text-center text-sm text-muted-foreground hover:text-primary">
          Back to log in
        </Link>
      </CardContent>
    </Card>
  );
}