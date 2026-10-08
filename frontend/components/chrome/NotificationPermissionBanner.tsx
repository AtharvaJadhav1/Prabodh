"use client";

import { useNotificationPermission } from "./useNotificationPermission";

function BellGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M6 9a6 6 0 0112 0c0 5 2 6.5 2 6.5H4S6 14 6 9z" />
      <path d="M10 19a2 2 0 004 0" />
    </svg>
  );
}

/**
 * WhatsApp-Web-style prompt at the top of the chat list. Requests permission only when "Allow" is clicked,
 * and disappears for good after dismissal, a granted/denied answer, or when the browser has no Notification API.
 */
export default function NotificationPermissionBanner({ app = false }: { app?: boolean }) {
  const { showPrompt, request, dismissPrompt } = useNotificationPermission();
  if (!showPrompt) return null;
  return (
    <div
      role="region"
      aria-label="Notifications"
      className={
        app
          ? "flex shrink-0 items-center gap-2 border-b border-chat-line bg-chat-brandSoft py-1 pl-4 pr-1"
          : "flex shrink-0 items-center gap-2 border-b border-brand-softline/60 bg-brand-lightOrange py-1.5 pl-3 pr-1"
      }
    >
      <BellGlyph className={"h-5 w-5 shrink-0 " + (app ? "text-chat-brandText" : "text-brand-primary")} />
      <p className={"min-w-0 flex-1 break-words text-[13px] leading-snug " + (app ? "text-chat-text" : "text-brand-deep")}>
        Get notified of new messages.{" "}
        <button
          type="button"
          onClick={() => void request()}
          className={
            "inline-flex min-h-[44px] items-center font-bold underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-0 " +
            (app ? "text-chat-brandText focus-visible:outline-chat-brand" : "text-brand-primary focus-visible:outline-brand-primary")
          }
        >
          Allow notifications
        </button>
      </p>
      <button
        type="button"
        onClick={dismissPrompt}
        aria-label="Dismiss notification prompt"
        className={
          "flex h-11 w-11 shrink-0 items-center justify-center rounded-full focus-visible:outline focus-visible:outline-2 " +
          (app
            ? "text-chat-muted active:bg-chat-press focus-visible:outline-chat-brand"
            : "text-brand-muted hover:bg-white focus-visible:outline-brand-primary")
        }
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-4 w-4" aria-hidden="true">
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>
    </div>
  );
}
