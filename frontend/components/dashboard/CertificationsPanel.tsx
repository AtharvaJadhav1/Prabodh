"use client";

import { useProfile } from "./ProfileProvider";
import { BadgeCheckIcon, AwardIcon, PencilIcon } from "./icons";

export default function CertificationsPanel() {
  const { profile, openDrawer } = useProfile();
  const { certifications } = profile;

  if (certifications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-brand-softline bg-white px-6 py-16 shadow-[0_2px_8px_rgba(91,46,16,0.04)]">
        <BadgeCheckIcon className="mb-4 h-10 w-10 text-brand-muted/40" />
        <h3 className="text-sm font-bold text-brand-deep">No certifications yet</h3>
        <p className="mt-1 max-w-xs text-center text-xs text-brand-muted">
          Add your first certification to strengthen your profile.
        </p>
        <button
          type="button"
          onClick={() => openDrawer("certifications")}
          className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-brand-primary px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-brand-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"
        >
          + Add Certification
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-brand-softline bg-white p-6 shadow-[0_2px_8px_rgba(91,46,16,0.04)]">
      <div className="divide-y divide-brand-softline/70">
        {certifications.map((cert, i) => (
          <div key={`${cert.name}-${i}`} className="flex items-center justify-between py-3 first:pt-0">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-brand-softline bg-brand-cream text-brand-deep">
                <AwardIcon className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-brand-deep">{cert.name}</h4>
                <p className="text-xs text-brand-muted">
                  {cert.issuer}
                  {cert.credential && (
                    <span>
                      {" "}
                      • Credential ID:{" "}
                      <span className="font-mono">{cert.credential}</span>
                    </span>
                  )}
                  {cert.date && <span> • Issued {cert.date}</span>}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {cert.verified && (
                <span className="rounded-full bg-brand-approved/10 px-2.5 py-1 text-xs font-semibold text-brand-approved">
                  Verified
                </span>
              )}
              <button
                type="button"
                onClick={() => openDrawer("certifications")}
                className="inline-flex items-center gap-1 rounded-lg border border-brand-softline px-2.5 py-1 text-xs font-bold text-brand-charcoal/70 transition-colors hover:border-brand-primary/40 hover:text-brand-primary"
                aria-label={`Edit ${cert.name}`}
              >
                <PencilIcon className="h-3 w-3" /> Edit
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}