"use client";

import type { ChatConversation } from "../../../lib/chat-types";
import ChatAvatar from "../ChatAvatar";
import { BackIcon } from "../chat-icons";

type Props = {
  conv: ChatConversation;
  onBack?: () => void;
  onOpenProfile: (userId: string) => void;
};

/** One-line subtitle: role and institute for people, the server subtitle (or "Team chat") for groups. */
function subtitleOf(conv: ChatConversation): string {
  if (conv.type === "group") return conv.subtitle ?? "Team chat";
  const p = conv.person;
  const parts = [p?.roleLabel ?? conv.subtitle, p?.institute].filter((x): x is string => !!x);
  return parts.join(" · ");
}

/** WhatsApp-style conversation header: back arrow, avatar and name/subtitle (tap to open the profile). */
export default function AppThreadHeader({ conv, onBack, onOpenProfile }: Props) {
  const personId = conv.person?.id ?? null;
  const subtitle = subtitleOf(conv);
  const inner = (
    <>
      <ChatAvatar app name={conv.title} src={conv.avatarUrl ?? conv.person?.avatarUrl} group={conv.type === "group"} size={40} />
      <span className="min-w-0 flex-1 text-left">
        <span className="block truncate text-[17px] font-semibold leading-[22px] text-chat-text">{conv.title}</span>
        {subtitle ? <span className="block truncate text-[13px] leading-4 text-chat-muted">{subtitle}</span> : null}
      </span>
    </>
  );

  return (
    <header
      className="relative z-10 flex shrink-0 items-center gap-1 bg-chat-header pr-2 shadow-[0_1px_0_var(--chat-line)]"
      style={{ minHeight: "calc(3.5rem + env(safe-area-inset-top))", paddingTop: "env(safe-area-inset-top)", paddingLeft: "max(0.25rem, env(safe-area-inset-left))" }}
    >
      {onBack ? (
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to chats"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-chat-text transition-colors active:bg-chat-press focus-visible:outline focus-visible:outline-2 focus-visible:outline-chat-brand"
        >
          <BackIcon className="h-6 w-6" />
        </button>
      ) : null}
      {personId ? (
        <button
          type="button"
          onClick={() => onOpenProfile(personId)}
          aria-label={`View ${conv.title}'s profile`}
          className="flex min-h-[48px] min-w-0 flex-1 items-center gap-3 rounded-xl px-1 transition-colors active:bg-chat-press focus-visible:outline focus-visible:outline-2 focus-visible:outline-chat-brand"
        >
          {inner}
        </button>
      ) : (
        <div className="flex min-h-[48px] min-w-0 flex-1 items-center gap-3 px-1">{inner}</div>
      )}
    </header>
  );
}
