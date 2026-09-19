"use client";

import { useCallback, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Script from "next/script";
import { signInWithGoogle } from "@/lib/api/auth";
import { ApiError } from "@/lib/api-errors";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: { client_id: string; callback: (r: { credential: string }) => void }) => void;
          renderButton: (parent: HTMLElement, options: Record<string, unknown>) => void;
        };
      };
    };
  }
}

interface GoogleSignInButtonProps {
  label: "signin_with" | "signup_with";
  onError: (message: string) => void;
}

export function GoogleSignInButton({ label, onError }: GoogleSignInButtonProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPending, setIsPending] = useState(false);
  const router = useRouter();
  const domId = useId();

  const handleCredential = useCallback(
    async (response: { credential: string }) => {
      setIsPending(true);
      try {
        await signInWithGoogle(response.credential);
        router.push("/recipes");
        router.refresh();
      } catch (err) {
        const message = err instanceof ApiError ? err.message : "Google sign-in failed";
        onError(message);
      } finally {
        setIsPending(false);
      }
    },
    [router, onError],
  );

  const initialize = useCallback(() => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!clientId || !window.google || !containerRef.current) return;

    window.google.accounts.id.initialize({ client_id: clientId, callback: handleCredential });
    window.google.accounts.id.renderButton(containerRef.current, {
      type: "standard",
      theme: "outline",
      shape: "pill",
      size: "large",
      width: 320,
      text: label,
    });
  }, [handleCredential, label]);

  return (
    <div aria-busy={isPending}>
      <Script src="https://accounts.google.com/gsi/client" strategy="afterInteractive" onReady={initialize} />
      <div ref={containerRef} id={`google-button-${domId}`} className="flex justify-center" />
    </div>
  );
}