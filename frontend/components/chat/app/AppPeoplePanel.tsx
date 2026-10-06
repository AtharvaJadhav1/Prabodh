"use client";

import { AlertIcon } from "../chat-icons";
import { usePeopleSearch } from "../usePeopleSearch";
import { FindPeopleArt, NoResultsArt } from "./AppIllustrations";
import { AppPersonRow } from "./AppPersonRow";

function RowSkeleton({ i }: { i: number }) {
  return (
    <li className="flex items-center gap-3 px-4 py-2.5" aria-hidden="true">
      <div className="chat-shimmer h-[52px] w-[52px] shrink-0 rounded-full" />
      <div className="min-w-0 flex-1 space-y-2.5">
        <div className="chat-shimmer h-4 rounded" style={{ width: `${40 + ((i * 11) % 22)}%` }} />
        <div className="chat-shimmer h-3.5 rounded" style={{ width: `${58 + ((i * 19) % 28)}%` }} />
      </div>
      <div className="chat-shimmer h-8 w-16 shrink-0 rounded-full" />
    </li>
  );
}

/** Find people (mobile app style). The search field lives in the shared header; `query` comes from it. */
export default function AppPeoplePanel({ query }: { query: string }) {
  const s = usePeopleSearch(query);

  return (
    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-8" aria-busy={s.loading}>
      {s.tooShort ? (
        <div className="flex flex-col items-center px-8 pt-10 text-center">
          <FindPeopleArt className="h-32 w-44" />
          <h2 className="mt-4 text-[18px] font-extrabold text-chat-text">Find students, mentors and experts</h2>
          <p className="mt-1.5 max-w-[19rem] text-[14px] leading-5 text-chat-muted">
            Search by name, college or exact email. Type at least 2 letters, or start with @ to look someone up by email.
          </p>
        </div>
      ) : s.error && s.results.length === 0 ? (
        <div className="flex flex-col items-center gap-3 px-8 pt-14 text-center" role="alert">
          <AlertIcon className="h-9 w-9 text-chat-danger" />
          <p className="text-[15px] font-semibold text-chat-text">{s.error}</p>
          <button
            type="button"
            onClick={s.retry}
            className="min-h-[44px] rounded-full bg-chat-brandStrong px-6 text-[15px] font-bold text-white transition-transform active:scale-95 motion-reduce:transition-none motion-reduce:active:scale-100"
          >
            Retry
          </button>
        </div>
      ) : s.loading && s.results.length === 0 ? (
        <ul role="status" aria-label="Searching people">
          {[0, 1, 2, 3, 4].map((i) => (
            <RowSkeleton key={i} i={i} />
          ))}
        </ul>
      ) : s.results.length === 0 && s.searchedFor === s.q ? (
        <div className="flex flex-col items-center px-8 pt-10 text-center">
          <NoResultsArt className="h-28 w-40" />
          <p className="mt-3 text-[15px] font-semibold text-chat-text">No one found for &ldquo;{s.q}&rdquo;</p>
          <p className="mt-1 text-[13px] text-chat-muted">Check the spelling, or try a college name or an exact @email.</p>
        </div>
      ) : (
        <>
          <ul aria-label="Search results" className={`transition-opacity duration-200 motion-reduce:transition-none ${s.loading ? "opacity-60" : ""}`}>
            {s.results.map((p) => (
              <AppPersonRow key={p.id} person={p} />
            ))}
          </ul>
          {s.hasMore ? (
            <div className="p-4 text-center">
              <button
                type="button"
                onClick={() => void s.loadMore()}
                disabled={s.loadingMore}
                className="min-h-[44px] rounded-full bg-chat-field px-6 text-[14px] font-bold text-chat-text transition-transform active:scale-95 disabled:opacity-60 motion-reduce:transition-none motion-reduce:active:scale-100"
              >
                {s.loadingMore ? "Loading..." : "Show more"}
              </button>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
