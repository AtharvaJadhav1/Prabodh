"use client";

import type { ReactNode } from "react";
import type { ChatFriendRequest, ChatPerson } from "../../../lib/chat-types";
import ChatAvatar from "../ChatAvatar";
import { useChatPeople } from "../chat-context";
import { CheckIcon, UserPlusIcon } from "../chat-icons";
import { personMeta } from "../PersonRow";

/** Compact role label shown under a person's name. */
export function AppRoleChip({ label }: { label: string }) {
  return (
    <span className="max-w-[60%] shrink-0 truncate rounded-full bg-chat-brandSoft px-2 py-0.5 text-[10px] font-bold uppercase leading-[14px] tracking-wide text-chat-brandText">
      {label}
    </span>
  );
}

type Tone = "primary" | "outline" | "neutral";

const TONES: Record<Tone, string> = {
  primary: "bg-chat-brandStrong text-white",
  outline: "text-chat-brandText ring-1 ring-inset ring-chat-brand",
  neutral: "bg-chat-field text-chat-muted",
};

/** A 32px pill inside a 44px tap target. */
function Pill({
  tone,
  label,
  ariaLabel,
  icon,
  disabled,
  onClick,
  title,
}: {
  tone: Tone;
  label: string;
  ariaLabel: string;
  icon?: ReactNode;
  disabled: boolean;
  onClick: () => void;
  title?: string;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      aria-busy={disabled || undefined}
      onClick={onClick}
      aria-label={ariaLabel}
      title={title}
      className="group flex h-11 shrink-0 items-center justify-center focus-visible:outline-none disabled:cursor-not-allowed"
    >
      <span
        className={`flex h-8 items-center gap-1 whitespace-nowrap rounded-full px-3.5 text-[13px] font-bold transition-[transform,opacity] duration-150 group-active:scale-95 group-focus-visible:ring-2 group-focus-visible:ring-chat-brand group-disabled:opacity-55 motion-reduce:transition-none motion-reduce:group-active:scale-100 ${TONES[tone]}`}
      >
        {icon}
        {label}
      </span>
    </button>
  );
}

/** State-aware compact action for list rows: Add / Requested / Accept / Message. */
export function AppFriendAction({ person, requestId }: { person: ChatPerson; requestId?: string }) {
  const a = useChatPeople();
  const fs = a.friendshipOf(person);
  const busy = a.isBusy(person.id);
  const name = person.fullName;
  switch (fs.status) {
    case "friends":
      return (
        <Pill
          tone="primary"
          label="Message"
          ariaLabel={`Message ${name}`}
          disabled={busy}
          onClick={() => a.openDm(person)}
        />
      );
    case "outgoing":
      return (
        <Pill
          tone="neutral"
          label="Requested"
          ariaLabel={`Cancel friend request to ${name}`}
          title="Tap to cancel request"
          disabled={busy}
          onClick={() => a.cancel(person, requestId ?? fs.requestId)}
        />
      );
    case "incoming":
      return (
        <Pill
          tone="primary"
          label="Accept"
          ariaLabel={`Accept friend request from ${name}`}
          icon={<CheckIcon className="h-3.5 w-3.5" />}
          disabled={busy}
          onClick={() => a.accept(person, requestId ?? fs.requestId)}
        />
      );
    default:
      return (
        <Pill
          tone="outline"
          label="Add"
          ariaLabel={`Add ${name} as a friend`}
          icon={<UserPlusIcon className="h-3.5 w-3.5" />}
          disabled={busy}
          onClick={() => a.add(person)}
        />
      );
  }
}

function PersonInfo({ person }: { person: ChatPerson }) {
  const a = useChatPeople();
  const meta = personMeta(person);
  return (
    <button
      type="button"
      onClick={() => a.openProfile(person.id)}
      aria-label={`View profile of ${person.fullName}`}
      className="flex min-h-[56px] min-w-0 flex-1 items-center gap-3 text-left focus-visible:outline-none"
    >
      <ChatAvatar app name={person.fullName} src={person.avatarUrl} size={52} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[16px] font-semibold leading-6 text-chat-text">{person.fullName}</span>
        <span className="flex min-w-0 items-center gap-1.5">
          <AppRoleChip label={person.roleLabel} />
          {meta ? <span className="min-w-0 truncate text-[13px] text-chat-muted">{meta}</span> : null}
        </span>
      </span>
    </button>
  );
}

const DIVIDER = "after:absolute after:bottom-0 after:left-[80px] after:right-0 after:h-px after:bg-chat-line";

/** One person in Find people / Friends / Sent. Tapping the left part opens the profile. */
export function AppPersonRow({ person, action }: { person: ChatPerson; action?: ReactNode }) {
  return (
    <li
      className={`relative flex items-center gap-2 px-4 py-1.5 transition-colors duration-150 focus-within:bg-chat-press motion-reduce:transition-none ${DIVIDER}`}
    >
      <PersonInfo person={person} />
      {action ?? <AppFriendAction person={person} />}
    </li>
  );
}

const BIG_BTN =
  "flex h-11 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-full text-[14px] font-bold transition-[transform,opacity] duration-150 active:scale-[0.97] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-chat-brand disabled:cursor-not-allowed disabled:opacity-55 motion-reduce:transition-none motion-reduce:active:scale-100";

/** Incoming friend request with full-size Accept (primary) and Decline (neutral) buttons. */
export function AppRequestRow({ request }: { request: ChatFriendRequest }) {
  const a = useChatPeople();
  const person: ChatPerson = { ...request.person, friendship: { status: "incoming", requestId: request.id } };
  const busy = a.isBusy(person.id);
  return (
    <li className={`relative px-4 pb-3 pt-1.5 ${DIVIDER}`}>
      <div className="flex items-center">
        <PersonInfo person={person} />
      </div>
      <div className="mt-1 flex gap-2 pl-[64px]">
        <button
          type="button"
          disabled={busy}
          onClick={() => a.accept(person, request.id)}
          aria-label={`Accept friend request from ${person.fullName}`}
          className={`${BIG_BTN} bg-chat-brandStrong text-white`}
        >
          <CheckIcon className="h-4 w-4" />
          Accept
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => a.decline(person, request.id)}
          aria-label={`Decline friend request from ${person.fullName}`}
          className={`${BIG_BTN} bg-chat-field text-chat-text`}
        >
          Decline
        </button>
      </div>
    </li>
  );
}

/** Outgoing request row with a Cancel action. */
export function AppSentRow({ request }: { request: ChatFriendRequest }) {
  const a = useChatPeople();
  const person: ChatPerson = { ...request.person, friendship: { status: "outgoing", requestId: request.id } };
  return (
    <AppPersonRow
      person={person}
      action={
        <Pill
          tone="neutral"
          label="Cancel"
          ariaLabel={`Cancel friend request to ${person.fullName}`}
          disabled={a.isBusy(person.id)}
          onClick={() => a.cancel(person, request.id)}
        />
      }
    />
  );
}
