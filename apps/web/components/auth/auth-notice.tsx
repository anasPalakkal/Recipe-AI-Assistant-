// components/auth/auth-notice.tsx
import type { ComponentProps, ReactNode } from "react";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { Card, CardContent } from "@/components/ui/card";

interface AuthNoticeProps {
  icon: ComponentProps<typeof HugeiconsIcon>["icon"];
  title: string;
  description: ReactNode;
  action: { href: string; label: string };
}

export function AuthNotice({ icon, title, description, action }: AuthNoticeProps) {
  return (
    <Card className="w-full max-w-sm">
      <CardContent className="space-y-3 pt-2 text-center">
        <div className="mx-auto flex size-11 items-center justify-center rounded-full bg-accent text-primary">
          <HugeiconsIcon icon={icon} className="size-5" />
        </div>
        <h1 className="text-lg font-medium">{title}</h1>
        <p className="text-sm text-muted-foreground">{description}</p>
        <Link href={action.href} className="block pt-2 text-sm text-muted-foreground hover:text-primary">
          {action.label}
        </Link>
      </CardContent>
    </Card>
  );
}