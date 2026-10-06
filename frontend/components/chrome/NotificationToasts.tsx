"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { relativeTime } from "../../lib/notification-core";
import { iconKindFor } from "../../lib/notification-links";
import type { PortalNotification } from "../../lib/types";
import { XIcon } from "../dashboard/icons";
import NotificationActions from "./NotificationActions";
import NotificationIcon from "./NotificationIcon";
import {
  setNotificationPanelOpen,
  subscribeNotificationArrivals,
  useNotifications,
} from "./notification-store";
import { useNotificationNavigate } from "./useNotificationNavigate";

const MAX_VISIBLE = 3;
const MAX_QUEUED = 20;
const PLAIN_MS = 8_000;
const ACTION_MS = 15_000;
const SETTLED_MS = 2_500;

function ToastCard({
  n,
  onDismiss,
  onOpen,
}: {
  n: PortalNotification;
  onDismiss: (id: string) => void;
  onOpen: (n: PortalNotification) => void;
}) {
  const actionable = n.actionKind != null && n.actionState === "pending";
  const remaining = useRef(actionable ? ACTION_MS : PLAIN_MS);
  const startedAt = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holds = useRef(0);
  const dismissRef = useRef(onDismiss);
  dismissRef.current = onDismiss;
  const id = n.id;

  const stop = useCallback(() => {
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = null;
  }, []);

  const start = useCallback(() => {
    stop();
    startedAt.current = Date.now();
    timer.current = setTimeout(() => dismissRef.current(id), Math.max(800, remaining.current));
  }, [id, stop]);

  const hold = useCallback(() => {
    holds.current += 1;
    if (holds.current === 1 && timer.current !== null) {
      remaining.current -= Date.now() - startedAt.current;
      stop();
    }
  }, [stop]);

  const release = useCallback(() => {
    holds.current = Math.max(0, holds.current - 1);
    if (holds.current === 0) start();
  }, [start]);

  useEffect(() => {
    start();
    return stop;
  }, [start, stop]);

  const settled = useCallback(() => {
    remaining.current = SETTLED_MS;
    if (holds.current === 0) start();
  }, [start]);

  return (
    <div
      onMouseEnter={hold}
      onMouseLeave={release}
      onFocus={hold}
      onBlur={release}
      onTouchStart={hold}
      onTouchEnd={() => window.setTimeout(release, 1_200)}
      onTouchCancel={release}
      className="pointer-events-auto relative overflow-hidden rounded-2xl border border-brand-softline/80 bg-white p-3 pr-10 shadow-lg motion-safe:animate-pop-in"
    >
      <div className="flex gap-3">
        <NotificationIcon kind={iconKindFor(n)} />
        <div className="min-w-0 flex-1">
          <button
            type="button"
            onClick={() => onOpen(n)}
            className="-m-1 block w-[calc(100%+0.5rem)] rounded-lg p-1 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C25E26]/50"
          >
            <span className="flex items-baseline justify-between gap-2">
              <span className="line-clamp-2 min-w-0 break-words text-sm leading-snug font-bold text-brand-deep">
                {n.title}
              </span>
              <span className="shrink-0 text-[11px] text-brand-muted">{relativeTime(n.createdAt)}</span>
            </span>
            {n.body ? (
              <span className="mt-0.5 line-clamp-2 block break-words text-xs leading-relaxed text-brand-muted">
                {n.body}
              </span>
            ) : null}
          </button>
          <NotificationActions n={n} onSettled={settled} />
        </div>
      </div>
      <button
        type="button"
        onClick={() => onDismiss(n.id)}
        aria-label="Dismiss notification"
        className="absolute top-1 right-1 inline-flex h-8 w-8 items-center justify-center rounded-full text-brand-muted hover:bg-brand-sand/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C25E26]/50 max-sm:h-11 max-sm:w-11"
      >
        <XIcon className="h-4 w-4" />
      </button>
    </div>
  );
}

/** WhatsApp-style heads-up popups for newly arrived notifications. One instance per dashboard (NotificationRuntime). */
export default function NotificationToasts() {
  const [toasts, setToasts] = useState<PortalNotification[]>([]);
  const { items, panelOpen } = useNotifications();
  const navigate = useNotificationNavigate();

  useEffect(
    () =>
      subscribeNotificationArrivals((arrived) => {
        setToasts((prev) => {
          const known = new Set(prev.map((t) => t.id));
          return [...arrived.filter((a) => !known.has(a.id)), ...prev].slice(0, MAX_QUEUED);
        });
      }),
    [],
  );

  // The panel already lists everything, so popups would only duplicate it.
  useEffect(() => {
    if (panelOpen) setToasts([]);
  }, [panelOpen]);

  const dismiss = useCallback((id: string) => setToasts((prev) => prev.filter((t) => t.id !== id)), []);

  const open = useCallback(
    (n: PortalNotification) => {
      dismiss(n.id);
      if (!navigate(n)) setNotificationPanelOpen(true);
    },
    [dismiss, navigate],
  );

  const visible = toasts.slice(0, MAX_VISIBLE);
  const extra = toasts.length - visible.length;

  return (
    <div
      aria-live="polite"
      aria-relevant="additions"
      className="pointer-events-none fixed top-[4.5rem] right-4 z-40 flex w-[min(380px,calc(100vw-2rem))] flex-col gap-2 max-sm:inset-x-0 max-sm:top-[max(0.5rem,env(safe-area-inset-top))] max-sm:right-0 max-sm:w-auto max-sm:px-3"
    >
      {visible.map((t) => (
        <ToastCard key={t.id} n={items.find((i) => i.id === t.id) ?? t} onDismiss={dismiss} onOpen={open} />
      ))}
      {extra > 0 ? (
        <button
          type="button"
          onClick={() => {
            setToasts([]);
            setNotificationPanelOpen(true);
          }}
          className="pointer-events-auto self-end rounded-full border border-brand-softline bg-white px-3 text-xs font-semibold text-brand-deep shadow-md hover:bg-[#FAF7F2] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C25E26]/50 min-h-8 max-sm:min-h-11"
        >
          +{extra} more
        </button>
      ) : null}
    </div>
  );
}
