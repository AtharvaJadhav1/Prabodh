/** Pure rules for the "Allow notifications" banner (kept free of React/DOM so they are unit-testable). */

export const NOTIF_PROMPT_DISMISSED_KEY = "prabodh:notifPromptDismissed";

export type NotifPermission = "unsupported" | "default" | "granted" | "denied";

/** The banner only ever asks while the browser can still show its permission dialog and the user has not closed it. */
export function shouldShowNotifPrompt(permission: NotifPermission, dismissed: boolean): boolean {
  return permission === "default" && !dismissed;
}

export function readPromptDismissed(storage: Pick<Storage, "getItem"> | null): boolean {
  try {
    return storage?.getItem(NOTIF_PROMPT_DISMISSED_KEY) === "1";
  } catch {
    return false;
  }
}

/** Returns false when the choice could not be persisted (the caller then keeps it in memory for this visit). */
export function writePromptDismissed(storage: Pick<Storage, "setItem"> | null): boolean {
  try {
    if (!storage) return false;
    storage.setItem(NOTIF_PROMPT_DISMISSED_KEY, "1");
    return true;
  } catch {
    return false;
  }
}
