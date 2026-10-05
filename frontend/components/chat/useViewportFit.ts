"use client";

import { useEffect, useState, type RefObject } from "react";

/**
 * Best-effort on-screen-keyboard handling. When the soft keyboard is open, visualViewport shrinks
 * while the layout viewport does not; return a pixel height that fits the visible area so the
 * composer stays on screen. Returns null when the keyboard is closed (use the normal CSS height).
 */
export function useViewportFit(ref: RefObject<HTMLElement | null>, enabled: boolean): number | null {
  const [height, setHeight] = useState<number | null>(null);

  useEffect(() => {
    const vv = typeof window !== "undefined" ? window.visualViewport : null;
    if (!enabled || !vv) {
      setHeight(null);
      return;
    }
    let keyboardWasOpen = false;
    const update = () => {
      const open = window.innerHeight - vv.height > 120;
      if (!open) {
        keyboardWasOpen = false;
        setHeight(null);
        return;
      }
      setHeight(Math.max(240, Math.floor(vv.height - 8)));
      if (!keyboardWasOpen) {
        keyboardWasOpen = true;
        requestAnimationFrame(() => ref.current?.scrollIntoView({ block: "start" }));
      }
    };
    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, [enabled, ref]);

  return height;
}
