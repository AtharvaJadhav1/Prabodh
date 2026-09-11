"use client";

import { useMentorProfile } from "./MentorProfileProvider";
import { CpuIcon, PencilIcon } from "../dashboard/icons";

export default function MentorExpertisePanel() {
  const { profile, openDrawer } = useMentorProfile();
  const { domainExpertise } = profile;

  return (
    <section className="rounded-2xl border border-brand-sand bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between border-b border-brand-sand pb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-lightOrange text-brand-primary">
            <CpuIcon className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-base font-bold text-brand-deep">Domain Expertise</h3>
            <p className="mt-0.5 text-xs text-brand-muted">
              Your specializations, research areas, and technical domains.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => openDrawer("expertise")}
          className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-brand-primary px-3.5 py-2 text-xs font-bold text-white transition-colors hover:bg-brand-hover"
        >
          <PencilIcon className="h-3.5 w-3.5" /> Edit Expertise
        </button>
      </div>

      {domainExpertise.length === 0 ? (
        <p className="mt-6 rounded-xl border border-dashed border-brand-sand bg-brand-cream p-6 text-center text-xs font-medium text-brand-muted">
          No expertise areas listed yet. Click &quot;Edit Expertise&quot; to add your first domain.
        </p>
      ) : (
        <div className="mt-4 space-y-4">
          {domainExpertise.map((item, i) => (
            <div
              key={`${item.area}-${i}`}
              className="rounded-xl border border-brand-sand bg-brand-cream/60 p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className="text-sm font-bold text-brand-deep">{item.area}</h4>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                    item.focusLevel === "Primary"
                      ? "bg-brand-lightOrange text-brand-primary"
                      : "bg-brand-sand text-brand-muted"
                  }`}
                >
                  {item.focusLevel} Focus
                </span>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-brand-muted">{item.details}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}