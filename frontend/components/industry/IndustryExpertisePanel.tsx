"use client";

import Link from "next/link";
import { useIndustryProfile } from "./IndustryProfileProvider";
import { CpuIcon, PencilIcon, LandmarkIcon, BriefcaseIcon, LinkedinIcon } from "../dashboard/icons";

export default function IndustryExpertisePanel() {
  const { profile, openDrawer } = useIndustryProfile();
  const { domainExpertise, coreSkills, designation, company, experienceYears, linkedinUrl } = profile;

  return (
    <div className="space-y-6">
      {/* Primary Domain */}
      <section className="rounded-2xl border border-brand-sand bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between border-b border-brand-sand pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-lightOrange text-brand-primary">
              <CpuIcon className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-brand-deep">Primary Domains</h3>
              <p className="mt-0.5 text-xs text-brand-muted">Specialized fields you mentor and advise on.</p>
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
            No domains listed yet. Click &quot;Edit Expertise&quot; to add your first domain.
          </p>
        ) : (
          <div className="mt-5 flex flex-wrap gap-2">
            {domainExpertise.map((domain) => (
              <span
                key={domain}
                className="inline-flex items-center gap-1.5 rounded-lg border border-brand-primary/20 bg-brand-lightOrange px-3 py-1.5 text-xs font-semibold text-brand-primary"
              >
                <CpuIcon className="h-3.5 w-3.5" />
                {domain}
              </span>
            ))}
          </div>
        )}
      </section>

      {/* Core Skills / Tech Stack */}
      <section className="rounded-2xl border border-brand-sand bg-white p-6 shadow-sm">
        <div className="border-b border-brand-sand pb-4">
          <h3 className="text-base font-bold text-brand-deep">Core Skills / Tech Stack</h3>
          <p className="mt-0.5 text-xs text-brand-muted">Technologies and capabilities you advise on.</p>
        </div>
        {coreSkills.length === 0 ? (
          <p className="mt-6 rounded-xl border border-dashed border-brand-sand bg-brand-cream p-6 text-center text-xs font-medium text-brand-muted">
            No skill tags added yet. Edit your expertise to list your tech stack.
          </p>
        ) : (
          <div className="mt-5 flex flex-wrap gap-2">
            {coreSkills.map((skill) => (
              <span
                key={skill}
                className="rounded-full border border-brand-sand bg-brand-cream px-3 py-1 text-xs font-medium text-brand-deep"
              >
                {skill}
              </span>
            ))}
          </div>
        )}
      </section>

      {/* Company / Professional Background */}
      <section className="rounded-2xl border border-brand-sand bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2.5 border-b border-brand-sand pb-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-brand-softline bg-brand-canvas text-brand-deep">
            <LandmarkIcon className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-base font-bold text-brand-deep">Company &amp; Professional Background</h3>
            <p className="mt-0.5 text-xs text-brand-muted">Current role and organization.</p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-brand-sand bg-brand-cream/60 p-4">
            <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-brand-muted">
              <BriefcaseIcon className="h-3.5 w-3.5" /> Designation
            </p>
            <p className="mt-1.5 text-sm font-bold text-brand-deep">{designation || "—"}</p>
          </div>
          <div className="rounded-xl border border-brand-sand bg-brand-cream/60 p-4">
            <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-brand-muted">
              <LandmarkIcon className="h-3.5 w-3.5" /> Organization
            </p>
            <p className="mt-1.5 text-sm font-bold text-brand-deep">{company || "—"}</p>
          </div>
          <div className="rounded-xl border border-brand-sand bg-brand-cream/60 p-4">
            <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-brand-muted">
              <BriefcaseIcon className="h-3.5 w-3.5" /> Industry Experience
            </p>
            <p className="mt-1.5 text-sm font-bold text-brand-deep">
              {experienceYears ? `${experienceYears} years` : "—"}
            </p>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between rounded-xl border border-brand-sand bg-brand-cream/60 p-4">
          <p className="text-[11px] font-bold uppercase tracking-wider text-brand-muted">LinkedIn Profile</p>
          {linkedinUrl ? (
            <Link
              href={linkedinUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-primary transition-colors hover:text-brand-hover"
            >
              <LinkedinIcon className="h-3.5 w-3.5" />
              {linkedinUrl.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")}
            </Link>
          ) : (
            <span className="text-xs font-medium text-brand-muted">Not linked</span>
          )}
        </div>
      </section>
    </div>
  );
}