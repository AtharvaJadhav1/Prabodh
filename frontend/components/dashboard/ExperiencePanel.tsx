"use client";

import { useProfile } from "./ProfileProvider";
import { BriefcaseIcon, PencilIcon } from "./icons";

export default function ExperiencePanel() {
  const { profile, openDrawer } = useProfile();
  const { experience } = profile;

  if (experience.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-brand-softline bg-white px-6 py-16 shadow-[0_2px_8px_rgba(91,46,16,0.04)]">
        <BriefcaseIcon className="mb-4 h-10 w-10 text-brand-muted/40" />
        <h3 className="text-sm font-bold text-brand-deep">No experience listed yet</h3>
        <p className="mt-1 max-w-xs text-center text-xs text-brand-muted">
          Add your first experience entry to highlight your professional background.
        </p>
        <button
          type="button"
          onClick={() => openDrawer("experience")}
          className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-brand-primary px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-brand-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"
        >
          + Add Experience
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {experience.map((exp, i) => (
        <div
          key={`${exp.title}-${i}`}
          className="rounded-2xl border border-brand-softline bg-white p-6 shadow-[0_2px_8px_rgba(91,46,16,0.04)]"
        >
          <div className="flex items-start justify-between">
            <div>
              <h4 className="text-sm font-bold text-brand-deep">{exp.title}</h4>
              <p className="text-xs font-semibold text-brand-primary">{exp.org}</p>
              <p className="mt-0.5 text-xs text-brand-muted">
                {exp.period}
                {exp.location && <span> • {exp.location}</span>}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {exp.current && (
                <span className="rounded-md bg-brand-lightOrange px-2.5 py-1 text-xs font-semibold text-brand-primary">
                  Current
                </span>
              )}
              <button
                type="button"
                onClick={() => openDrawer("experience")}
                className="inline-flex items-center gap-1 rounded-lg border border-brand-softline px-2.5 py-1 text-xs font-bold text-brand-charcoal/70 transition-colors hover:border-brand-primary/40 hover:text-brand-primary"
                aria-label={`Edit ${exp.title}`}
              >
                <PencilIcon className="h-3 w-3" /> Edit
              </button>
            </div>
          </div>
          <p className="mt-3 text-xs leading-relaxed text-brand-charcoal">{exp.description}</p>
        </div>
      ))}
    </div>
  );
}