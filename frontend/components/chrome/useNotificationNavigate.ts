"use client";

import { useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import { destinationFor } from "../../lib/notification-links";
import type { PortalNotification } from "../../lib/types";
import { useAuth } from "../auth/AuthProvider";
import { markNotificationRead } from "./notification-store";

export const OPEN_FRIENDS_EVENT = "prabodh:open-friends";

/**
 * Returns a handler that marks a notification read and navigates to its destination.
 * Resolves to true when it navigated, false when the item is informational (nowhere to go).
 */
export function useNotificationNavigate() {
  const router = useRouter();
  const pathname = usePathname();
  const { session } = useAuth();
  const role = session?.activeRole ?? session?.platformRole ?? null;

  return useCallback(
    (n: PortalNotification): boolean => {
      markNotificationRead(n.id);
      const dest = destinationFor(n, role);
      if (!dest) return false;
      const [path] = dest.href.split("?");
      if (path === pathname) {
        if (dest.openFriends) window.dispatchEvent(new Event(OPEN_FRIENDS_EVENT));
        return true;
      }
      router.push(dest.href);
      return true;
    },
    [pathname, role, router],
  );
}
