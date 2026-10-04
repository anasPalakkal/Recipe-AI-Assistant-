import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface MediaFrameProps {
  label: string;
  aspectClassName?: string;
  children?: ReactNode;
}

export function MediaFrame({ label, aspectClassName = "aspect-video", children }: MediaFrameProps) {
  return (
    <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
      <div className="flex items-center gap-1.5 border-b px-4 py-3">
        <span className="size-2.5 rounded-full bg-muted-foreground/30" />
        <span className="size-2.5 rounded-full bg-muted-foreground/30" />
        <span className="size-2.5 rounded-full bg-muted-foreground/30" />
      </div>
      <div className={cn("relative bg-muted", aspectClassName)}>
        {children ?? (
          <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-muted-foreground">
            {label}
          </div>
        )}
      </div>
    </div>
  );
}