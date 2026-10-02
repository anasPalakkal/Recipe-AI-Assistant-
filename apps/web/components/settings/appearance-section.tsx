"use client";

import { useTheme } from "next-themes";
import { HugeiconsIcon } from "@hugeicons/react";
import { ComputerIcon, Sun01Icon, Moon02Icon } from "@hugeicons/core-free-icons";

const OPTIONS = [
  { value: "system", label: "System", icon: ComputerIcon },
  { value: "light", label: "Light", icon: Sun01Icon },
  { value: "dark", label: "Dark", icon: Moon02Icon },
] as const;

// Rendered only while the dialog is open, which is after hydration, so
// reading the stored theme here cannot cause a hydration mismatch.
export function AppearanceSection() {
  const { theme, setTheme } = useTheme();
  const current = theme ?? "system";

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-medium">Theme</h3>
        <p className="text-sm text-muted-foreground">System follows your device setting.</p>
      </div>

      <div role="radiogroup" aria-label="Theme" className="grid grid-cols-3 gap-2">
        {OPTIONS.map(({ value, label, icon }) => {
          const selected = current === value;
          return (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => setTheme(value)}
              className={`flex flex-col items-center gap-2 rounded-2xl border p-4 text-sm outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50 ${
                selected ? "border-primary bg-accent text-accent-foreground" : "hover:bg-muted"
              }`}
            >
              <HugeiconsIcon icon={icon} size={20} />
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}