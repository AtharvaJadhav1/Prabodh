"use client";

import { useMentorProfile } from "./MentorProfileProvider";
import {
  BadgeCheckIcon,
  ShieldCheckIcon,
  MailIcon,
  MapPinIcon,
  HashIcon,
  BookOpenIcon,
  Share2Icon,
  LinkedinIcon,
  PencilIcon,
} from "../dashboard/icons";

export default function MentorProfileHeaderCard() {
  const { profile, openDrawer } = useMentorProfile();
  const { initials, fullName, verified, designation, department, facultyId, roleBadge, email, location, socials } = profile;

  return (
    <section className="overflow-hidden rounded-2xl border border-brand-sand bg-white shadow-sm">
      {/* Cover Banner */}
      <div className="custom-pattern relative flex h-24 w-full items-end justify-end bg-gradient-to-r from-brand-deep via-[#7E3B14] to-brand-deep-deep px-6">
        <span className="relative z-10 inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-black/30 px-3 py-1 text-xs font-semibold text-white/90 backdrop-blur-md">
          <ShieldCheckIcon className="h-3.5 w-3.5 text-brand-amber" />
          Institutional Identity Verified
        </span>
      </div>

      {/* Bio & Identity */}
      <div className="relative px-8 pb-6 pt-4">
        <div className="-mt-10 mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {/* Avatar + Name */}
          <div className="flex items-center gap-4">
            <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-2xl border-4 border-white bg-brand-deep text-xl font-black text-white shadow-md">
              {initials}
            </div>
            <div className="pt-5">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-2xl font-bold tracking-tight text-brand-deep">{fullName}</h2>
                {verified && (
                  <span className="inline-flex items-center gap-1 rounded border border-brand-approved/20 bg-brand-approved/10 px-2 py-0.5 text-[11px] font-semibold text-brand-approved">
                    <BadgeCheckIcon className="h-3.5 w-3.5" />
                    Verified Faculty
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-xs font-medium text-brand-muted">
                {designation} &bull; {department}
              </p>
            </div>
          </div>

          {/* Edit Profile Button */}
          <button
            type="button"
            onClick={() => openDrawer("basic")}
            className="inline-flex items-center gap-1.5 self-start rounded-xl bg-brand-primary px-4 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-brand-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary sm:self-auto"
          >
            <PencilIcon className="h-3.5 w-3.5" />
            Edit Profile
          </button>
        </div>

        {/* Metadata + Socials Row */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-brand-sand/70 pt-3 text-xs text-brand-muted">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-brand-sand bg-brand-cream px-3 py-1 font-mono font-medium text-brand-deep">
              <HashIcon className="h-3.5 w-3.5 text-brand-muted" />
              Faculty ID: {facultyId}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-brand-warmBorder bg-brand-lightOrange px-3 py-1 font-semibold text-brand-primary">
              <ShieldCheckIcon className="h-3.5 w-3.5" />
              {roleBadge}
            </span>
            <span className="inline-flex items-center gap-1.5 px-2 py-1">
              <MailIcon className="h-3.5 w-3.5 text-brand-primary" />
              {email}
            </span>
            <span className="inline-flex items-center gap-1.5 px-2 py-1">
              <MapPinIcon className="h-3.5 w-3.5 text-brand-primary" />
              {location}
            </span>
          </div>
          <div className="flex items-center gap-3">
            {socials.map((link, i) => (
              <span key={link.label} className="flex items-center gap-3">
                {i > 0 && <span className="text-brand-sand">&bull;</span>}
                <a
                  href={link.href}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 font-medium transition-colors hover:text-brand-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"
                >
                  {link.label === "Scholar" && <BookOpenIcon className="h-3.5 w-3.5" />}
                  {link.label === "ResearchGate" && <Share2Icon className="h-3.5 w-3.5" />}
                  {link.label === "LinkedIn" && <LinkedinIcon className="h-3.5 w-3.5" />}
                  {link.label}
                </a>
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
