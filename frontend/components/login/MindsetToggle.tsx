"use client";

import { useState } from "react";

type Mindset = "builder" | "academic";

const academicThoughts = [
  "We don't have the full stack skills yet.",
  "Let's build a simple CRUD demo the night before submission.",
  "We just need the faculty signatures for the internal marks.",
];

const builderThoughts = [
  "Ship the prototype to real users; learn from real traffic.",
  "Weekly guidance from vetted experts in the co-pilot seat.",
  "Reach final placements with an active repo and a deployed system.",
];

export default function MindsetToggle() {
  const [mode, setMode] = useState<Mindset>("builder");

  return (
    <div className="pointer-events-none relative z-10 my-auto w-full max-w-xl">
      <div
        className="pointer-events-auto relative mx-auto grid w-full max-w-md grid-cols-2 rounded-full border border-white/15 bg-black/30 p-1 backdrop-blur-md"
        role="tablist"
        aria-label="Mindset switcher"
      >
        <span
          aria-hidden
          className={`absolute top-1 bottom-1 rounded-full bg-brand-primary/90 shadow-lg transition-all duration-300 ease-out ${
            mode === "builder" ? "left-1 right-1/2" : "left-1/2 right-1"
          }`}
        />
        <button
          type="button"
          role="tab"
          aria-selected={mode === "academic"}
          onClick={() => setMode("academic")}
          className={`relative z-10 rounded-full px-3 py-2 text-[11px] font-bold uppercase tracking-wide transition-colors duration-300 sm:text-xs ${
            mode === "academic" ? "text-white" : "text-amber-100/50 hover:text-amber-100/80"
          }`}
        >
          Academic Default
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "builder"}
          onClick={() => setMode("builder")}
          className={`relative z-10 rounded-full px-3 py-2 text-[11px] font-bold uppercase tracking-wide transition-colors duration-300 sm:text-xs ${
            mode === "builder" ? "text-white" : "text-amber-100/50 hover:text-amber-100/80"
          }`}
        >
          The Prabodh Builder
        </button>
      </div>

      <div className="relative mt-6 grid">
        <div
          className={`col-start-1 row-start-1 rounded-2xl border border-white/10 bg-black/25 p-6 backdrop-blur-md transition-all duration-500 ease-out sm:p-7 ${
            mode === "builder"
              ? "pointer-events-auto translate-y-0 opacity-100"
              : "pointer-events-none translate-y-3 opacity-0"
          } border-amber-400/40`}
        >
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-400/40 bg-emerald-400/10 px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-widest text-emerald-300">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
            Systemic Proof
          </div>
          <h3 className="font-serif text-3xl font-extrabold leading-[1.1] tracking-tight text-white xl:text-4xl">
            LAUNCH FIRST.
            <br />
            MASTER THE FLIGHT AT MACH 2.
          </h3>

          <div className="mt-5 rounded-xl border border-white/10 bg-black/20 p-4 font-mono text-[11px] leading-relaxed">
            <div className="flex flex-wrap items-center justify-between gap-1 text-brand-amber">
              <span className="font-bold">STATUS: FLIGHT DEPLOYED</span>
              <span className="text-white/60">WEEK 8 MVP</span>
            </div>
            <div className="mt-2 text-white/80">
              <span className="text-white/50">READING:</span> "HOW TO SCALE LIVE SYSTEMS"
            </div>
            <div className="mt-1 inline-block rounded bg-brand-primary/20 px-2 py-0.5 text-[10px] font-bold tracking-widest text-brand-amber">
              LIVE AT SCALE
            </div>
          </div>

          <ul className="mt-5 space-y-2.5">
            {builderThoughts.map((thought) => (
              <li key={thought} className="flex items-start gap-2.5 text-sm leading-relaxed text-amber-50/90">
                <span className="mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-emerald-400/20 text-[10px] font-bold text-emerald-300">
                  ✓
                </span>
                {thought}
              </li>
            ))}
          </ul>

          <p className="mt-5 border-t border-white/10 pt-4 text-xs font-bold uppercase tracking-widest text-white/60">
            Result: <span className="text-brand-amber">Verified capability, not just an academic transcript.</span>
          </p>
        </div>

        <div
          className={`col-start-1 row-start-1 rounded-2xl border border-white/10 bg-black/25 p-6 backdrop-blur-md transition-all duration-500 ease-out sm:p-7 ${
            mode === "academic"
              ? "translate-y-0 opacity-100"
              : "pointer-events-none translate-y-3 opacity-0"
          }`}
        >
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-widest text-stone-400">
            <span className="h-1.5 w-1.5 rounded-full bg-stone-500" />
            Comfort Zone
          </div>
          <h3 className="font-serif text-3xl font-extrabold leading-[1.1] tracking-tight text-stone-300 xl:text-4xl">
            What If We
            <br />
            Fail The Evaluation?
          </h3>

          <ul className="mt-5 space-y-2.5">
            {academicThoughts.map((thought) => (
              <li key={thought} className="flex items-start gap-2.5 text-sm leading-relaxed text-stone-400">
                <span className="mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-white/10 text-[10px] font-bold text-stone-500">
                  ✕
                </span>
                <span className="italic">{thought}</span>
              </li>
            ))}
          </ul>

          <p className="mt-5 border-t border-white/10 pt-4 text-xs font-bold uppercase tracking-widest text-stone-500">
            Result: <span className="text-stone-400">A graded report on paper, zero lines running in production.</span>
          </p>
        </div>
      </div>
    </div>
  );
}