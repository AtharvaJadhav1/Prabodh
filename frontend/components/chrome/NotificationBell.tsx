"use client";

import { useEffect, useState } from "react";
import { api, apiPatch } from "../../lib/api";
import type { PortalNotification } from "../../lib/types";
import { useAuth } from "../auth/AuthProvider";

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
        className="relative inline-flex h-9 items-center rounded-full border border-brand-sand bg-white px-3 text-xs font-bold text-brand-deep"
      >
        Alerts
        {unread > 0 ? (
          <span className="ml-1.5 rounded-full bg-brand-primary px-1.5 py-0.5 text-[10px] text-white">{unread}</span>
        ) : null}
      </button>
      {open ? (
        <div className="absolute right-0 z-30 mt-2 w-80 overflow-hidden rounded-xl border border-brand-sand bg-white shadow-lg">
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
