"use client";

import { useEffect, useState } from "react";
import { api, apiPatch } from "../../lib/api";
import type { PortalNotification } from "../../lib/types";
import { useAuth } from "../auth/AuthProvider";
import { BellIcon } from "../dashboard/icons";

export default function NotificationBell() {
  const { session } = useAuth();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<PortalNotification[]>([]);

  const load = () => {
    if (!session) return;
    void api<PortalNotification[]>("/notifications")
      .then(setItems)
      .catch(() => setItems([]));
  };

  useEffect(() => {
    load();
    const id = window.setInterval(load, 90_000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.userId]);

  const unread = items.filter((n) => !n.readAt).length;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={`Notifications${unread > 0 ? ` (${unread} unread)` : ""}`}
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-brand-sand bg-white text-brand-deep transition-colors hover:bg-brand-lightOrange"
      >
        <BellIcon className="h-5 w-5" />
        {unread > 0 ? (
          <span className="absolute -right-1 -top-1 flex min-h-4 min-w-4 items-center justify-center rounded-full bg-brand-primary px-1 text-[10px] font-bold text-white">
            {unread}
          </span>
        ) : null}
      </button>
      {open ? (
        <div className="absolute right-0 z-30 mt-2 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-brand-sand bg-white shadow-lg sm:w-80">
          <p className="border-b border-brand-sand px-3 py-2 text-xs font-bold text-brand-deep">Notifications</p>
          <ul className="max-h-80 overflow-y-auto">
            {items.length === 0 ? (
              <li className="px-3 py-4 text-xs text-brand-muted">No notifications yet.</li>
            ) : (
              items.slice(0, 12).map((n) => (
                <li key={n.id} className="border-b border-brand-sand/70 px-3 py-2 last:border-0">
                  <button
                    type="button"
                    className="w-full text-left"
                    onClick={() => {
                      if (!n.readAt) void apiPatch(`/notifications/${n.id}/read`, {}).then(load);
                    }}
                  >
                    <p className={`text-xs font-bold ${n.readAt ? "text-brand-muted" : "text-brand-deep"}`}>{n.title}</p>
                    <p className="mt-0.5 text-[11px] text-brand-muted">{n.body}</p>
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
