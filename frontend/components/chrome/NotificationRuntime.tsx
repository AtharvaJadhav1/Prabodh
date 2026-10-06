"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { chatUnreadIncreased, titlePrefix } from "../../lib/notification-core";
import { installAudioUnlock, playNotificationSound } from "../../lib/notification-sound";
import type { PlatformRole } from "../../lib/session";
import { useAuth } from "../auth/AuthProvider";
import { useChatUnread } from "../chat/chatUnreadStore";
import { showDesktopNotification } from "./desktop-alerts";
import NotificationToasts from "./NotificationToasts";
import {
  setNotificationPanelOpen,
  subscribeNotificationArrivals,
  useNotificationPolling,
  useNotifications,
} from "./notification-store";

const CHAT_ROLES: readonly PlatformRole[] = ["student", "institute_mentor", "industry_mentor", "student_expert"];
const CHAT_PATHS = ["/dashboard/student/discussion", "/dashboard/mentor/queries"];
const TITLE_PREFIX_RE = /^\((?:\d+|99\+)\)\s/;

/** Message pop for incoming chat messages (unread total went up) unless the chat is open and focused. */
function useChatMessageSound(enabled: boolean) {
  const unread = useChatUnread(enabled);
  const pathname = usePathname();
  const prev = useRef<{ total: number; ok: boolean } | null>(null);

  useEffect(() => {
    if (!enabled) {
      prev.current = null;
      return;
    }
    const next = { total: unread.total, ok: unread.ok };
    if (chatUnreadIncreased(prev.current, next)) {
      const viewingChat =
        CHAT_PATHS.some((p) => pathname.startsWith(p)) &&
        document.visibilityState === "visible" &&
        document.hasFocus();
      if (!viewingChat) playNotificationSound("message");
    }
    prev.current = next;
  }, [enabled, unread.total, unread.ok, pathname]);

  return unread.total;
}

/** "(3) Title" while anything is unread. Keeps whatever title the page sets and restores it afterwards. */
function useTitleBadge(active: boolean, unread: number) {
  useEffect(() => {
    if (!active) return;
    let base = document.title.replace(TITLE_PREFIX_RE, "");
    let applied = document.title;
    const apply = () => {
      const want = `${titlePrefix(unread)}${base}`;
      if (document.title !== want) document.title = want;
      applied = want;
    };
    const observer = new MutationObserver(() => {
      if (document.title === applied) return;
      base = document.title.replace(TITLE_PREFIX_RE, "");
      apply();
    });
    observer.observe(document.head, { childList: true, subtree: true, characterData: true });
    apply();
    return () => {
      observer.disconnect();
      document.title = base;
    };
  }, [active, unread]);
}

/**
 * Mounted ONCE (AuthProviders) for the whole signed-in dashboard: owns the notification poll, plays the
 * chime, raises OS notifications, keeps the tab title badge and hosts the toasts.
 */
export default function NotificationRuntime() {
  const { session } = useAuth();
  const pathname = usePathname();
  const userId = session?.userId ?? null;
  const active = !!userId && !session?.mustChangePassword && pathname.startsWith("/dashboard");
  const role = session?.activeRole ?? session?.platformRole ?? null;
  const chatEnabled = active && !!role && CHAT_ROLES.includes(role);

  useNotificationPolling(active ? userId : null);
  const chatTotal = useChatMessageSound(chatEnabled);
  const { unreadCount } = useNotifications();
  useTitleBadge(active, unreadCount + (chatEnabled ? chatTotal : 0));

  useEffect(() => {
    if (!active) return;
    installAudioUnlock();
    return subscribeNotificationArrivals((arrived) => {
      playNotificationSound("notification");
      arrived.slice(0, 3).forEach((n) => showDesktopNotification(n, () => setNotificationPanelOpen(true)));
    });
  }, [active]);

  return active ? <NotificationToasts /> : null;
}
