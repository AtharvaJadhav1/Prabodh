"use client";

import { useSyncExternalStore } from "react";

/**
 * Live `matchMedia` result. Returns null on the server and during hydration (unknown), so callers can
 * render nothing until the real answer is available instead of flashing the wrong layout.
 */
export function useMediaQuery(query: string): boolean | null {
  return useSyncExternalStore(
    (notify) => {
      const mq = window.matchMedia(query);
      mq.addEventListener("change", notify);
      return () => mq.removeEventListener("change", notify);
    },
    () => window.matchMedia(query).matches,
    () => null,
  );
}
