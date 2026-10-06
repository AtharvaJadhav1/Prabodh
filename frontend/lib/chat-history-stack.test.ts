// Run: ../backend/node_modules/.bin/tsx --test lib/chat-history-stack.test.ts   (from frontend/)
import assert from "node:assert/strict";
import { test } from "node:test";
import { createChatHistoryStack, type LayerKind } from "./chat-history-stack";

/** Minimal browser History: entries + index, pushState truncates forward entries, go() dispatches popstate. */
class FakeHistory {
  entries: Array<{ state: unknown }> = [{ state: { __NA: true } }];
  index = 0;
  left = false;
  private listeners = new Set<() => void>();
  private queued: Array<() => void> = [];
  constructor(private sync = true) {}

  get state() {
    return this.entries[this.index].state;
  }
  pushState(data: unknown) {
    this.entries.length = this.index + 1;
    this.entries.push({ state: data });
    this.index++;
  }
  replaceState(data: unknown) {
    this.entries[this.index] = { state: data };
  }
  go(delta: number) {
    const next = this.index + delta;
    if (next < 0 || next >= this.entries.length) {
      if (next < 0) this.left = true; // would leave the page
      return;
    }
    this.index = next;
    const fire = () => this.listeners.forEach((l) => l());
    if (this.sync) fire();
    else this.queued.push(fire);
  }
  back() {
    this.go(-1);
  }
  forward() {
    this.go(1);
  }
  /** Deliver queued popstate events (async mode). */
  drain() {
    while (this.queued.length) (this.queued.shift() as () => void)();
  }
  listen = (fn: () => void) => {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  };
}

function setup(sync = true) {
  const h = new FakeHistory(sync);
  const closed: LayerKind[] = [];
  const timers: Array<() => void> = [];
  const stack = createChatHistoryStack({
    history: () => h,
    href: () => "http://x/chat",
    listen: h.listen,
    timeout: (fn) => {
      timers.push(fn);
      return () => {
        const i = timers.indexOf(fn);
        if (i >= 0) timers.splice(i, 1);
      };
    },
  });
  for (const k of ["tab", "thread", "profile", "sheet"] as const) stack.register(k, () => closed.push(k));
  stack.attach();
  return { h, stack, closed, timers };
}

test("open thread, system Back closes it once, next Back leaves the page", () => {
  const { h, stack, closed } = setup();
  stack.openThread();
  assert.equal(h.entries.length, 2);
  assert.ok(stack.has("thread"));
  h.back();
  assert.deepEqual(closed, ["thread"]);
  assert.equal(stack.depth(), 0);
  h.back(); // base state: not ours, nothing to close
  assert.deepEqual(closed, ["thread"]);
  assert.ok(h.left);
});

test("opening the same layer twice does not push twice", () => {
  const { h, stack } = setup();
  assert.equal(stack.push("thread"), true);
  assert.equal(stack.push("thread"), false);
  stack.openThread();
  assert.equal(h.entries.length, 2);
});

test("thread -> profile -> Back -> Back closes one layer each", () => {
  const { h, stack, closed } = setup();
  stack.openThread();
  stack.push("profile");
  h.back();
  assert.deepEqual(closed, ["profile"]);
  assert.ok(stack.has("thread"));
  h.back();
  assert.deepEqual(closed, ["profile", "thread"]);
  assert.equal(h.index, 0);
});

test("in-app close of the profile goes through popstate and runs the callback once", () => {
  const { h, stack, closed } = setup();
  stack.openThread();
  stack.push("profile");
  assert.equal(stack.close("profile"), true);
  assert.deepEqual(closed, ["profile"]);
  assert.equal(h.index, 1);
  assert.equal(stack.close("profile"), false); // already closed: caller closes its own UI
});

test("profile opened from a list, then Message: profile entry is replaced by the thread (no stale entry)", () => {
  const { h, stack, closed } = setup();
  stack.push("profile");
  assert.equal(h.entries.length, 2);
  stack.openThread();
  assert.equal(h.entries.length, 2); // replaced, not pushed
  assert.deepEqual(stack.top(), "thread");
  assert.deepEqual(closed, []); // UI of the replaced layer is closed by the caller, no callback
  h.back(); // close chat
  assert.deepEqual(closed, ["thread"]);
  assert.equal(h.index, 0); // next Back leaves the page: no dead press
});

test("profile opened inside a thread, then Message: only the profile layer closes", () => {
  const { h, stack, closed } = setup();
  stack.openThread();
  stack.push("profile");
  stack.openThread();
  assert.deepEqual(closed, ["profile"]);
  assert.ok(stack.has("thread"));
  assert.equal(h.index, 1);
});

test("tab layer: pushed once, Friends <-> Find people does not push again, Chats closes it, Back returns to Chats", () => {
  const { h, stack, closed } = setup();
  assert.equal(stack.push("tab"), true); // Friends
  assert.equal(stack.push("tab"), false); // Find people
  assert.equal(h.entries.length, 2);
  stack.close("tab"); // chip -> Chats
  assert.deepEqual(closed, ["tab"]);
  assert.equal(h.index, 0);
  stack.push("tab");
  h.back(); // system Back on the tab
  assert.deepEqual(closed, ["tab", "tab"]);
  h.back();
  assert.ok(h.left);
});

test("thread opened from a tab keeps the tab beneath it", () => {
  const { h, stack, closed } = setup();
  stack.push("tab");
  stack.openThread();
  assert.deepEqual(stack.depth(), 2);
  h.back();
  assert.deepEqual(closed, ["thread"]);
  assert.ok(stack.has("tab"));
  h.back();
  assert.deepEqual(closed, ["thread", "tab"]);
});

test("profile on a tab, then Message: [tab, thread]", () => {
  const { h, stack, closed } = setup();
  stack.push("tab");
  stack.push("profile");
  stack.openThread();
  assert.equal(h.entries.length, 3);
  h.back();
  assert.deepEqual(closed, ["thread"]);
  assert.ok(stack.has("tab"));
});

test("action sheet over a thread: Back closes only the sheet", () => {
  const { h, stack, closed } = setup();
  stack.openThread();
  stack.push("sheet");
  h.back();
  assert.deepEqual(closed, ["sheet"]);
  assert.ok(stack.has("thread"));
  stack.push("sheet");
  stack.close("sheet"); // Cancel / backdrop / Copy
  assert.deepEqual(closed, ["sheet", "sheet"]);
  assert.equal(h.index, 1);
});

test("programmatic close of a lower layer pops the layers above with one go(-n)", () => {
  const { h, stack, closed } = setup();
  stack.openThread();
  stack.push("profile");
  stack.push("sheet");
  let goCalls = 0;
  const orig = h.go.bind(h);
  h.go = (d: number) => {
    goCalls++;
    orig(d);
  };
  stack.close("thread");
  assert.equal(goCalls, 1);
  assert.deepEqual(closed, ["sheet", "profile", "thread"]); // top first, each once
  assert.equal(h.index, 0);
  assert.equal(stack.depth(), 0);
});

test("detach/unmount with layers open never touches history", () => {
  const { h, stack } = setup();
  const detach = stack.attach();
  stack.openThread();
  stack.push("profile");
  let touched = 0;
  const orig = h.go.bind(h);
  h.go = (d: number) => {
    touched++;
    orig(d);
  };
  detach();
  assert.equal(touched, 0);
  assert.equal(h.entries.length, 3);
});

test("StrictMode double attach does not double handle a Back", () => {
  const { h, stack, closed } = setup();
  const d1 = stack.attach();
  d1();
  stack.attach();
  stack.openThread();
  h.back();
  assert.deepEqual(closed, ["thread"]);
});

test("rapid double Back (async popstate) closes each layer exactly once", () => {
  const { h, stack, closed } = setup(false);
  stack.openThread();
  stack.push("profile");
  h.back();
  h.back();
  h.drain();
  assert.deepEqual(closed.sort(), ["profile", "thread"]);
  assert.equal(stack.depth(), 0);
  assert.equal(h.index, 0);
});

test("operations issued while our own go() is in flight wait for the popstate", () => {
  const { h, stack, closed } = setup(false);
  stack.openThread();
  stack.push("profile");
  stack.close("profile");
  stack.push("sheet"); // queued: must not be pushed before the traversal lands
  assert.equal(h.entries.length, 3);
  h.drain();
  assert.deepEqual(closed, ["profile"]);
  assert.equal(h.entries.length, 3); // thread, sheet (old profile entry truncated)
  assert.deepEqual([stack.top(), stack.depth()], ["sheet", 2]);
});

test("a close whose popstate never arrives is settled by the watchdog", () => {
  const { h, stack, closed, timers } = setup(false);
  stack.openThread();
  stack.close("thread");
  assert.deepEqual(closed, []);
  timers.forEach((t) => t());
  assert.deepEqual(closed, ["thread"]);
  h.drain();
  assert.deepEqual(closed, ["thread"]); // late popstate is ignored
});

test("popstate we did not cause (forward into a stale entry) is ignored", () => {
  const { h, stack, closed } = setup();
  stack.openThread();
  h.back();
  assert.deepEqual(closed, ["thread"]);
  h.forward(); // lands on the old thread entry; stack is empty
  assert.deepEqual(closed, ["thread"]);
  assert.equal(stack.depth(), 0);
});

test("mounting onto a stale layered entry unwinds it once so Back is not a dead press", () => {
  const h = new FakeHistory(true);
  h.pushState({ __NA: true, __chatDepth: 1 });
  const closed: LayerKind[] = [];
  const stack = createChatHistoryStack({ history: () => h, href: () => "x", listen: h.listen, timeout: () => () => undefined });
  stack.register("thread", () => closed.push("thread"));
  stack.attach();
  assert.equal(h.index, 0);
  assert.deepEqual(closed, []);
  stack.attach(); // StrictMode second attach: no second unwind
  assert.equal(h.index, 0);
});

test("pushed entries keep the existing history.state (Next.js) and add the depth marker", () => {
  const { h, stack } = setup();
  stack.openThread();
  assert.deepEqual(h.state, { __NA: true, __chatDepth: 1 });
  stack.push("profile");
  assert.deepEqual(h.state, { __NA: true, __chatDepth: 2 });
});
