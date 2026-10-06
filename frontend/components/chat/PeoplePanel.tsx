"use client";

import { useState } from "react";
import PersonRow from "./PersonRow";
import { AlertIcon, SearchIcon } from "./chat-icons";
import { usePeopleSearch } from "./usePeopleSearch";

function RowSkeleton() {
  return (
    <div className="flex items-center gap-3 px-4 py-3" aria-hidden="true">
      <div className="h-11 w-11 shrink-0 rounded-full bg-brand-sand motion-safe:animate-pulse" />
      <div className="flex-1 space-y-2">
        <div className="h-3 w-1/2 rounded bg-brand-sand motion-safe:animate-pulse" />
        <div className="h-3 w-3/4 rounded bg-brand-sand/70 motion-safe:animate-pulse" />
      </div>
    </div>
  );
}

export default function PeoplePanel() {
  const [query, setQuery] = useState("");
  const s = usePeopleSearch(query);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="shrink-0 px-3 pb-2 pt-1">
        <label htmlFor="chat-people-search" className="sr-only">
          Search people by name, or type @ and an email address
        </label>
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-muted" />
          <input
            id="chat-people-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search people by name or @email"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            className="h-11 w-full rounded-full border border-brand-softline bg-white pl-10 pr-4 text-[16px] text-brand-charcoal outline-none transition-colors placeholder:text-brand-muted/70 focus:border-brand-primary md:text-sm"
          />
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain" aria-busy={s.loading}>
        {s.tooShort ? (
          <div className="px-6 py-10 text-center">
            <SearchIcon className="mx-auto h-8 w-8 text-brand-muted/60" />
            <p className="mt-3 text-sm font-semibold text-brand-deep">Find students, mentors and experts</p>
            <p className="mt-1 text-xs text-brand-muted">
              Type at least 2 letters of a name. Start with @ to look someone up by exact email.
            </p>
          </div>
        ) : s.error && s.results.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-6 py-10 text-center" role="alert">
            <AlertIcon className="h-8 w-8 text-red-600" />
            <p className="text-sm font-semibold text-brand-deep">{s.error}</p>
            <button
              type="button"
              onClick={s.retry}
              className="min-h-[44px] rounded-full bg-brand-primary px-5 text-sm font-bold text-white hover:bg-brand-hover"
            >
              Retry
            </button>
          </div>
        ) : s.loading && s.results.length === 0 ? (
          <>
            <RowSkeleton />
            <RowSkeleton />
            <RowSkeleton />
          </>
        ) : s.results.length === 0 && s.searchedFor === s.q ? (
          <p className="px-6 py-10 text-center text-sm text-brand-muted">No one found for &ldquo;{s.q}&rdquo;.</p>
        ) : (
          <div role="list" aria-label="Search results" className={s.loading ? "opacity-60 transition-opacity" : "transition-opacity"}>
            {s.results.map((p) => (
              <PersonRow key={p.id} person={p} />
            ))}
            {s.hasMore ? (
              <div className="p-3 text-center">
                <button
                  type="button"
                  onClick={() => void s.loadMore()}
                  disabled={s.loadingMore}
                  className="min-h-[44px] rounded-full border border-brand-softline bg-white px-5 text-xs font-bold text-brand-deep hover:bg-brand-lightOrange disabled:opacity-60"
                >
                  {s.loadingMore ? "Loading..." : "Show more"}
                </button>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
