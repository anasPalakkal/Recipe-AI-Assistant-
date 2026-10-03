import type { ReactNode } from "react";
import "./globals.css";
import { Figtree, Fraunces } from "next/font/google";
import { cn } from "@/lib/utils";
import { ThemeProvider } from "@/components/theme/theme-provider";

const figtree = Figtree({ subsets: ["latin"], variable: "--font-sans" });
const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-fraunces" });

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      className={cn("font-sans", figtree.variable, fraunces.variable)}
      suppressHydrationWarning
    >
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}