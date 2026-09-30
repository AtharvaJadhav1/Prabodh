"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { ArrowRightIcon, CheckIcon, XIcon } from "../dashboard/icons";

export type SpotlightTourStep = {
  targetId: string;
  title: string;
  body: ReactNode;
  cta: string;
};

type Rect = { x: number; y: number; width: number; height: number };
type Side = "right" | "left" | "bottom" | "top";
type Spotlight = { rect: Rect; vw: number; vh: number };
type Band = { key: string; left: number; top: number; width: number; height: number };
type Layout = {
  left: number;
  top: number;
  side: Side;
  arrowLeft: number;
  arrowTop: number;
};

const ARROW = 14;
const GAP = 22;
const EDGE = 16;
const SPOTLIGHT_PAD = 8;
const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function blurFade(reduceMotion: boolean | null) {
  return {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: reduceMotion ? 0 : 0.25 },
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), Math.max(min, max));
}

function computeLayout(rect: Rect, cardW: number, cardH: number, vw: number, vh: number): Layout {
  const side: Side = rect.x + rect.width + GAP + cardW + EDGE <= vw
    ? "right"
    : rect.x - GAP - cardW - EDGE >= 0
      ? "left"
      : rect.y + rect.height + GAP + cardH + EDGE <= vh
        ? "bottom"
        : "top";

  const width = Math.min(cardW, vw - EDGE * 2);

  let left =
    side === "right"
      ? rect.x + rect.width + GAP
      : side === "left"
        ? rect.x - GAP - width
        : rect.x + rect.width / 2 - width / 2;

  let top =
    side === "bottom"
      ? rect.y + rect.height + GAP
      : side === "top"
        ? rect.y - GAP - cardH
        : rect.y + rect.height / 2 - cardH / 2;

  left = clamp(left, EDGE, vw - width - EDGE);
  top = clamp(top, EDGE, vh - cardH - EDGE);

  const horizontal = side === "right" || side === "left";
  return {
    left,
    top,
    side,
    arrowLeft: horizontal
      ? side === "right"
        ? -ARROW
        : width
      : clamp(rect.x + rect.width / 2 - left - ARROW / 2, 20, Math.max(20, width - ARROW - 20)),
    arrowTop: horizontal
      ? clamp(rect.y + rect.height / 2 - top - ARROW / 2, 20, Math.max(20, cardH - ARROW - 20))
      : side === "bottom"
        ? -ARROW
        : cardH,
  };
}

const ARROW_PATHS: Record<Side, string> = {
  right: "M0 7 L14 0 L14 14 Z",
  left: "M14 7 L0 0 L0 14 Z",
  bottom: "M7 0 L14 14 L0 14 Z",
  top: "M7 14 L0 0 L14 0 Z",
};

const NUDGE: Record<Side, { x: number; y: number }> = {
  right: { x: -4, y: 0 },
  left: { x: 4, y: 0 },
  bottom: { x: 0, y: -4 },
  top: { x: 0, y: 4 },
};

type Props = {
  open: boolean;
  finish: () => void;
  steps: SpotlightTourStep[];
  presentationKey: string;
};

export default function SpotlightTour({ open, finish, steps, presentationKey }: Props) {
  const reduceMotion = useReducedMotion();
  const maskId = `tour-spotlight-${useId().replace(/:/g, "")}`;
  const titleId = `${presentationKey}-title`;
  const descId = `${presentationKey}-desc`;

  const [step, setStep] = useState(0);
  const [spot, setSpot] = useState<Spotlight | null>(null);
  const [layout, setLayout] = useState<Layout | null>(null);

  const cardRef = useRef<HTMLDivElement>(null);
  const stepRef = useRef(0);
  stepRef.current = step;
  const stepsRef = useRef(steps);
  stepsRef.current = steps;
  const active = steps[step];

  const sync = useCallback(() => {
    if (typeof document === "undefined") return;
    const current = stepsRef.current[stepRef.current];
    if (!current) return;
    const el = document.getElementById(current.targetId);
    if (!el) {
      setSpot(null);
      setLayout(null);
      return;
    }
    const box = el.getBoundingClientRect();
    const next: Rect = { x: box.left, y: box.top, width: box.width, height: box.height };
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    setSpot({ rect: next, vw, vh });

    const card = cardRef.current;
    if (!card) return;
    setLayout(computeLayout(next, card.offsetWidth, card.offsetHeight, vw, vh));
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    sync();
    window.addEventListener("resize", sync);
    window.addEventListener("scroll", sync, true);
    return () => {
      window.removeEventListener("resize", sync);
      window.removeEventListener("scroll", sync, true);
    };
  }, [open, step, sync]);

  useEffect(() => {
    if (!open) return;
    const targetId = steps[step]?.targetId;
    const id = window.setTimeout(() => {
      if (targetId) document.getElementById(targetId)?.scrollIntoView({ block: "center", behavior: "smooth" });
    }, 60);
    return () => window.clearTimeout(id);
  }, [open, step, steps]);

  useEffect(() => {
    if (!open || spot) return;
    const id = window.setInterval(sync, 150);
    return () => window.clearInterval(id);
  }, [open, spot, sync]);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    cardRef.current?.focus({ preventScroll: true });
  }, [open, step]);

  useEffect(() => {
    if (!open) {
      setStep(0);
      setSpot(null);
      setLayout(null);
    }
  }, [open]);

  const goNext = useCallback(() => {
    if (stepRef.current >= stepsRef.current.length - 1) {
      finish();
      return;
    }
    setStep((s) => s + 1);
  }, [finish]);

  const goBack = useCallback(() => setStep((s) => Math.max(0, s - 1)), []);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        finish();
        return;
      }
      if (event.key !== "Tab") return;
      const card = cardRef.current;
      if (!card) return;
      const nodes = Array.from(card.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null,
      );
      if (!nodes.length) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [open, finish]);

  const isLast = step === steps.length - 1;
  const rect = spot?.rect ?? null;

  const { hole, bands } = useMemo<{ hole: Rect | null; bands: Band[] | null }>(() => {
    if (!spot) return { hole: null, bands: null };
    const { vw, vh } = spot;
    const x = clamp(spot.rect.x - SPOTLIGHT_PAD, 0, vw);
    const y = clamp(spot.rect.y - SPOTLIGHT_PAD, 0, vh);
    const right = Math.min(x + spot.rect.width + SPOTLIGHT_PAD * 2, vw);
    const bottom = Math.min(y + spot.rect.height + SPOTLIGHT_PAD * 2, vh);
    const cut: Rect = { x, y, width: right - x, height: bottom - y };
    return {
      hole: cut,
      bands: [
        { key: "top", left: 0, top: 0, width: vw, height: y },
        { key: "bottom", left: 0, top: bottom, width: vw, height: Math.max(0, vh - bottom) },
        { key: "left", left: 0, top: y, width: x, height: Math.max(0, bottom - y) },
        { key: "right", left: right, top: y, width: Math.max(0, vw - right), height: Math.max(0, bottom - y) },
      ],
    };
  }, [spot]);

  const ring =
    open && rect
      ? {
          left: rect.x - SPOTLIGHT_PAD,
          top: rect.y - SPOTLIGHT_PAD,
          width: rect.width + SPOTLIGHT_PAD * 2,
          height: rect.height + SPOTLIGHT_PAD * 2,
        }
      : null;

  return (
    <AnimatePresence>
      {open && active ? (
        <div key={presentationKey} className="fixed inset-0 z-50" role="presentation">
          {bands
            ? bands.map((band) => (
                <motion.div
                  key={`blur-${band.key}`}
                  {...blurFade(reduceMotion)}
                  className="pointer-events-none fixed backdrop-blur-[3px]"
                  style={{ left: band.left, top: band.top, width: band.width, height: band.height }}
                />
              ))
            : (
              <motion.div
                key="blur"
                {...blurFade(reduceMotion)}
                className="pointer-events-none fixed inset-0 backdrop-blur-[3px]"
              />
            )}
          <motion.svg
            key="scrim"
            className="pointer-events-none fixed inset-0 h-full w-full"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.25 }}
            aria-hidden="true"
          >
            <defs>
              <mask id={maskId}>
                <rect x="0" y="0" width="100%" height="100%" fill="#ffffff" />
                {hole ? (
                  <rect x={hole.x} y={hole.y} width={hole.width} height={hole.height} rx={16} fill="#000000" />
                ) : null}
              </mask>
            </defs>
            <rect x="0" y="0" width="100%" height="100%" fill="rgba(43,37,35,0.62)" mask={`url(#${maskId})`} />
          </motion.svg>

          <motion.div
            key="blocker"
            className="fixed inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.2 }}
            onClick={(event) => event.preventDefault()}
            aria-hidden="true"
          />

          {ring ? (
            <motion.div
              key={`ring-${step}`}
              className="pointer-events-none fixed z-[53] rounded-[16px] border-2 border-brand-primary shadow-[0_0_0_4px_rgba(217,107,39,0.18),0_10px_36px_rgba(217,107,39,0.35)]"
              style={ring}
              initial={{ opacity: 0, scale: 0.94 }}
              animate={
                reduceMotion ? { opacity: 1, scale: 1 } : { opacity: 1, scale: [1, 1.015, 1] }
              }
              exit={{ opacity: 0, scale: 0.96 }}
              transition={
                reduceMotion
                  ? { duration: 0.2 }
                  : { opacity: { duration: 0.2 }, scale: { duration: 1.8, repeat: Infinity, ease: "easeInOut" } }
              }
              aria-hidden="true"
            />
          ) : null}

          <motion.div
            key={`card-${step}`}
            ref={cardRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={descId}
            tabIndex={-1}
            className="fixed z-[60] w-[min(344px,calc(100vw-32px))] rounded-2xl border border-brand-warmBorder bg-brand-frost p-5 shadow-[0_18px_48px_rgba(43,37,35,0.28)] outline-none"
            style={{
              left: layout?.left ?? 0,
              top: layout?.top ?? 0,
              opacity: layout ? 1 : 0,
            }}
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: layout ? 1 : 0, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 6 }}
            transition={{ duration: reduceMotion ? 0 : 0.25, ease: "easeOut" }}
          >
            {layout ? (
              <motion.span
                className="pointer-events-none absolute"
                style={{ left: layout.arrowLeft, top: layout.arrowTop }}
                animate={reduceMotion ? undefined : NUDGE[layout.side]}
                transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
                aria-hidden="true"
              >
                <svg width={ARROW} height={ARROW} viewBox="0 0 14 14" className="block">
                  <path d={ARROW_PATHS[layout.side]} fill="#FDF7F2" stroke="#F6D5BD" strokeWidth={1} />
                </svg>
              </motion.span>
            ) : null}

            <div className="flex items-start justify-between gap-3">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-primary/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-brand-primary">
                Step {step + 1} of {steps.length}
              </span>
              <button
                type="button"
                onClick={finish}
                className="-mr-1 -mt-1 rounded-lg p-1.5 text-brand-muted transition-colors hover:bg-brand-lightOrange hover:text-brand-deep"
                aria-label="Skip walkthrough"
              >
                <XIcon className="h-4 w-4" />
              </button>
            </div>

            <h2 id={titleId} className="mt-3 text-base font-bold leading-snug text-brand-deep">
              {active.title}
            </h2>
            <p id={descId} className="mt-2 text-sm leading-relaxed text-brand-muted">
              {active.body}
            </p>

            <div className="mt-3 flex items-center gap-1.5" aria-hidden="true">
              {steps.map((item, index) => (
                <span
                  key={item.targetId}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    index === step ? "w-6 bg-brand-primary" : "w-1.5 bg-brand-sand"
                  }`}
                />
              ))}
            </div>

            <div className="mt-4 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={finish}
                className="rounded-xl px-3 py-2 text-xs font-bold text-brand-muted transition-colors hover:bg-brand-cream hover:text-brand-deep"
              >
                Skip
              </button>
              <div className="flex items-center gap-2">
                {step > 0 ? (
                  <button
                    type="button"
                    onClick={goBack}
                    className="rounded-xl border border-brand-softline px-3.5 py-2 text-xs font-bold text-brand-deep transition-colors hover:border-brand-primary/40 hover:text-brand-primary"
                  >
                    Back
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={goNext}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-brand-primary px-4 py-2 text-xs font-bold text-white shadow-md shadow-brand-primary/25 transition-all duration-150 hover:bg-brand-hover active:scale-[0.99]"
                >
                  {isLast ? <CheckIcon className="h-3.5 w-3.5" /> : null}
                  {active.cta}
                  {isLast ? null : <ArrowRightIcon className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}
