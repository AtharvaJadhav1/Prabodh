// Run: ../backend/node_modules/.bin/tsx --test lib/notification-prompt.test.ts   (from frontend/)
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  NOTIF_PROMPT_DISMISSED_KEY,
  readPromptDismissed,
  shouldShowNotifPrompt,
  writePromptDismissed,
} from "./notification-prompt";

test("banner shows only for undecided permission that was not dismissed", () => {
  assert.equal(shouldShowNotifPrompt("default", false), true);
  assert.equal(shouldShowNotifPrompt("default", true), false);
  for (const p of ["granted", "denied", "unsupported"] as const) {
    assert.equal(shouldShowNotifPrompt(p, false), false);
  }
});

test("dismissal round-trips through storage and tolerates a missing or throwing storage", () => {
  const data = new Map<string, string>();
  const storage = {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
  };
  assert.equal(readPromptDismissed(storage), false);
  assert.equal(writePromptDismissed(storage), true);
  assert.equal(data.get(NOTIF_PROMPT_DISMISSED_KEY), "1");
  assert.equal(readPromptDismissed(storage), true);

  const broken = {
    getItem: () => {
      throw new Error("blocked");
    },
    setItem: () => {
      throw new Error("blocked");
    },
  };
  assert.equal(readPromptDismissed(broken), false);
  assert.equal(writePromptDismissed(broken), false);
  assert.equal(readPromptDismissed(null), false);
  assert.equal(writePromptDismissed(null), false);
});
