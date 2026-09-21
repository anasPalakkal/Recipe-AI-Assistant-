// components/reset-password-form.tsx
"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { CheckmarkCircle02Icon, ResetPasswordIcon } from "@hugeicons/core-free-icons";
import { resetPasswordSchema } from "@recipeai/shared";
import { resetPassword } from "@/lib/api/auth";
import { ApiError } from "@/lib/api-errors";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PasswordInput } from "@/components/auth/password-input";
import { AuthNotice } from "@/components/auth/auth-notice";

export function ResetPasswordForm({ token }: { token: string }) {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLinkExpired, setIsLinkExpired] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDone, setIsDone] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    const parsed = resetPasswordSchema.safeParse({ token, newPassword });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setIsSubmitting(true);
    try {
      await resetPassword(parsed.data);
      setIsDone(true);
    } catch (err) {
      if (err instanceof ApiError && err.code === "PASSWORD_RESET_EXPIRED") {
        setIsLinkExpired(true);
      } else {
        setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isDone) {
    return (
      <AuthNotice
        icon={CheckmarkCircle02Icon}
        title="Password updated"
        description="You've been signed out everywhere. Log in with your new password."
        action={{ href: "/login", label: "Go to log in" }}
      />
    );
  }

  if (isLinkExpired) {
    return <ExpiredLinkNotice />;
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Choose a new password</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="new-password">New password</Label>
            <PasswordInput
              id="new-password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirm password</Label>
            <PasswordInput
              id="confirm-password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Updating..." : "Update password"}
          </Button>
        </form>
        <Link href="/login" className="mt-4 block text-center text-sm text-muted-foreground hover:text-primary">
          Back to log in
        </Link>
      </CardContent>
    </Card>
  );
}

export function ExpiredLinkNotice() {
  return (
    <AuthNotice
      icon={ResetPasswordIcon}
      title="Link expired"
      description="This reset link has expired or was already used."
      action={{ href: "/forgot-password", label: "Request a new link" }}
    />
  );
}