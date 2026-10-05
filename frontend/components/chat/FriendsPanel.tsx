"use client";

import type { ReactNode } from "react";
import type { ChatFriend, ChatFriendRequests } from "../../lib/chat-types";
import { AlertIcon } from "./chat-icons";
import PersonRow, { FriendAction } from "./PersonRow";

type Props = {
  friends: ChatFriend[];
  requests: ChatFriendRequests;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onFindPeople: () => void;
};

function Section({ title, count, children }: { title: string; count: number; children: ReactNode }) {
  return (
    <section aria-label={title}>
      <h3 className="sticky top-0 z-10 flex items-center gap-2 bg-[#FAF7F2]/95 px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-brand-muted backdrop-blur">
        {title}
        <span className="rounded-full bg-brand-sand px-1.5 py-px text-[10px] text-brand-deep">{count}</span>
      </h3>
      <div role="list">{children}</div>
    </section>
  );
}

export default function FriendsPanel({ friends, requests, loading, error, onRetry, onFindPeople }: Props) {
  const hasRequests = requests.incoming.length + requests.outgoing.length > 0;

  if (loading && friends.length === 0 && !hasRequests) {
    return (
      <div className="space-y-3 p-4" aria-hidden="true">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-full bg-brand-sand motion-safe:animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-1/2 rounded bg-brand-sand motion-safe:animate-pulse" />
              <div className="h-3 w-2/3 rounded bg-brand-sand/70 motion-safe:animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error && friends.length === 0 && !hasRequests) {
    return (
      <div className="flex flex-col items-center gap-3 px-6 py-10 text-center" role="alert">
        <AlertIcon className="h-8 w-8 text-red-600" />
        <p className="text-sm font-semibold text-brand-deep">{error}</p>
        <button
          type="button"
          onClick={onRetry}
          className="min-h-[44px] rounded-full bg-brand-primary px-5 text-sm font-bold text-white hover:bg-brand-hover"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
      {requests.incoming.length > 0 ? (
        <Section title="Requests" count={requests.incoming.length}>
          {requests.incoming.map((r) => (
            <PersonRow
              key={r.id}
              person={r.person}
              action={
                <FriendAction
                  person={{ ...r.person, friendship: { status: "incoming", requestId: r.id } }}
                  requestId={r.id}
                />
              }
            />
          ))}
        </Section>
      ) : null}
      {requests.outgoing.length > 0 ? (
        <Section title="Sent requests" count={requests.outgoing.length}>
          {requests.outgoing.map((r) => (
            <PersonRow
              key={r.id}
              person={r.person}
              action={
                <FriendAction
                  person={{ ...r.person, friendship: { status: "outgoing", requestId: r.id } }}
                  requestId={r.id}
                />
              }
            />
          ))}
        </Section>
      ) : null}
      <Section title="Friends" count={friends.length}>
        {friends.length === 0 ? (
          <div className="px-6 py-8 text-center">
            <p className="text-sm font-semibold text-brand-deep">No friends yet</p>
            <p className="mt-1 text-xs text-brand-muted">Find people and send a request to start chatting.</p>
            <button
              type="button"
              onClick={onFindPeople}
              className="mt-3 min-h-[44px] rounded-full bg-brand-primary px-5 text-sm font-bold text-white hover:bg-brand-hover"
            >
              Find people
            </button>
          </div>
        ) : (
          friends.map((f) => <PersonRow key={f.id} person={{ ...f, friendship: { status: "friends" } }} />)
        )}
      </Section>
    </div>
  );
}
