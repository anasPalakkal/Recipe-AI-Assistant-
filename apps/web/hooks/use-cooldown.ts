// hooks/use-cooldown.ts
import { useCallback, useEffect, useState } from "react";

export function useCooldown() {
  const [secondsLeft, setSecondsLeft] = useState(0);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft]);

  const start = useCallback((seconds: number) => setSecondsLeft(seconds), []);

  return { secondsLeft, start };
}