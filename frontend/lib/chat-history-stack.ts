/**
 * Framework-free layered browser-history manager for the chat.
 *
 * The chat has stacked screens (a Friends / Find-people tab, an open conversation, a profile sheet, a message
 * action sheet). Each one that is opened pushes exactly one history entry, so the system Back button (or the
 * phone's Back gesture) closes exactly one visible layer. The in-app back arrows call `close()`, which goes
 * through the very same popstate path, so system Back and in-app Back are indistinguishable.
 *
 * The layer stack mirrors the entries this manager pushed. Every pushed entry carries a depth marker in
 * `history.state` (`__chatDepth`); a popstate is handled by comparing the marker of the entry we landed on with
 * the stack height, so one Back pops one layer, a multi-step jump pops several, and navigation we did not cause
 * (forward into stale entries, other pages) is ignored.
 */

export type LayerKind = "tab" | "thread" | "profile" | "sheet";

export type HistoryLike = {
  readonly state: unknown;
  pushState(data: unknown, unused: string, url?: string | null): void;
  replaceState(data: unknown, unused: string, url?: string | null): void;
  go(delta: number): void;
};

export type HistoryEnv = {
  history: () => HistoryLike;
  href: () => string;
  /** Subscribe to popstate; returns an unsubscribe function. */
  listen: (fn: () => void) => () => void;
  /** Schedule a safety timeout; returns a cancel function. Defaults to setTimeout. */
  timeout?: (fn: () => void, ms: number) => () => void;
};

export type ChatHistoryStack = {
  /** Start listening to popstate. Idempotent; the returned detach never touches history (safe on unmount). */
  attach(): () => void;
  /** Register the UI-close callback for a layer. Returns an unregister that only removes this exact callback. */
  register(kind: LayerKind, fn: () => void): () => void;
  has(kind: LayerKind): boolean;
  top(): LayerKind | null;
  depth(): number;
  /** Push a layer on top. Returns false (and does nothing) when that layer is already open. */
  push(kind: LayerKind): boolean;
  /** Re-label the top entry without adding history (e.g. profile -> thread). Pushes when the stack is empty. */
  replaceTop(kind: LayerKind): boolean;
  /**
   * Programmatic close: pops the layer and everything above it with one history.go(-n). The popstate then runs
   * the UI-close callbacks of exactly those layers, top first, once. Returns false when the layer is not open
   * (the caller should close its UI itself).
   */
  close(kind: LayerKind): boolean;
  /**
   * Open a conversation: pushes a thread layer, or re-labels a profile that is on top (the profile's entry is
   * replaced, leaving no stale entry), or just closes a profile that sits above an already open thread.
   */
  openThread(): void;
};

const MARK = "__chatDepth";
const WATCHDOG_MS = 700;

function markerOf(state: unknown): number {
  if (state && typeof state === "object") {
    const m = (state as Record<string, unknown>)[MARK];
    if (typeof m === "number" && m > 0) return m;
  }
  return 0;
}

function defaultTimeout(fn: () => void, ms: number): () => void {
  const id = setTimeout(fn, ms);
  const unref = (id as unknown as { unref?: () => void }).unref;
  if (typeof unref === "function") unref.call(id);
  return () => clearTimeout(id);
}

export function createChatHistoryStack(env: HistoryEnv): ChatHistoryStack {
  const stack: LayerKind[] = [];
  const closers: Partial<Record<LayerKind, () => void>> = {};
  const queue: Array<() => void> = [];
  const schedule = env.timeout ?? defaultTimeout;

  /** Set while our own history.go(-n) is in flight: operations wait for it, popstate resolves it. */
  let pending: { target: number } | null = null;
  let cancelWatchdog: (() => void) | null = null;
  let unlisten: (() => void) | null = null;
  let checkedStale = false;

  const stateWith = (depth: number) => {
    const h = env.history();
    const base = h.state && typeof h.state === "object" ? (h.state as Record<string, unknown>) : {};
    // Keep Next.js's own history state so its router stays in sync on the same URL.
    return { ...base, [MARK]: depth };
  };

  const popTo = (target: number) => {
    while (stack.length > target) {
      const kind = stack.pop() as LayerKind;
      try {
        closers[kind]?.();
      } catch {
        /* a UI callback must never break history bookkeeping */
      }
    }
  };

  const flush = () => {
    while (!pending && queue.length > 0) {
      const op = queue.shift() as () => void;
      op();
    }
  };

  const settle = (target: number) => {
    pending = null;
    if (cancelWatchdog) {
      cancelWatchdog();
      cancelWatchdog = null;
    }
    popTo(target);
    flush();
  };

  const onPop = () => {
    if (pending) {
      settle(pending.target);
      return;
    }
    if (stack.length === 0) return;
    const m = markerOf(env.history().state);
    // Only act when we landed on an entry below the top of our stack: anything else (forward into a stale
    // entry, a Next.js navigation that kept our marker) is not ours.
    if (m >= stack.length) return;
    popTo(m);
    flush();
  };

  const api: ChatHistoryStack = {
    attach() {
      if (!unlisten) unlisten = env.listen(onPop);
      if (!checkedStale) {
        checkedStale = true;
        // Mounted onto an entry that an earlier (unmounted/reloaded) chat pushed: its layers no longer exist, so
        // Back would be a dead press. Unwind them once.
        const k = markerOf(env.history().state);
        if (k > 0 && stack.length === 0 && !pending) {
          pending = { target: 0 };
          try {
            env.history().go(-k);
          } catch {
            pending = null;
          }
          if (pending) cancelWatchdog = schedule(() => settle(0), WATCHDOG_MS);
        }
      }
      return () => {
        if (unlisten) {
          unlisten();
          unlisten = null;
        }
      };
    },

    register(kind, fn) {
      closers[kind] = fn;
      return () => {
        if (closers[kind] === fn) delete closers[kind];
      };
    },

    has: (kind) => stack.includes(kind),
    top: () => (stack.length ? stack[stack.length - 1] : null),
    depth: () => stack.length,

    push(kind) {
      if (pending) {
        queue.push(() => void api.push(kind));
        return true;
      }
      if (stack.includes(kind)) return false;
      try {
        env.history().pushState(stateWith(stack.length + 1), "", env.href());
      } catch {
        return false; // history unavailable: the screen still works, Back just behaves as before
      }
      stack.push(kind);
      return true;
    },

    replaceTop(kind) {
      if (pending) {
        queue.push(() => void api.replaceTop(kind));
        return true;
      }
      if (stack.length === 0) return api.push(kind);
      if (stack[stack.length - 1] === kind) return true;
      try {
        env.history().replaceState(stateWith(stack.length), "", env.href());
      } catch {
        return false;
      }
      stack[stack.length - 1] = kind;
      return true;
    },

    close(kind) {
      const idx = stack.lastIndexOf(kind);
      if (idx < 0) return false;
      if (pending) {
        queue.push(() => void api.close(kind));
        return true;
      }
      const n = stack.length - idx;
      pending = { target: idx };
      try {
        env.history().go(-n);
      } catch {
        pending = null;
        popTo(idx);
        return true;
      }
      // A synchronous popstate may already have settled it.
      if (pending) cancelWatchdog = schedule(() => settle(idx), WATCHDOG_MS);
      return true;
    },

    openThread() {
      if (stack.includes("thread")) {
        if (stack.includes("profile")) api.close("profile");
        return;
      }
      if (api.top() === "profile") {
        api.replaceTop("thread");
        return;
      }
      api.push("thread");
    },
  };

  return api;
}
