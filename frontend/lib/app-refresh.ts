"use client";

import { useEffect, useRef } from "react";

/**
 * Tiny decoupled event bus so the notification panel can ask whichever data provider is mounted to
 * reload after an invite / request was answered. Safe when nobody listens.
 */
export type AppRefreshKind = "team" | "mentor" | "friends";

const EVENT = "prabodh:refresh";

export function emitAppRefresh(...kinds: AppRefreshKind[]): void {
  if (typeof window === "undefined") return;
  for (const kind of kinds) window.dispatchEvent(new CustomEvent<{ kind: AppRefreshKind }>(EVENT, { detail: { kind } }));
}

/** Run `handler` whenever one of `kinds` is requested. The handler may change between renders. */
export function useAppRefresh(kinds: readonly AppRefreshKind[], handler: () => void): void {
  const ref = useRef(handler);
  ref.current = handler;
  const key = kinds.join(",");
  useEffect(() => {
    const wanted = key.split(",");
    const onEvent = (e: Event) => {
      const kind = (e as CustomEvent<{ kind?: AppRefreshKind }>).detail?.kind;
      if (kind && wanted.includes(kind)) ref.current();
    };
    window.addEventListener(EVENT, onEvent);
    return () => window.removeEventListener(EVENT, onEvent);
  }, [key]);
}
