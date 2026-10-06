"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { destinationFor, iconKindFor } from "../../lib/notification-links";
import { groupNotifications, relativeTime } from "../../lib/notification-core";
import { setSoundEnabled, useSoundEnabled } from "../../lib/notification-sound";
import type { PortalNotification } from "../../lib/types";
import { useAuth } from "../auth/AuthProvider";
import { useMediaQuery } from "../chat/useMediaQuery";
import { BellIcon, XIcon } from "../dashboard/icons";
import { requestDesktopPermission, useDesktopPermission } from "./desktop-alerts";
import NotificationActions from "./NotificationActions";
import NotificationIcon from "./NotificationIcon";
import {
  markAllNotificationsRead,
  setNotificationPanelOpen,
  useNotifications,
} from "./notification-store";
import { useNotificationNavigate } from "./useNotificationNavigate";

function useTick(ms: number, active: boolean) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), ms);
    return () => window.clearInterval(id);
  }, [ms, active]);
  return now;
}

function SpeakerIcon({ on, className }: { on: boolean; className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M11 5 6 9H3v6h3l5 4V5z" />
      {on ? (
        <>
          <path d="M15.5 8.5a5 5 0 0 1 0 7" />
          <path d="M18.5 5.5a9 9 0 0 1 0 13" />
        </>
      ) : (
        <>
          <path d="m16 9 5 6" />
          <path d="m21 9-5 6" />
        </>
      )}
    </svg>
  );
}

function Row({
  n,
  now,
  onNavigate,
  canView,
}: {
  n: PortalNotification;
  now: number;
  onNavigate: (n: PortalNotification) => void;
  canView: boolean;
}) {
  const unread = !n.readAt;
  return (
    <li className={`flex gap-3 px-4 py-3 ${unread ? "bg-brand-lightOrange/40" : ""}`}>
      <NotificationIcon kind={iconKindFor(n)} />
      <div className="min-w-0 flex-1">
        <button
          type="button"
          onClick={() => onNavigate(n)}
          className="-m-1 block w-[calc(100%+0.5rem)] rounded-lg p-1 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C25E26]/50"
        >
          <span className="flex items-start justify-between gap-2">
            <span
              className={`min-w-0 break-words text-sm leading-snug ${
                unread ? "font-bold text-brand-deep" : "font-semibold text-brand-charcoal"
              }`}
            >
              {n.title}
            </span>
            <span className="mt-0.5 flex shrink-0 items-center gap-1.5 text-[11px] text-brand-muted">
              {relativeTime(n.createdAt, now)}
              {unread ? <span className="h-2 w-2 rounded-full bg-[#C25E26]" aria-label="Unread" /> : null}
            </span>
          </span>
          {n.body ? (
            <span className="mt-0.5 block break-words text-xs leading-relaxed text-brand-muted">{n.body}</span>
          ) : null}
          {canView ? (
            <span className="mt-1 inline-block text-[11px] font-semibold text-[#C25E26]">View &rarr;</span>
          ) : null}
        </button>
        <NotificationActions n={n} />
      </div>
    </li>
  );
}

function GroupHeader({ children }: { children: ReactNode }) {
  return (
    <li
      role="presentation"
      className="sticky top-0 z-[1] bg-white/95 px-4 py-1.5 text-[10px] font-bold tracking-wider text-brand-muted uppercase backdrop-blur-sm"
    >
      {children}
    </li>
  );
}

export default function NotificationBell() {
  const { session } = useAuth();
  const { items, unreadCount, loaded, panelOpen: open } = useNotifications();
  const phone = useMediaQuery("(max-width: 639px)");
  const soundOn = useSoundEnabled();
  const permission = useDesktopPermission();
  const navigate = useNotificationNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const now = useTick(30_000, open);
  const role = session?.activeRole ?? session?.platformRole ?? null;

  const close = useCallback((restoreFocus = false) => {
    setNotificationPanelOpen(false);
    if (restoreFocus) buttonRef.current?.focus();
  }, []);

  // Close the panel if this bell unmounts (navigating away) so the store never stays "open".
  useEffect(() => () => setNotificationPanelOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (containerRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close(true);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, close]);

  useEffect(() => {
    if (open) panelRef.current?.focus({ preventScroll: true });
  }, [open, phone]);

  const handleToggle = () => {
    setIsAnimating(true);
    window.setTimeout(() => setIsAnimating(false), 500);
    setNotificationPanelOpen(!open);
  };

  const handleNavigate = (n: PortalNotification) => {
    if (navigate(n)) close();
  };

  const { fresh, earlier } = groupNotifications(items);

  const panel = (
    <div
      ref={panelRef}
      role="dialog"
      aria-label="Notifications"
      tabIndex={-1}
      className={
        phone
          ? "absolute inset-x-0 bottom-0 flex max-h-[85dvh] flex-col overflow-hidden rounded-t-2xl bg-white pb-[env(safe-area-inset-bottom)] shadow-2xl outline-none motion-safe:[animation:chat-sheet-up_0.22s_ease-out]"
          : "absolute right-0 z-50 mt-2 flex w-[380px] max-w-[calc(100vw-1.5rem)] origin-top-right flex-col overflow-hidden rounded-2xl border border-brand-softline/80 bg-white shadow-lg outline-none motion-safe:animate-pop-in"
      }
    >
      <div className="flex items-center gap-2 border-b border-brand-softline/60 bg-[#FAF7F2]/60 px-4 py-3">
        <h2 className="min-w-0 flex-1 truncate text-xs font-bold tracking-wider text-brand-deep uppercase">
          Notifications
          {unreadCount > 0 ? (
            <span className="ml-2 rounded-full bg-[#C25E26] px-1.5 py-0.5 text-[10px] font-bold tracking-normal text-white normal-case">
              {unreadCount > 99 ? "99+" : unreadCount} new
            </span>
          ) : null}
        </h2>
        <button
          type="button"
          onClick={() => setSoundEnabled(!soundOn)}
          aria-pressed={soundOn}
          aria-label="Notification sound"
          title={soundOn ? "Sound on" : "Sound off"}
          className={`inline-flex h-8 w-8 items-center justify-center rounded-full border border-brand-softline transition-colors hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C25E26]/50 max-sm:h-11 max-sm:w-11 ${
            soundOn ? "bg-white text-[#C25E26]" : "bg-brand-sand/50 text-brand-muted"
          }`}
        >
          <SpeakerIcon on={soundOn} className="h-4 w-4" />
        </button>
        {unreadCount > 0 ? (
          <button
            type="button"
            onClick={markAllNotificationsRead}
            className="rounded-lg px-2 text-[11px] font-semibold text-[#C25E26] hover:bg-brand-lightOrange focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C25E26]/50 min-h-8 max-sm:min-h-11"
          >
            Mark all as read
          </button>
        ) : null}
        {phone ? (
          <button
            type="button"
            onClick={() => close(true)}
            aria-label="Close notifications"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full text-brand-muted hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C25E26]/50"
          >
            <XIcon className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      {permission === "default" ? (
        <div className="flex items-center gap-3 border-b border-brand-softline/60 bg-white px-4 py-2.5">
          <p className="min-w-0 flex-1 break-words text-[11px] text-brand-muted">
            Get a desktop alert when something new arrives while this tab is in the background.
          </p>
          <button
            type="button"
            onClick={() => void requestDesktopPermission()}
            className="shrink-0 rounded-lg border border-brand-softline bg-white px-3 text-[11px] font-semibold text-brand-deep hover:bg-[#FAF7F2] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C25E26]/50 min-h-8 max-sm:min-h-11"
          >
            Enable desktop alerts
          </button>
        </div>
      ) : null}

      <ul className="max-h-[70vh] min-h-0 flex-1 divide-y divide-brand-softline/40 overflow-x-hidden overflow-y-auto overscroll-contain max-sm:max-h-none">
        {items.length === 0 ? (
          <li className="flex flex-col items-center gap-2 px-6 py-10 text-center">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-brand-sand/50 text-brand-muted">
              <BellIcon className="h-5 w-5" />
            </span>
            <p className="text-sm font-semibold text-brand-deep">{loaded ? "You're all caught up" : "Loading…"}</p>
            {loaded ? <p className="text-xs text-brand-muted">New invites and updates will show up here.</p> : null}
          </li>
        ) : (
          <>
            {fresh.length > 0 ? <GroupHeader>New</GroupHeader> : null}
            {fresh.map((n) => (
              <Row key={n.id} n={n} now={now} onNavigate={handleNavigate} canView={!!destinationFor(n, role)} />
            ))}
            {earlier.length > 0 ? <GroupHeader>Earlier</GroupHeader> : null}
            {earlier.map((n) => (
              <Row key={n.id} n={n} now={now} onNavigate={handleNavigate} canView={!!destinationFor(n, role)} />
            ))}
          </>
        )}
      </ul>
    </div>
  );

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggle}
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
        aria-expanded={open}
        aria-haspopup="dialog"
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-brand-sand bg-white text-brand-deep transition-all duration-200 hover:scale-105 hover:bg-[#FAF7F2] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C25E26]/50 active:scale-95 max-sm:h-11 max-sm:w-11"
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
      {open && phone === false ? panel : null}
      {open && phone === true && typeof document !== "undefined"
        ? createPortal(
            <div className="fixed inset-0 z-[45]">
              <div className="absolute inset-0 bg-black/30" aria-hidden="true" onClick={() => close()} />
              {panel}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
