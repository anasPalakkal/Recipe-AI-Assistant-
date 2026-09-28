"use client";

import { createContext, useContext } from "react";

const MobileNavContext = createContext<(() => void) | null>(null);

export function MobileNavProvider({ close, children }: { close: () => void; children: React.ReactNode }) {
  return <MobileNavContext.Provider value={close}>{children}</MobileNavContext.Provider>;
}

export function useCloseMobileNav(): () => void {
  const close = useContext(MobileNavContext);
  return close ?? (() => {});
}