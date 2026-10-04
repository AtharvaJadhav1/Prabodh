"use client";

import { useMentorProfile } from "./MentorProfileProvider";
import ExpandableContactItem from "../dashboard/ExpandableContactItem";
import { handleFromUrl, isHttpUrl, normalizeExternalUrl } from "../../lib/url";
import {
  HashIcon,
  ShieldCheckIcon,
  MailIcon,
  MapPinIcon,
  BookOpenIcon,
  Share2Icon,
  LinkedinIcon,
  PencilIcon,
} from "../dashboard/icons";

export default function MentorProfileHeaderCard() {
  const { profile, openDrawer } = useMentorProfile();
  const { initials, fullName, designation, department, facultyId, roleBadge, email, location, linkedinUrl, socials } =
    profile;

  const linkedinHref = normalizeExternalUrl(linkedinUrl);
  const hasLinkedin = Boolean(linkedinHref) && isHttpUrl(linkedinHref);
  // The dedicated LinkedIn field above owns LinkedIn now, so a leftover entry in the generic
  // link list would otherwise render a second icon beside it.
  const otherSocials = socials.filter((link) => link.label.trim().toLowerCase() !== "linkedin");

  return (
    <section className="rounded-2xl border border-brand-sand bg-white shadow-sm">
      {/* Cover Banner */}
      <div className="custom-pattern relative flex h-24 w-full items-end justify-end rounded-t-2xl bg-gradient-to-r from-brand-deep via-[#7E3B14] to-brand-deep-deep px-6" />

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
            <ExpandableContactItem
              icon={<HashIcon className="h-4 w-4" />}
              label="Faculty ID (click to copy)"
              value={facultyId}
              onCopy
            />
            <ExpandableContactItem
              icon={<ShieldCheckIcon className="h-4 w-4" />}
              label="Designated Internal Faculty Guide"
              value={roleBadge}
            />
            <ExpandableContactItem
              icon={<MailIcon className="h-4 w-4" />}
              label="Institutional Academic Email (click to copy)"
              value={email}
              onCopy
            />
            <ExpandableContactItem
              icon={<MapPinIcon className="h-4 w-4" />}
              label="Department Office / Cabin Location"
              value={location || "empty"}
              onAction={location ? undefined : () => openDrawer("basic")}
            />
            <ExpandableContactItem
              icon={<LinkedinIcon className="h-4 w-4" />}
              label={hasLinkedin ? "LinkedIn Profile" : "Add your LinkedIn profile link"}
              value={hasLinkedin ? handleFromUrl(linkedinHref, "linkedin.com/in") : "empty"}
              isLink={hasLinkedin}
              href={hasLinkedin ? linkedinHref : undefined}
              onAction={hasLinkedin ? undefined : () => openDrawer("socials")}
            />
          </div>
          <div className="flex items-center gap-3">
            {otherSocials.map((link, i) => (
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