"use client";

import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { formatMemberSince, isSafeHttpUrl } from "../../../lib/chat-format";
import type { ChatPerson, ChatPersonProfile } from "../../../lib/chat-types";
import ChatAvatar from "../ChatAvatar";
import { useChatPeople } from "../chat-context";
import { AlertIcon, CheckIcon, ChatIcon, CloseIcon, ExternalIcon, LinkedinIcon, UserPlusIcon } from "../chat-icons";
import { personMeta } from "../PersonRow";
import { useModalFocus, usePersonDetail } from "../useProfileSheet";
import { AppRoleChip } from "./AppPersonRow";

type Props = {
  userId: string;
  onClose: () => void;
};

const SLIDE_MS = 260;
const CLOSE_DRAG_PX = 110;

const BTN =
  "flex min-h-[48px] min-w-0 flex-1 items-center justify-center gap-2 rounded-full px-5 text-[15px] font-bold transition-[transform,opacity] duration-150 active:scale-[0.97] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-chat-brand disabled:cursor-not-allowed disabled:opacity-55 motion-reduce:transition-none motion-reduce:active:scale-100";
const BTN_PRIMARY = `${BTN} bg-chat-brandStrong text-white`;
const BTN_NEUTRAL = `${BTN} bg-chat-field text-chat-text`;
const BTN_DANGER = `${BTN} bg-chat-dangerSoft text-chat-danger`;

function reducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function Chips({ items, tone }: { items: string[]; tone: "skill" | "domain" }) {
  if (items.length === 0) return null;
  return (
    <ul className="flex flex-wrap gap-2">
      {items.map((s) => (
        <li
          key={s}
          className={`max-w-full truncate rounded-full px-3 py-1 text-[13px] font-semibold ${
            tone === "skill" ? "bg-chat-brandSoft text-chat-brandText" : "bg-chat-field text-chat-text"
          }`}
        >
          {s}
        </li>
      ))}
    </ul>
  );
}

function Heading({ children }: { children: string }) {
  return <h3 className="mb-1.5 text-[12px] font-bold uppercase tracking-wider text-chat-muted">{children}</h3>;
}

function ProfileActions({ person }: { person: ChatPerson }) {
  const a = useChatPeople();
  const [confirm, setConfirm] = useState(false);
  const fs = a.friendshipOf(person);
  const busy = a.isBusy(person.id);

  if (fs.status === "none") {
    return (
      <div className="flex gap-2">
        <button type="button" disabled={busy} onClick={() => a.add(person)} className={BTN_PRIMARY}>
          <UserPlusIcon className="h-5 w-5" /> Add friend
        </button>
      </div>
    );
  }
  if (fs.status === "outgoing") {
    return (
      <div className="flex gap-2">
        <button type="button" disabled={busy} onClick={() => a.cancel(person, fs.requestId)} className={BTN_NEUTRAL}>
          Requested &middot; Cancel
        </button>
      </div>
    );
  }
  if (fs.status === "incoming") {
    return (
      <div className="flex gap-2">
        <button type="button" disabled={busy} onClick={() => a.accept(person, fs.requestId)} className={BTN_PRIMARY}>
          <CheckIcon className="h-5 w-5" /> Accept
        </button>
        <button type="button" disabled={busy} onClick={() => a.decline(person, fs.requestId)} className={BTN_NEUTRAL}>
          Decline
        </button>
      </div>
    );
  }
  if (confirm) {
    return (
      <div role="alertdialog" aria-label="Confirm unfriend" className="rounded-2xl bg-chat-dangerSoft p-3 text-center">
        <p className="text-[14px] font-semibold text-chat-danger [overflow-wrap:anywhere]">Remove {person.fullName} from your friends?</p>
        <div className="mt-3 flex gap-2">
          <button type="button" onClick={() => setConfirm(false)} className={BTN_NEUTRAL}>
            Keep
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              a.unfriend(person);
              setConfirm(false);
            }}
            className={`${BTN} bg-chat-danger text-chat-surface`}
          >
            Unfriend
          </button>
        </div>
      </div>
    );
  }
  return (
    <div className="flex gap-2">
      <button type="button" disabled={busy} onClick={() => a.openDm(person)} className={BTN_PRIMARY}>
        <ChatIcon className="h-5 w-5" /> Message
      </button>
      <button type="button" onClick={() => setConfirm(true)} className={BTN_DANGER}>
        Unfriend
      </button>
    </div>
  );
}

function ProfileBody({ person, profile }: { person: ChatPerson; profile: ChatPersonProfile }) {
  const linkedin = profile.linkedinUrl && isSafeHttpUrl(profile.linkedinUrl) ? profile.linkedinUrl : null;
  const meta = personMeta({
    ...person,
    institute: profile.institute ?? person.institute,
    department: profile.department ?? person.department,
  });
  const hasFacts = !!profile.memberSince || !!profile.sharedTeam;
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col items-center text-center">
        <ChatAvatar app name={person.fullName} src={person.avatarUrl} size={96} />
        <h2 className="mt-3 max-w-full text-[22px] font-extrabold leading-tight text-chat-text [overflow-wrap:anywhere]">{person.fullName}</h2>
        <div className="mt-2">
          <AppRoleChip label={person.roleLabel} />
        </div>
        {meta ? <p className="mt-2 max-w-full text-[14px] font-medium text-chat-muted [overflow-wrap:anywhere]">{meta}</p> : null}
        {profile.headline ? <p className="mt-2 max-w-full text-[15px] font-semibold text-chat-text [overflow-wrap:anywhere]">{profile.headline}</p> : null}
      </div>

      <ProfileActions person={person} />

      {profile.bio ? (
        <section aria-label="About">
          <Heading>About</Heading>
          <p className="whitespace-pre-wrap text-[15px] leading-6 text-chat-text [overflow-wrap:anywhere]">{profile.bio}</p>
        </section>
      ) : null}
      {profile.skills.length > 0 ? (
        <section aria-label="Skills">
          <Heading>Skills</Heading>
          <Chips items={profile.skills} tone="skill" />
        </section>
      ) : null}
      {profile.domainTags.length > 0 ? (
        <section aria-label="Domains">
          <Heading>Domains</Heading>
          <Chips items={profile.domainTags} tone="domain" />
        </section>
      ) : null}

      {hasFacts ? (
        <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2.5 rounded-2xl bg-chat-field p-4 text-[14px]">
          {profile.memberSince ? (
            <>
              <dt className="font-medium text-chat-muted">Member since</dt>
              <dd className="text-right font-semibold text-chat-text">{formatMemberSince(profile.memberSince)}</dd>
            </>
          ) : null}
          {profile.sharedTeam ? (
            <>
              <dt className="font-medium text-chat-muted">Shared team</dt>
              <dd className="truncate text-right font-semibold text-chat-text">{profile.sharedTeam.name}</dd>
            </>
          ) : null}
        </dl>
      ) : null}

      {linkedin ? (
        <a
          href={linkedin}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`${person.fullName} on LinkedIn (opens in a new tab)`}
          className="flex min-h-[52px] items-center gap-3 rounded-2xl bg-chat-field px-4 text-[15px] font-semibold text-chat-text transition-colors active:bg-chat-press focus-visible:outline focus-visible:outline-2 focus-visible:outline-chat-brand"
        >
          <LinkedinIcon className="h-6 w-6 shrink-0 text-[#0A66C2]" />
          <span className="min-w-0 flex-1 truncate">LinkedIn profile</span>
          <ExternalIcon className="h-4 w-4 shrink-0 text-chat-muted" />
        </a>
      ) : null}
    </div>
  );
}

function SheetSkeleton() {
  return (
    <div className="flex flex-col items-center gap-3 py-4" role="status" aria-busy="true" aria-label="Loading profile">
      <div className="chat-shimmer h-24 w-24 rounded-full" />
      <div className="chat-shimmer h-5 w-44 rounded" />
      <div className="chat-shimmer h-4 w-56 rounded" />
      <div className="chat-shimmer mt-3 h-12 w-full rounded-full" />
      <div className="chat-shimmer mt-2 h-20 w-full rounded-2xl" />
    </div>
  );
}

/** Bottom-sheet profile for the mobile chat app: slides in, drag the handle (or tap outside, press Esc) to dismiss. */
export default function AppProfileSheet({ userId, onClose }: Props) {
  const { detail, error, retry } = usePersonDetail(userId);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const drag = useRef<{ startY: number; startT: number; id: number } | null>(null);
  const [shown, setShown] = useState(false);
  const [dragY, setDragY] = useState(0);
  const [dragging, setDragging] = useState(false);

  // Slide in on the frame after mount so the transition has a start state.
  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const requestClose = useCallback(() => {
    if (timer.current) return;
    setShown(false);
    setDragY(0);
    timer.current = setTimeout(onClose, reducedMotion() ? 0 : SLIDE_MS - 40);
  }, [onClose]);

  useModalFocus(panelRef, closeRef, requestClose);

  const onDragStart = (e: ReactPointerEvent<HTMLDivElement>) => {
    drag.current = { startY: e.clientY, startT: e.timeStamp, id: e.pointerId };
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
  };
  const onDragMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    setDragY(Math.max(0, e.clientY - d.startY));
  };
  const onDragEnd = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    drag.current = null;
    setDragging(false);
    const dy = Math.max(0, e.clientY - d.startY);
    const velocity = dy / Math.max(1, e.timeStamp - d.startT);
    if (dy > CLOSE_DRAG_PX || (velocity > 0.6 && dy > 40)) requestClose();
    else setDragY(0);
  };

  const person = detail?.person;
  const profile = detail?.profile;
  const motion = dragging ? "" : "transition-transform duration-[260ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none";

  return (
    <div className="absolute inset-0 z-40 flex" role="presentation">
      <button
        type="button"
        tabIndex={-1}
        aria-label="Close profile"
        onClick={requestClose}
        className={`absolute inset-0 bg-chat-overlay transition-opacity duration-200 motion-reduce:transition-none ${shown ? "opacity-100" : "opacity-0"}`}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={person ? `${person.fullName} profile` : "Profile"}
        style={{ transform: shown ? `translateY(${dragY}px)` : "translateY(100%)" }}
        className={`relative mt-auto flex max-h-[92%] w-full flex-col rounded-t-3xl bg-chat-surface text-chat-text shadow-[0_-8px_30px_rgba(0,0,0,0.25)] ${motion}`}
      >
        <div
          onPointerDown={onDragStart}
          onPointerMove={onDragMove}
          onPointerUp={onDragEnd}
          onPointerCancel={onDragEnd}
          className="flex h-8 shrink-0 cursor-grab touch-none items-center justify-center"
        >
          <span className="h-1.5 w-10 rounded-full bg-chat-tick opacity-50" aria-hidden="true" />
        </div>
        <button
          ref={closeRef}
          type="button"
          onClick={requestClose}
          aria-label="Close profile"
          className="absolute right-2 top-1 flex h-11 w-11 items-center justify-center rounded-full text-chat-muted transition-colors active:bg-chat-press focus-visible:outline focus-visible:outline-2 focus-visible:outline-chat-brand"
        >
          <CloseIcon className="h-5 w-5" />
        </button>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-1">
          {error ? (
            <div className="flex flex-col items-center gap-3 py-10 text-center" role="alert">
              <AlertIcon className="h-9 w-9 text-chat-danger" />
              <p className="text-[15px] font-semibold text-chat-text [overflow-wrap:anywhere]">{error}</p>
              <button type="button" onClick={retry} className={`${BTN_PRIMARY} max-w-[12rem] flex-none`}>
                Retry
              </button>
            </div>
          ) : !person || !profile ? (
            <SheetSkeleton />
          ) : (
            <ProfileBody person={person} profile={profile} />
          )}
        </div>
      </div>
    </div>
  );
}
