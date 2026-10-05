"use client";

import type { ReactNode } from "react";
import type { ChatPerson } from "../../lib/chat-types";
import ChatAvatar from "./ChatAvatar";
import { CheckIcon, CloseIcon } from "./chat-icons";
import { useChatPeople } from "./chat-context";

export function RoleChip({ label }: { label: string }) {
  return (
    <span className="shrink-0 rounded-full bg-brand-lightOrange px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand-deep">
      {label}
    </span>
  );
}

export function personMeta(p: ChatPerson): string {
  return [p.institute, p.department].filter(Boolean).join(" · ");
}

/** State-aware friend button for lists. */
export function FriendAction({ person, requestId }: { person: ChatPerson; requestId?: string }) {
  const a = useChatPeople();
  const fs = a.friendshipOf(person);
  const busy = a.isBusy(person.id);
  const base =
    "inline-flex min-h-[44px] shrink-0 items-center justify-center gap-1 rounded-full px-4 text-xs font-bold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary disabled:cursor-not-allowed disabled:opacity-60";
  if (fs.status === "friends") {
    return (
      <button
        type="button"
        disabled={busy}
        onClick={() => a.openDm(person)}
        className={`${base} bg-brand-primary text-white hover:bg-brand-hover`}
        aria-label={`Message ${person.fullName}`}
      >
        Message
      </button>
    );
  }
  if (fs.status === "outgoing") {
    return (
      <button
        type="button"
        disabled={busy}
        onClick={() => a.cancel(person, requestId ?? fs.requestId)}
        className={`${base} border border-brand-softline bg-white text-brand-muted hover:border-red-200 hover:bg-red-50 hover:text-red-700`}
        aria-label={`Cancel friend request to ${person.fullName}`}
        title="Tap to cancel request"
      >
        Requested
      </button>
    );
  }
  if (fs.status === "incoming") {
    return (
      <span className="flex shrink-0 items-center gap-1.5">
        <button
          type="button"
          disabled={busy}
          onClick={() => a.accept(person, requestId ?? fs.requestId)}
          className={`${base} bg-brand-primary text-white hover:bg-brand-hover`}
          aria-label={`Accept friend request from ${person.fullName}`}
        >
          <CheckIcon className="h-4 w-4" /> Accept
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => a.decline(person, requestId ?? fs.requestId)}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-brand-softline bg-white text-brand-muted hover:bg-red-50 hover:text-red-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-primary disabled:opacity-60"
          aria-label={`Decline friend request from ${person.fullName}`}
        >
          <CloseIcon className="h-4 w-4" />
        </button>
      </span>
    );
  }
  return (
    <button
      type="button"
      disabled={busy}
      onClick={() => a.add(person)}
      className={`${base} border border-brand-primary text-brand-primary hover:bg-brand-lightOrange`}
      aria-label={`Add ${person.fullName} as a friend`}
    >
      Add friend
    </button>
  );
}

type Props = {
  person: ChatPerson;
  action?: ReactNode;
  sub?: ReactNode;
};

export default function PersonRow({ person, action, sub }: Props) {
  const a = useChatPeople();
  const meta = personMeta(person);
  return (
    <div role="listitem" className="flex items-center gap-2 border-b border-brand-softline/60 px-3 py-2 last:border-b-0">
      <button
        type="button"
        onClick={() => a.openProfile(person.id)}
        aria-label={`View profile of ${person.fullName}`}
        className="flex min-h-[56px] min-w-0 flex-1 items-center gap-3 rounded-xl px-1 text-left transition-colors hover:bg-brand-lightOrange/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-primary"
      >
        <ChatAvatar name={person.fullName} src={person.avatarUrl} size={44} />
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="truncate text-sm font-bold text-brand-deep">{person.fullName}</span>
            <RoleChip label={person.roleLabel} />
          </span>
          {meta ? <span className="mt-0.5 block truncate text-xs font-medium text-brand-muted">{meta}</span> : null}
          {sub ? <span className="mt-0.5 block truncate text-xs text-brand-muted">{sub}</span> : null}
        </span>
      </button>
      {action ?? <FriendAction person={person} />}
    </div>
  );
}
