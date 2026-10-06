"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { isAbortError, searchPeople } from "../../lib/chat-api";
import type { ChatPerson } from "../../lib/chat-types";

const DEBOUNCE_MS = 300;
export const MIN_QUERY_LENGTH = 2;

export type PeopleSearch = {
  /** Trimmed query actually searched. */
  q: string;
  tooShort: boolean;
  results: ChatPerson[];
  hasMore: boolean;
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  /** The query the current `results` belong to ("" before the first answer). */
  searchedFor: string;
  retry: () => void;
  loadMore: () => Promise<void>;
};

function errorText(err: unknown, fallback: string): string {
  return err instanceof Error && err.message ? err.message : fallback;
}

/** Debounced, abortable people search with pagination. Shared by the desktop and mobile panels. */
export function usePeopleSearch(query: string): PeopleSearch {
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
  const tooShort = q.length < MIN_QUERY_LENGTH;

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
        setError(errorText(err, "Search failed."));
      } finally {
        if (mounted.current && !controller.signal.aborted) setLoading(false);
      }
    }, DEBOUNCE_MS);
    return () => {
      clearTimeout(t);
      controller.abort();
    };
  }, [q, tooShort, attempt]);

  const loadMore = useCallback(async () => {
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
      if (mounted.current) setError(errorText(err, "Could not load more."));
    } finally {
      if (mounted.current) setLoadingMore(false);
    }
  }, [cursor, loadingMore, q]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  return { q, tooShort, results, hasMore: cursor !== null, loading, loadingMore, error, searchedFor, retry, loadMore };
}
