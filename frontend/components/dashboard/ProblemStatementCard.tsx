"use client";

import { useState } from "react";
import { useTeam } from "./TeamProvider";
import { FileCodeIcon, ShieldCheckIcon, ChevronDownIcon } from "./icons";

export default function ProblemStatementCard() {
  const { team } = useTeam();
  const [expanded, setExpanded] = useState(false);
  const idea = team?.ideaSubmissions?.[0];
  const ps = team?.problemStatement ?? idea?.problemStatement;

  if (!ps) {
    return (
      <section className="rounded-2xl border border-brand-softline bg-white p-5 sm:p-6">
        <p className="text-xs font-bold uppercase tracking-widest text-brand-muted">Selected Problem Statement</p>
        <h3 className="mt-2 text-lg font-bold text-brand-deep">None locked yet</h3>
        <p className="mt-2 text-sm text-brand-muted">Browse problem statements and lock a draft idea to see it here.</p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-brand-softline bg-white p-5 shadow-[0_2px_8px_rgba(91,46,16,0.04)] sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-brand-muted">Selected Problem Statement</p>
          <p className="text-sm font-extrabold text-brand-deep">
            {ps.code} • {ps.theme}
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-approved/20 bg-brand-approved/10 px-3 py-1 text-xs font-bold text-brand-approved">
          <ShieldCheckIcon className="h-3.5 w-3.5" />
          {idea?.status ?? "selected"}
        </span>
      </div>
      <h3 className="mt-4 text-lg font-bold leading-snug text-brand-deep">{ps.title}</h3>
      <p className="mt-3 text-sm leading-relaxed text-brand-charcoal/85">{ps.description.slice(0, 280)}</p>
      {expanded ? (
        <p className="mt-3 text-sm leading-relaxed text-brand-charcoal/85">{ps.description}</p>
      ) : null}
      {idea ? (
        <p className="mt-3 text-xs text-brand-muted">
          Idea v{idea.version} · {idea.techStack}
        </p>
      ) : null}
      <button type="button" onClick={() => setExpanded((v) => !v)} className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-brand-primary">
        <FileCodeIcon className="h-4 w-4" />
        {expanded ? "Collapse" : "Read full statement"}
        <ChevronDownIcon className={`h-4 w-4 ${expanded ? "rotate-180" : ""}`} />
      </button>
    </section>
  );
}
