"use client";

import { useSyncExternalStore } from "react";
import type { PortalNotification } from "../../lib/types";

/** Browser (OS) notifications. Only works while the site is open: there is no service-worker push. */

export type DesktopPermission = "unsupported" | "default" | "granted" | "denied";

const listeners = new Set<() => void>();

function read(): DesktopPermission {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  try {
    return window.Notification.permission;
  } catch {
    return "unsupported";
  }
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

export function useDesktopPermission(): DesktopPermission {
  return useSyncExternalStore(subscribe, read, () => "unsupported");
}

/** Must be called from a user click. Never throws. */
export async function requestDesktopPermission(): Promise<DesktopPermission> {
  if (read() !== "default") return read();
  try {
    await window.Notification.requestPermission();
  } catch {
    /* older Safari callback-only API or blocked: fall through to the re-read */
  }
  listeners.forEach((l) => l());
  return read();
}

/** Show a native notification for a new item when the tab is in the background. */
export function showDesktopNotification(n: PortalNotification, onClick: () => void): void {
  if (typeof document === "undefined") return;
  if (read() !== "granted") return;
  const background = document.visibilityState === "hidden" || !document.hasFocus();
  if (!background) return;
  try {
    const note = new window.Notification(n.title, {
      body: n.body,
      tag: n.id,
      icon: "/icons/pwa/icon-192.png",
    });
    note.onclick = () => {
      try {
        window.focus();
      } catch {
        /* ignore */
      }
      onClick();
      note.close();
    };
  } catch {
    /* some mobile browsers only allow notifications from a service worker */
  }
}
