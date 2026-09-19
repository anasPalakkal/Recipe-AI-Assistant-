"use client";

import { useState, type ComponentProps } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { ViewIcon, ViewOffSlashIcon } from "@hugeicons/core-free-icons";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// NOTE: ViewIcon / ViewOffSlashIcon are used here on the assumption they
// ship in the free tier — Hugeicons' own docs example imports them from
// the paid package. Swap the import if your installed free package
// doesn't export these two names.

type PasswordInputProps = Omit<ComponentProps<typeof Input>, "type">;

export function PasswordInput({ className, ...props }: PasswordInputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <Input type={visible ? "text" : "password"} className={cn("pr-9", className)} {...props} />
      <button
        type="button"
        tabIndex={-1}
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Hide password" : "Show password"}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
      >
        <HugeiconsIcon icon={ViewIcon} altIcon={ViewOffSlashIcon} showAlt={visible} size={17} />
      </button>
    </div>
  );
}