"use client";

import { useProfile } from "./ProfileProvider";
import { SparklesIcon, PencilIcon } from "./icons";

function SkillChip({ name, level, tag }: { name: string; level?: string; tag?: string }) {
  return (
    <span className="flex items-center gap-2 rounded-lg border border-brand-softline bg-brand-cream px-3.5 py-1.5 text-xs font-semibold text-brand-charcoal transition-all hover:border-brand-primary/40">
      <span>{name}</span>
      {level && (
        <span className="rounded bg-brand-approved/10 px-1.5 py-0.5 text-[10px] text-brand-approved">
          {level}
        </span>
      )}
      {tag && (
        <span className="rounded bg-brand-lightOrange px-1.5 py-0.5 text-[10px] font-bold text-brand-primary">
          {tag}
        </span>
      )}
    </span>
  );
}

export default function SkillsPanel() {
  const { profile, openDrawer } = useProfile();
  const { skills } = profile;

  return (
    <section className="space-y-6 rounded-2xl border border-brand-softline bg-white p-6 shadow-sm">
      {/* Primary Technical Skills */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-brand-primary" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-brand-muted">
              Primary Technical Skills
            </h3>
          </div>
          <button
            type="button"
            onClick={() => openDrawer("skills")}
            className="flex items-center gap-1 text-xs font-bold text-brand-primary transition-colors hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"
            aria-label="Manage primary skills"
          >
            <PencilIcon className="h-3.5 w-3.5" />
            Manage Skills
          </button>
        </div>
        <div className="flex flex-wrap gap-2.5">
          {skills.primary.map((skill) => (
            <SkillChip key={skill.name} {...skill} />
          ))}
        </div>
      </div>

      <hr className="border-brand-softline/70" />

      {/* Secondary Skills / Tools */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-brand-amber" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-brand-muted">
              Secondary Skills / Tools
            </h3>
          </div>
          <button
            type="button"
            onClick={() => openDrawer("skills")}
            className="flex items-center gap-1 text-xs font-bold text-brand-primary transition-colors hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"
            aria-label="Manage secondary skills"
          >
            <PencilIcon className="h-3.5 w-3.5" />
            Manage Tools
          </button>
        </div>
        <div className="flex flex-wrap gap-2.5">
          {skills.secondary.map((name) => (
            <span
              key={name}
              className="rounded-lg border border-brand-softline bg-brand-cream px-3.5 py-1.5 text-xs font-semibold text-brand-charcoal transition-all hover:border-brand-primary/40"
            >
              {name}
            </span>
          ))}
        </div>
      </div>

      <hr className="border-brand-softline/70" />

      {/* Hackathon Specialization & Track Fit */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-brand-deep" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-brand-muted">
            Hackathon Specialization &amp; Track Fit
          </h3>
        </div>
        <div className="flex flex-wrap gap-2.5">
          {skills.tracks.map((track) => (
            <span
              key={track}
              className="flex items-center gap-1.5 rounded-lg border border-brand-warmBorder bg-brand-lightOrange px-3.5 py-1.5 text-xs font-bold text-brand-primary"
            >
              <SparklesIcon className="h-3.5 w-3.5" />
              {track}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
