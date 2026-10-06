"use client";

import { useRef, useState } from "react";
import { formatMemberSince, isSafeHttpUrl } from "../../lib/chat-format";
import ChatAvatar from "./ChatAvatar";
import { AlertIcon, CheckIcon, CloseIcon, LinkedinIcon } from "./chat-icons";
import { useChatPeople } from "./chat-context";
import { RoleChip, personMeta } from "./PersonRow";
import { useModalFocus, usePersonDetail } from "./useProfileSheet";

type Props = {
  userId: string;
  /** Wide containers get a right-hand panel; narrow ones a bottom sheet. */
  wide: boolean;
  onClose: () => void;
};

function Chips({ items, tone }: { items: string[]; tone: "skill" | "domain" }) {
  if (items.length === 0) return null;
  return (
    <ul className="flex flex-wrap gap-1.5">
      {items.map((s) => (
        <li
          key={s}
          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
            tone === "skill" ? "bg-brand-lightOrange text-brand-deep" : "border border-brand-softline bg-white text-brand-muted"
          }`}
        >
          {s}
        </li>
      ))}
    </ul>
  );
}

export default function PersonProfileSheet({ userId, wide, onClose }: Props) {
  const a = useChatPeople();
  const { detail, error, retry } = usePersonDetail(userId);
  const [confirmUnfriend, setConfirmUnfriend] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  useModalFocus(panelRef, closeRef, onClose);

  const person = detail?.person;
  const profile = detail?.profile;
  const fs = person ? a.friendshipOf(person) : null;
  const busy = person ? a.isBusy(person.id) : false;
  const linkedin = profile?.linkedinUrl && isSafeHttpUrl(profile.linkedinUrl) ? profile.linkedinUrl : null;
  const btn =
    "inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-full px-5 text-sm font-bold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary disabled:cursor-not-allowed disabled:opacity-60";

  return (
    <div className="absolute inset-0 z-40 flex" role="presentation">
      <button
        type="button"
        tabIndex={-1}
        aria-label="Close profile"
        onClick={onClose}
        className="absolute inset-0 bg-brand-deep/40"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={person ? `${person.fullName} profile` : "Profile"}
        className={`relative flex flex-col bg-white shadow-2xl ${
          wide
            ? "ml-auto h-full w-[360px] max-w-full border-l border-brand-softline"
            : "mt-auto max-h-[88%] w-full rounded-t-3xl pb-[env(safe-area-inset-bottom)]"
        }`}
      >
        <div className="flex shrink-0 items-center justify-between px-4 pt-3">
          {wide ? <span className="text-sm font-bold text-brand-deep">Profile</span> : <span className="mx-auto mb-1 h-1 w-10 rounded-full bg-brand-sand" aria-hidden="true" />}
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close profile"
            className={`flex h-11 w-11 items-center justify-center rounded-full text-brand-muted hover:bg-brand-lightOrange hover:text-brand-deep focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-primary ${wide ? "" : "absolute right-2 top-2"}`}
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-5 pt-2">
          {error ? (
            <div className="flex flex-col items-center gap-3 py-10 text-center" role="alert">
              <AlertIcon className="h-8 w-8 text-red-600" />
              <p className="text-sm font-semibold text-brand-deep">{error}</p>
              <button type="button" onClick={retry} className={`${btn} bg-brand-primary text-white hover:bg-brand-hover`}>
                Retry
              </button>
            </div>
          ) : !person || !profile ? (
            <div className="flex flex-col items-center gap-3 py-8" aria-busy="true" aria-label="Loading profile">
              <div className="h-[84px] w-[84px] rounded-full bg-brand-sand motion-safe:animate-pulse" />
              <div className="h-4 w-40 rounded bg-brand-sand motion-safe:animate-pulse" />
              <div className="h-3 w-56 rounded bg-brand-sand/70 motion-safe:animate-pulse" />
              <div className="mt-2 h-16 w-full rounded-xl bg-brand-sand/50 motion-safe:animate-pulse" />
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col items-center text-center">
                <ChatAvatar name={person.fullName} src={person.avatarUrl} size={84} />
                <h2 className="mt-3 text-lg font-extrabold leading-tight text-brand-deep">{person.fullName}</h2>
                <div className="mt-1.5">
                  <RoleChip label={person.roleLabel} />
                </div>
                {personMeta({ ...person, institute: profile.institute ?? person.institute, department: profile.department ?? person.department }) ? (
                  <p className="mt-1.5 text-sm font-medium text-brand-muted">
                    {personMeta({ ...person, institute: profile.institute ?? person.institute, department: profile.department ?? person.department })}
                  </p>
                ) : null}
                {profile.headline ? <p className="mt-2 text-sm font-semibold text-brand-charcoal">{profile.headline}</p> : null}
              </div>

              {fs ? (
                <div className="flex flex-wrap items-center justify-center gap-2">
                  {fs.status === "none" ? (
                    <button type="button" disabled={busy} onClick={() => a.add(person)} className={`${btn} bg-brand-primary text-white hover:bg-brand-hover`}>
                      Add friend
                    </button>
                  ) : null}
                  {fs.status === "outgoing" ? (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => a.cancel(person, fs.requestId)}
                      className={`${btn} border border-brand-softline bg-white text-brand-muted hover:bg-red-50 hover:text-red-700`}
                    >
                      Requested &middot; Cancel
                    </button>
                  ) : null}
                  {fs.status === "incoming" ? (
                    <>
                      <button type="button" disabled={busy} onClick={() => a.accept(person, fs.requestId)} className={`${btn} bg-brand-primary text-white hover:bg-brand-hover`}>
                        <CheckIcon className="h-4 w-4" /> Accept
                      </button>
                      <button type="button" disabled={busy} onClick={() => a.decline(person, fs.requestId)} className={`${btn} border border-brand-softline bg-white text-brand-muted hover:bg-red-50 hover:text-red-700`}>
                        Decline
                      </button>
                    </>
                  ) : null}
                  {fs.status === "friends" ? (
                    <>
                      <button type="button" disabled={busy} onClick={() => a.openDm(person)} className={`${btn} bg-brand-primary text-white hover:bg-brand-hover`}>
                        Message
                      </button>
                      {confirmUnfriend ? (
                        <span className="flex w-full flex-col items-center gap-2 rounded-2xl border border-red-200 bg-red-50 p-3 text-center" role="alertdialog" aria-label="Confirm unfriend">
                          <span className="text-sm font-semibold text-red-800">Remove {person.fullName} from your friends?</span>
                          <span className="flex gap-2">
                            <button type="button" onClick={() => setConfirmUnfriend(false)} className={`${btn} border border-brand-softline bg-white text-brand-deep`}>
                              Keep
                            </button>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => {
                                a.unfriend(person);
                                setConfirmUnfriend(false);
                              }}
                              className={`${btn} bg-red-600 text-white hover:bg-red-700`}
                            >
                              Unfriend
                            </button>
                          </span>
                        </span>
                      ) : (
                        <button type="button" onClick={() => setConfirmUnfriend(true)} className={`${btn} border border-brand-softline bg-white text-red-700 hover:bg-red-50`}>
                          Unfriend
                        </button>
                      )}
                    </>
                  ) : null}
                </div>
              ) : null}

              {profile.bio ? (
                <section aria-label="About">
                  <h3 className="mb-1 text-[11px] font-bold uppercase tracking-wider text-brand-muted">About</h3>
                  <p className="whitespace-pre-wrap text-sm text-brand-charcoal [overflow-wrap:anywhere]">{profile.bio}</p>
                </section>
              ) : null}
              {profile.skills.length > 0 ? (
                <section aria-label="Skills">
                  <h3 className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-brand-muted">Skills</h3>
                  <Chips items={profile.skills} tone="skill" />
                </section>
              ) : null}
              {profile.domainTags.length > 0 ? (
                <section aria-label="Domains">
                  <h3 className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-brand-muted">Domains</h3>
                  <Chips items={profile.domainTags} tone="domain" />
                </section>
              ) : null}

              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 rounded-2xl bg-brand-cream p-3 text-sm">
                {profile.memberSince ? (
                  <>
                    <dt className="font-semibold text-brand-muted">Member since</dt>
                    <dd className="text-right font-semibold text-brand-deep">{formatMemberSince(profile.memberSince)}</dd>
                  </>
                ) : null}
                {profile.sharedTeam ? (
                  <>
                    <dt className="font-semibold text-brand-muted">Shared team</dt>
                    <dd className="truncate text-right font-semibold text-brand-deep">{profile.sharedTeam.name}</dd>
                  </>
                ) : null}
                {linkedin ? (
                  <>
                    <dt className="font-semibold text-brand-muted">LinkedIn</dt>
                    <dd className="text-right">
                      <a
                        href={linkedin}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`${person.fullName} on LinkedIn (opens in a new tab)`}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-[#0A66C2] hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-primary"
                      >
                        <LinkedinIcon className="h-5 w-5" />
                      </a>
                    </dd>
                  </>
                ) : null}
              </dl>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
