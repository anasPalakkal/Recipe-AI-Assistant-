"use client";

import { useState } from "react";
import type { PublicUser } from "@/lib/api/auth";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ProfileSection } from "./profile-section";
import { AppearanceSection } from "./appearance-section";
import { AboutSection } from "./about-section";

const SECTIONS = [
  { id: "profile", label: "Profile" },
  { id: "appearance", label: "Appearance" },
  { id: "about", label: "About" },
] as const;

type SectionId = (typeof SECTIONS)[number]["id"];

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: PublicUser;
}

export function SettingsDialog({ open, onOpenChange, user }: SettingsDialogProps) {
  const [active, setActive] = useState<SectionId>("profile");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
        </DialogHeader>

        <div role="tablist" aria-label="Settings sections" className="flex gap-1 rounded-full bg-muted p-1">
          {SECTIONS.map((section) => {
            const selected = active === section.id;
            return (
              <button
                key={section.id}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setActive(section.id)}
                className={`flex-1 rounded-full px-3 py-1.5 text-sm outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50 ${
                  selected
                    ? "bg-background font-medium shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {section.label}
              </button>
            );
          })}
        </div>

        <div role="tabpanel" className="min-h-56">
          {active === "profile" && <ProfileSection user={user} />}
          {active === "appearance" && <AppearanceSection />}
          {active === "about" && <AboutSection />}
        </div>
      </DialogContent>
    </Dialog>
  );
}