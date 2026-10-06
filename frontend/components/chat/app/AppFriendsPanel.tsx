"use client";

import { useMemo, type ReactNode } from "react";
import type { ChatFriend, ChatFriendRequests } from "../../../lib/chat-types";
import { AlertIcon, UserPlusIcon } from "../chat-icons";
import { FindPeopleArt, NoResultsArt } from "./AppIllustrations";
import { AppPersonRow, AppRequestRow, AppSentRow } from "./AppPersonRow";

type Props = {
  friends: ChatFriend[];
  requests: ChatFriendRequests;
  loading: boolean;
  error: string | null;
  /** Text typed in the header search (already applied to `friends` by the parent). */
  filter: string;
  onRetry: () => void;
  onFindPeople: () => void;
};

function SectionTitle({ title, count }: { title: string; count: number }) {
  return (
    <h3 className="flex items-center gap-2 px-4 pb-1 pt-4 text-[13px] font-bold uppercase tracking-wide text-chat-brandText">
      {title}
      <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-chat-brandSoft px-1 text-[11px] font-bold leading-none">
        {count}
      </span>
    </h3>
  );
}

function letterOf(name: string): string {
  const c = name.trim().charAt(0).toUpperCase();
  return /\p{L}/u.test(c) ? c : "#";
}

type Group = { letter: string; people: ChatFriend[] };

function groupByLetter(friends: ChatFriend[]): Group[] {
  const sorted = [...friends].sort((a, b) => a.fullName.localeCompare(b.fullName, undefined, { sensitivity: "base" }));
  const groups: Group[] = [];
  for (const f of sorted) {
    const letter = letterOf(f.fullName);
    const existing = groups.find((g) => g.letter === letter);
    if (existing) existing.people.push(f);
    else groups.push({ letter, people: [f] });
  }
  // Names that do not start with a letter ("#") go last.
  return groups.sort((a, b) => (a.letter === "#" ? 1 : b.letter === "#" ? -1 : 0));
}

function Skeleton() {
  return (
    <div className="flex-1 overflow-hidden" role="status" aria-busy="true" aria-label="Loading friends">
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-2.5" aria-hidden="true">
          <div className="chat-shimmer h-[52px] w-[52px] shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2.5">
            <div className="chat-shimmer h-4 rounded" style={{ width: `${40 + ((i * 11) % 22)}%` }} />
            <div className="chat-shimmer h-3.5 rounded" style={{ width: `${58 + ((i * 19) % 28)}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function AppFriendsPanel({ friends, requests, loading, error, filter, onRetry, onFindPeople }: Props) {
  const groups = useMemo(() => groupByLetter(friends), [friends]);
  const hasRequests = requests.incoming.length + requests.outgoing.length > 0;
  const searching = filter.trim().length > 0;

  if (loading && friends.length === 0 && !hasRequests) return <Skeleton />;

  if (error && friends.length === 0 && !hasRequests) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-8 text-center" role="alert">
        <AlertIcon className="h-9 w-9 text-chat-danger" />
        <p className="text-[15px] font-semibold text-chat-text">{error}</p>
        <button
          type="button"
          onClick={onRetry}
          className="min-h-[44px] rounded-full bg-chat-brandStrong px-6 text-[15px] font-bold text-white transition-transform active:scale-95 motion-reduce:transition-none motion-reduce:active:scale-100"
        >
          Retry
        </button>
      </div>
    );
  }

  let friendsBody: ReactNode;
  if (friends.length === 0 && searching) {
    friendsBody = (
      <div className="flex flex-col items-center px-8 pt-8 text-center">
        <NoResultsArt className="h-24 w-36" />
        <p className="mt-2 text-[15px] font-semibold text-chat-text">No friends match &ldquo;{filter.trim()}&rdquo;</p>
      </div>
    );
  } else if (friends.length === 0) {
    friendsBody = (
      <div className="flex flex-col items-center px-8 pt-8 text-center">
        <FindPeopleArt className="h-28 w-40" />
        <p className="mt-3 text-[16px] font-bold text-chat-text">No friends yet</p>
        <p className="mt-1 max-w-[17rem] text-[13px] leading-5 text-chat-muted">Find people and send a request to start chatting.</p>
        <button
          type="button"
          onClick={onFindPeople}
          className="mt-4 inline-flex min-h-[48px] items-center gap-2 rounded-full bg-chat-brandStrong px-6 text-[15px] font-bold text-white transition-transform active:scale-95 motion-reduce:transition-none motion-reduce:active:scale-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-chat-brand"
        >
          <UserPlusIcon className="h-5 w-5" />
          Find people
        </button>
      </div>
    );
  } else {
    friendsBody = groups.map((g) => (
      <section key={g.letter} aria-label={`Friends starting with ${g.letter}`}>
        <h4 className="sticky top-0 z-10 bg-chat-bg px-4 py-1 text-[13px] font-bold text-chat-muted">{g.letter}</h4>
        <ul>
          {g.people.map((f) => (
            <AppPersonRow key={f.id} person={{ ...f, friendship: { status: "friends" } }} />
          ))}
        </ul>
      </section>
    ));
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-28">
      {requests.incoming.length > 0 ? (
        <section aria-label="Requests">
          <SectionTitle title="Requests" count={requests.incoming.length} />
          <ul>
            {requests.incoming.map((r) => (
              <AppRequestRow key={r.id} request={r} />
            ))}
          </ul>
        </section>
      ) : null}
      {requests.outgoing.length > 0 ? (
        <section aria-label="Sent requests">
          <SectionTitle title="Sent" count={requests.outgoing.length} />
          <ul>
            {requests.outgoing.map((r) => (
              <AppSentRow key={r.id} request={r} />
            ))}
          </ul>
        </section>
      ) : null}
      <section aria-label="Friends">
        <SectionTitle title="Friends" count={friends.length} />
        {friendsBody}
      </section>
    </div>
  );
}
