"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Persisted "resend code" cooldown.
 *
 * Stores the wall-clock deadline (epoch ms) in localStorage so the countdown
 * keeps ticking across refreshes and duplicate tabs instead of resetting.
 * Keyed per scope+email so different flows/accounts never block each other.
 */

export const RESEND_STORAGE_PREFIX = "prabodh:otpResendUntil:";

function readDeadline(key: string): number {
  if (typeof window === "undefined") return 0;
  try {
    const raw = window.localStorage.getItem(key);
    const value = raw ? Number(raw) : 0;
    return Number.isFinite(value) ? value : 0;
  } catch {
    return 0;
  }
}

function writeDeadline(key: string, value: number) {
  try {
    window.localStorage.setItem(key, String(value));
  } catch {
    /* storage unavailable — cooldown still runs in-memory for this visit */
  }
}

function removeDeadline(key: string) {
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

/** Peek the remaining cooldown seconds for a scope without subscribing to ticks. */
export function getResendRemaining(scopeKey: string): number {
  const deadline = readDeadline(`${RESEND_STORAGE_PREFIX}${scopeKey}`);
  return Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
}

export function useResendCooldown(scopeKey: string, cooldownSec = 300) {
  const storageKey = `${RESEND_STORAGE_PREFIX}${scopeKey}`;
  const [secondsLeft, setSecondsLeft] = useState(0);
  const tickRef = useRef<number | null>(null);

  const computeRemaining = useCallback(() => {
    const deadline = readDeadline(storageKey);
    return Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
  }, [storageKey]);

  const stopTicking = useCallback(() => {
    if (tickRef.current !== null) {
      window.clearInterval(tickRef.current);
      tickRef.current = null;
    }
  }, []);

  const startTicking = useCallback(() => {
    stopTicking();
    setSecondsLeft(computeRemaining());
    tickRef.current = window.setInterval(() => {
      const remaining = computeRemaining();
      setSecondsLeft(remaining);
      if (remaining <= 0) stopTicking();
    }, 1000);
  }, [computeRemaining, stopTicking]);

  /** Restart a fresh cooldown from now (successful initial send / resend click). */
  const start = useCallback(() => {
    writeDeadline(storageKey, Date.now() + cooldownSec * 1000);
    startTicking();
  }, [cooldownSec, storageKey, startTicking]);

  /** Resume an in-progress cooldown (step entry / refresh); start fresh if expired. */
  const sync = useCallback(() => {
    if (computeRemaining() > 0) startTicking();
    else start();
  }, [computeRemaining, start, startTicking]);

  const clear = useCallback(() => {
    stopTicking();
    removeDeadline(storageKey);
    setSecondsLeft(0);
  }, [stopTicking, storageKey]);

  useEffect(() => () => stopTicking(), [stopTicking]);

  return { secondsLeft, isActive: secondsLeft > 0, start, sync, clear };
}
