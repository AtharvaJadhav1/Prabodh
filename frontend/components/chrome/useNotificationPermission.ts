"use client";

import { useCallback, useSyncExternalStore } from "react";
import { readPromptDismissed, shouldShowNotifPrompt, writePromptDismissed } from "../../lib/notification-prompt";
import { requestDesktopPermission, useDesktopPermission, type DesktopPermission } from "./desktop-alerts";

/**
 * One source of truth for "may we show browser notifications?", shared by the bell panel row and the chat banner.
 * Permission state comes from desktop-alerts (which notifies every subscriber after a request); the banner's
 * dismissal is remembered in localStorage.
 */

const dismissListeners = new Set<() => void>();
let dismissedInMemory = false; // fallback when localStorage is unavailable

function localStore(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

function readDismissed(): boolean {
  return dismissedInMemory || readPromptDismissed(localStore());
}

function subscribeDismissed(l: () => void) {
  dismissListeners.add(l);
  const onStorage = () => l();
  if (typeof window !== "undefined") window.addEventListener("storage", onStorage);
  return () => {
    dismissListeners.delete(l);
    if (typeof window !== "undefined") window.removeEventListener("storage", onStorage);
  };
}

export type NotificationPermissionState = {
  permission: DesktopPermission;
  /** Ask the browser. Call from a click only. */
  request: () => Promise<DesktopPermission>;
  /** True while the "Allow notifications" banner should be visible. */
  showPrompt: boolean;
  /** Close the banner for good. */
  dismissPrompt: () => void;
};

export function useNotificationPermission(): NotificationPermissionState {
  const permission = useDesktopPermission();
  const dismissed = useSyncExternalStore(subscribeDismissed, readDismissed, () => true);
  const dismissPrompt = useCallback(() => {
    if (!writePromptDismissed(localStore())) dismissedInMemory = true;
    dismissListeners.forEach((l) => l());
  }, []);
  return {
    permission,
    request: requestDesktopPermission,
    showPrompt: shouldShowNotifPrompt(permission, dismissed),
    dismissPrompt,
  };
}
