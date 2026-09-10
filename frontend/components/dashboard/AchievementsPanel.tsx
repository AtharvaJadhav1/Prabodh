"use client";

import { useProfile } from "./ProfileProvider";
import { TrophyIcon, AwardIcon, CodeIcon, PencilIcon } from "./icons";

const achievementIcons = [AwardIcon, CodeIcon];

export default function AchievementsPanel() {
  const { profile, openDrawer } = useProfile();
  const { achievements } = profile;

  if (achievements.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-brand-softline bg-white px-6 py-16 shadow-[0_2px_8px_rgba(91,46,16,0.04)]">
        <TrophyIcon className="mb-4 h-10 w-10 text-brand-muted/40" />
        <h3 className="text-sm font-bold text-brand-deep">No achievements yet</h3>
        <p className="mt-1 max-w-xs text-center text-xs text-brand-muted">
          Your first milestone will appear here.
        </p>
        <button
          type="button"
          onClick={() => openDrawer("achievements")}
          className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-brand-primary px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-brand-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"
        >
          + Add Achievement
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-brand-softline bg-white p-6 shadow-[0_2px_8px_rgba(91,46,16,0.04)]">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {achievements.map((item, i) => {
          const Icon = achievementIcons[i % achievementIcons.length];
          return (
            <div
              key={`${item.title}-${i}`}
              className="space-y-1.5 rounded-xl border border-brand-softline bg-brand-cream p-4"
            >
              <div className="flex items-center justify-between gap-2 text-brand-primary">
                <div className="flex items-center gap-2">
                  <Icon className="h-5 w-5" />
                  <span className="text-sm font-bold">{item.title}</span>
                </div>
                <button
                  type="button"
                  onClick={() => openDrawer("achievements")}
                  className="inline-flex items-center gap-1 rounded-lg border border-brand-softline px-2 py-1 text-[11px] font-bold text-brand-charcoal/70 transition-colors hover:border-brand-primary/40 hover:text-brand-primary"
                  aria-label={`Edit ${item.title}`}
                >
                  <PencilIcon className="h-3 w-3" /> Edit
                </button>
              </div>
              <p className="text-xs leading-relaxed text-brand-muted">{item.description}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}