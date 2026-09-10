"use client";

import { useState } from "react";
import { problemStatement } from "../../data/studentDashboard";
import {
  FileCodeIcon,
  ShieldCheckIcon,
  ChevronDownIcon,
  CodeIcon,
  BanknoteIcon,
} from "./icons";

export default function ProblemStatementCard() {
  const [expanded, setExpanded] = useState(false);

  return (
    <section className="rounded-2xl border border-brand-softline bg-white p-5 shadow-[0_2px_8px_rgba(91,46,16,0.04)] sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-deep text-white shadow-sm">
            <FileCodeIcon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-brand-muted">
              Selected Problem Statement
            </p>
            <p className="text-sm font-extrabold text-brand-deep">
              {problemStatement.code} • {problemStatement.track}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-warmBorder bg-brand-lightOrange px-3 py-1 font-mono text-xs font-bold text-brand-primary">
            {problemStatement.code}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-approved/20 bg-brand-approved/10 px-3 py-1 text-xs font-bold text-brand-approved">
            <ShieldCheckIcon className="h-3.5 w-3.5" />
            {problemStatement.status}
          </span>
        </div>
      </div>

      <h3 className="mt-4 text-lg font-bold leading-snug text-brand-deep">
        {problemStatement.title}
      </h3>

      <div className="mt-3 flex flex-wrap gap-2">
        {problemStatement.meta.map((meta, i) => (
          <span
            key={i}
            className="rounded-full border border-brand-warmBorder bg-brand-lightOrange px-3 py-1 text-xs font-medium text-brand-deep"
          >
            {meta.label}
            <span className={`ml-1.5 ${meta.tone}`}>{meta.value}</span>
          </span>
        ))}
      </div>

      <p className="mt-4 text-sm leading-relaxed text-brand-charcoal/85">{problemStatement.preview}</p>

      {expanded && (
        <div className="mt-4 space-y-3">
          {problemStatement.full.map((block, i) => (
            <div key={i} className="rounded-xl border border-brand-softline bg-brand-cream p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-brand-primary">
                {block.title}
              </p>
              <p className="mt-1.5 text-sm leading-relaxed text-brand-charcoal/85">{block.body}</p>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-brand-softline pt-4">
        <p className="flex items-center gap-1.5 text-xs font-semibold text-brand-muted">
          <CodeIcon className="h-3.5 w-3.5" /> Software-first
          <span className="text-brand-softline">•</span>
          <BanknoteIcon className="h-3.5 w-3.5" /> FinTech stack expected
        </p>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="inline-flex items-center gap-1.5 text-sm font-bold text-brand-primary transition-colors hover:text-brand-hover"
        >
          {expanded ? "Collapse full spec" : "Read full problem statement"}
          <ChevronDownIcon
            className={`h-4 w-4 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
          />
        </button>
      </div>
    </section>
  );
}