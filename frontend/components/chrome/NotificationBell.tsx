"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api, apiPatch } from "../../lib/api";
import type { PortalNotification } from "../../lib/types";
import { useAuth } from "../auth/AuthProvider";
import { BellIcon } from "../dashboard/icons";

export default function NotificationBell() {
  const { session } = useAuth();
  const containerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<PortalNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  const load = useCallback(() => {
    if (!session) return;
    void api<PortalNotification[]>("/notifications")
      .then((data) => {
        setItems(data);
        setUnreadCount(data.filter((n) => !n.readAt).length);
      })
      .catch(() => setItems([]));
  }, [session]);

  useEffect(() => {
    load();
    const id = window.setInterval(load, 90_000);
    return () => window.clearInterval(id);
  }, [load]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };

    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const markAllRead = useCallback(() => {
    const unreadIds = items.filter((n) => !n.readAt).map((n) => n.id);
    if (!unreadIds.length) return;
    void Promise.all(
      unreadIds.map((id) => apiPatch(`/notifications/${id}/read`, {}).catch(() => undefined)),
    );
  }, [items]);

  const handleToggle = () => {
    setIsAnimating(true);
    window.setTimeout(() => setIsAnimating(false), 500);
    if (!open && unreadCount > 0) {
      setUnreadCount(0);
      setItems((prev) =>
        prev.map((n) => (n.readAt ? n : { ...n, readAt: new Date().toISOString() })),
      );
      markAllRead();
    }
    setOpen((v) => !v);
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={handleToggle}
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
        aria-expanded={open}
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-brand-sand bg-white text-brand-deep transition-all duration-200 hover:scale-105 hover:bg-[#FAF7F2] active:scale-95"
      >
        <BellIcon
          className={`h-5 w-5 text-[#C25E26] transition-transform duration-500 ease-out ${
            isAnimating ? "rotate-[360deg] scale-110" : "hover:animate-bell-ring"
          }`}
        />
        {unreadCount > 0 ? (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 animate-scale-in items-center justify-center rounded-full bg-[#C25E26] px-1 text-[10px] font-bold text-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        ) : null}
      </button>
      {open ? (
        <div className="absolute right-0 z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] animate-pop-in origin-top-right overflow-hidden rounded-2xl border border-brand-softline/80 bg-white shadow-sm sm:w-96">
          <div className="flex items-center justify-between border-b border-brand-softline/60 bg-[#FAF7F2]/50 px-4 py-3">
            <span className="text-xs font-bold tracking-wider text-brand-deep uppercase">
              Notifications
            </span>
            {items.length > 0 ? (
              <span className="text-[11px] font-medium text-brand-muted">Recent</span>
            ) : null}
          </div>
          <ul className="max-h-80 divide-y divide-brand-softline/50 overflow-y-auto">
            {items.length === 0 ? (
              <li className="px-4 py-4 text-xs text-brand-muted">No notifications yet.</li>
            ) : (
              items.slice(0, 12).map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    className="w-full px-4 py-2 text-left transition-colors hover:bg-[#FAF7F2]"
                    onClick={() => {
                      if (!n.readAt) {
                        const now = new Date().toISOString();
                        setItems((prev) => prev.map((p) => (p.id === n.id ? { ...p, readAt: now } : p)));
                        setUnreadCount((c) => Math.max(0, c - 1));
                        void apiPatch(`/notifications/${n.id}/read`, {}).then(load);
                      }
                    }}
                  >
                    <p className={`text-xs font-bold ${n.readAt ? "text-brand-muted" : "text-brand-deep"}`}>
                      {n.title}
                    </p>
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