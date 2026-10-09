import Link from "next/link";
import { APP_NAME, CONTACT_EMAIL } from "@/lib/brand";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const FEATURES = [
  "Chat with an AI cook to generate and refine recipes",
  "Send a photo of a dish to identify it and estimate nutrition",
  "Save recipes and share them",
  "Use the public API to generate recipes in your own app",
];

const LINKS = [
  { href: "/docs", label: "API docs" },
  { href: "/privacy", label: "Privacy policy" },
];

interface AboutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AboutDialog({ open, onOpenChange }: AboutDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-serif text-xl">{APP_NAME}</DialogTitle>
          <DialogDescription>An AI recipe assistant.</DialogDescription>
        </DialogHeader>

        <ul className="list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
          {FEATURES.map((feature) => (
            <li key={feature}>{feature}</li>
          ))}
        </ul>

        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-4 hover:text-primary"
            >
              {link.label}
            </Link>
          ))}
        </div>

        <p className="text-sm text-muted-foreground">
          Questions or feedback:{" "}
          <a className="underline underline-offset-4" href={`mailto:${CONTACT_EMAIL}`}>
            {CONTACT_EMAIL}
          </a>
        </p>
      </DialogContent>
    </Dialog>
  );
}