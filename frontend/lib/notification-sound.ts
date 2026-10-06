"use client";

import { useSyncExternalStore } from "react";
import { createSoundGate } from "./notification-core";

/**
 * WhatsApp-Web-style notification sounds synthesised with the Web Audio API (no asset files).
 * Every entry point is safe to call anywhere: it never throws and silently does nothing when audio
 * is unavailable, still locked by the browser's autoplay policy, or muted by the user.
 */

export type SoundKind = "notification" | "message";

const STORAGE_KEY = "prabodh:notifSound";
const VOLUME = 0.25;
const RESUME_GRACE_MS = 1500;

type AudioCtor = typeof AudioContext;
type WindowWithWebkit = Window & { webkitAudioContext?: AudioCtor };

const gate = createSoundGate(800);
let ctx: AudioContext | null = null;
let unlockInstalled = false;

function audioCtor(): AudioCtor | null {
  if (typeof window === "undefined") return null;
  return window.AudioContext ?? (window as WindowWithWebkit).webkitAudioContext ?? null;
}

function getContext(): AudioContext | null {
  if (ctx) return ctx;
  const Ctor = audioCtor();
  if (!Ctor) return null;
  try {
    ctx = new Ctor();
  } catch {
    ctx = null;
  }
  return ctx;
}

/** Unlock the AudioContext on the first user gesture (browsers refuse audio before one). */
export function installAudioUnlock(): void {
  if (unlockInstalled || typeof window === "undefined") return;
  unlockInstalled = true;
  const events = ["pointerdown", "keydown", "touchstart"] as const;
  const cleanup = () => events.forEach((e) => window.removeEventListener(e, unlock, true));
  function unlock() {
    const c = getContext();
    if (!c) {
      cleanup();
      return;
    }
    if (c.state === "running") {
      cleanup();
      return;
    }
    try {
      void c
        .resume()
        .then(() => {
          if (c.state === "running") cleanup();
        })
        .catch(() => undefined);
    } catch {
      /* ignore */
    }
  }
  events.forEach((e) => window.addEventListener(e, unlock, { capture: true, passive: true }));
}

/** One soft note: sine fundamental plus a quiet triangle overtone, gentle attack and exponential decay. */
function note(c: AudioContext, out: AudioNode, freq: number, start: number, dur: number, peak: number) {
  const env = c.createGain();
  env.gain.setValueAtTime(0.0001, start);
  env.gain.linearRampToValueAtTime(peak, start + 0.012);
  env.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  env.connect(out);

  const fundamental = c.createOscillator();
  fundamental.type = "sine";
  fundamental.frequency.setValueAtTime(freq, start);
  fundamental.connect(env);
  fundamental.start(start);
  fundamental.stop(start + dur + 0.02);

  const overtone = c.createOscillator();
  const overtoneGain = c.createGain();
  overtone.type = "triangle";
  overtone.frequency.setValueAtTime(freq * 2, start);
  overtoneGain.gain.setValueAtTime(0.22, start);
  overtone.connect(overtoneGain);
  overtoneGain.connect(env);
  overtone.start(start);
  overtone.stop(start + dur + 0.02);
}

function schedule(c: AudioContext, kind: SoundKind) {
  const master = c.createGain();
  master.gain.value = VOLUME;
  master.connect(c.destination);
  const t = c.currentTime + 0.02;
  if (kind === "notification") {
    // Two quick ascending notes (G5 -> C6), ~350ms in total.
    note(c, master, 783.99, t, 0.16, 0.9);
    note(c, master, 1046.5, t + 0.13, 0.22, 1);
  } else {
    // Softer single "pop" for incoming chat messages (~120ms), dipping slightly in pitch.
    const env = c.createGain();
    env.gain.setValueAtTime(0.0001, t);
    env.gain.linearRampToValueAtTime(0.7, t + 0.008);
    env.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
    env.connect(master);
    const osc = c.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, t);
    osc.frequency.exponentialRampToValueAtTime(587.33, t + 0.1);
    osc.connect(env);
    osc.start(t);
    osc.stop(t + 0.14);
  }
}

// ---- mute preference (localStorage, default on) ----

const listeners = new Set<() => void>();
let cachedEnabled: boolean | null = null;

function readEnabled(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) !== "off";
  } catch {
    return true;
  }
}

export function isSoundEnabled(): boolean {
  if (typeof window === "undefined") return true;
  if (cachedEnabled === null) cachedEnabled = readEnabled();
  return cachedEnabled;
}

export function setSoundEnabled(on: boolean): void {
  cachedEnabled = on;
  try {
    window.localStorage.setItem(STORAGE_KEY, on ? "on" : "off");
  } catch {
    /* storage blocked: keep the in-memory preference */
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) {
      cachedEnabled = readEnabled();
      listener();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function useSoundEnabled(): boolean {
  return useSyncExternalStore(subscribe, isSoundEnabled, () => true);
}

/** Play a sound unless muted, coalesced (max one per ~800ms), blocked or unsupported. Returns whether it was attempted. */
export function playNotificationSound(kind: SoundKind): boolean {
  try {
    if (!isSoundEnabled()) return false;
    const c = getContext();
    if (!c) return false;
    if (!gate.tryPass()) return false;
    if (c.state === "running") {
      schedule(c, kind);
      return true;
    }
    // Suspended (autoplay policy): only play if the resume lands right away, never a stale sound later.
    const requestedAt = Date.now();
    void c
      .resume()
      .then(() => {
        if (c.state === "running" && Date.now() - requestedAt < RESUME_GRACE_MS) schedule(c, kind);
      })
      .catch(() => undefined);
    return true;
  } catch {
    return false;
  }
}
