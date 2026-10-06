"use client";

import { useEffect, useRef, useState } from "react";
import { isAbortError, searchPeople } from "../../lib/chat-api";
import type { ChatPerson } from "../../lib/chat-types";
import PersonRow from "./PersonRow";
import { AlertIcon, SearchIcon } from "./chat-icons";

const DEBOUNCE_MS = 300;

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

export default function PeoplePanel({ externalQuery }: { externalQuery?: string } = {}) {
  const [ownQuery, setQuery] = useState("");
  const query = externalQuery ?? ownQuery;
  const [results, setResults] = useState<ChatPerson[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchedFor, setSearchedFor] = useState("");
  const [attempt, setAttempt] = useState(0);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const q = query.trim();
  const tooShort = q.length < 2;

  useEffect(() => {
    if (tooShort) {
      setResults([]);
      setCursor(null);
      setError(null);
      setLoading(false);
      setSearchedFor("");
      return;
    }
    setLoading(true);
    const controller = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await searchPeople(q, { signal: controller.signal });
        if (!mounted.current || controller.signal.aborted) return;
        setResults(res.items ?? []);
        setCursor(res.nextCursor ?? null);
        setSearchedFor(q);
        setError(null);
      } catch (err) {
        if (isAbortError(err) || !mounted.current || controller.signal.aborted) return;
        setError(err instanceof Error && err.message ? err.message : "Search failed.");
      } finally {
        if (mounted.current && !controller.signal.aborted) setLoading(false);
      }
    }, DEBOUNCE_MS);
    return () => {
      clearTimeout(t);
      controller.abort();
    };
  }, [q, tooShort, attempt]);

  const loadMore = async () => {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await searchPeople(q, { cursor });
      if (!mounted.current) return;
      setResults((prev) => {
        const seen = new Set(prev.map((p) => p.id));
        return [...prev, ...(res.items ?? []).filter((p) => !seen.has(p.id))];
      });
      setCursor(res.nextCursor ?? null);
    } catch (err) {
      if (mounted.current) setError(err instanceof Error && err.message ? err.message : "Could not load more.");
    } finally {
      if (mounted.current) setLoadingMore(false);
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {externalQuery !== undefined ? null : (
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
      )}
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain" aria-busy={loading}>
        {tooShort ? (
          <div className="px-6 py-10 text-center">
            <SearchIcon className="mx-auto h-8 w-8 text-brand-muted/60" />
            <p className="mt-3 text-sm font-semibold text-brand-deep">Find students, mentors and experts</p>
            <p className="mt-1 text-xs text-brand-muted">
              Type at least 2 letters of a name. Start with @ to look someone up by exact email.
            </p>
          </div>
        ) : error && results.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-6 py-10 text-center" role="alert">
            <AlertIcon className="h-8 w-8 text-red-600" />
            <p className="text-sm font-semibold text-brand-deep">{error}</p>
            <button
              type="button"
              onClick={() => setAttempt((n) => n + 1)}
              className="min-h-[44px] rounded-full bg-brand-primary px-5 text-sm font-bold text-white hover:bg-brand-hover"
            >
              Retry
            </button>
          </div>
        ) : loading && results.length === 0 ? (
          <>
            <RowSkeleton />
            <RowSkeleton />
            <RowSkeleton />
          </>
        ) : results.length === 0 && searchedFor === q ? (
          <p className="px-6 py-10 text-center text-sm text-brand-muted">No one found for &ldquo;{q}&rdquo;.</p>
        ) : (
          <div role="list" aria-label="Search results" className={loading ? "opacity-60 transition-opacity" : "transition-opacity"}>
            {results.map((p) => (
              <PersonRow key={p.id} person={p} />
            ))}
            {cursor ? (
              <div className="p-3 text-center">
                <button
                  type="button"
                  onClick={() => void loadMore()}
                  disabled={loadingMore}
                  className="min-h-[44px] rounded-full border border-brand-softline bg-white px-5 text-xs font-bold text-brand-deep hover:bg-brand-lightOrange disabled:opacity-60"
                >
                  {loadingMore ? "Loading..." : "Show more"}
                </button>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
