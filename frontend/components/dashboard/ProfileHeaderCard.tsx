"use client";

import { useProfile } from "./ProfileProvider";
import {
  CameraIcon,
  BadgeCheckIcon,
  FlagIcon,
  PhoneIcon,
  MailIcon,
  GithubIcon,
  ExternalLinkIcon,
  GlobeIcon,
  PencilIcon,
} from "./icons";

function linkLabel(url: string) {
  return url.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

export default function ProfileHeaderCard() {
  const { profile, openDrawer } = useProfile();
  const { initials, fullName, verified, bio, school, prn, team, role, hackathonBadge, contacts } =
    profile;

  return (
    <section className="overflow-hidden rounded-2xl border border-brand-softline bg-white shadow-[0_2px_8px_rgba(91,46,16,0.04)]">
      {/* Cover Banner */}
      <div className="custom-pattern relative flex h-40 w-full items-end justify-end bg-gradient-to-r from-brand-deep via-[#6d3412] to-[#7E3B14] p-4 sm:h-44">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs font-semibold text-white/90 backdrop-blur-sm">
          <FlagIcon className="h-3.5 w-3.5" />
          {hackathonBadge}
        </span>
      </div>

      {/* Bio & Identity */}
      <div className="relative px-6 pb-6 pt-0">
        <div className="-mt-12 mb-4 flex flex-col gap-4 sm:-mt-14 md:flex-row md:items-end md:justify-between">
          {/* Avatar + Name */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="relative">
              <div className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-white bg-brand-deep text-lg font-bold tracking-wider text-white shadow-md sm:h-24 sm:w-24 sm:text-2xl">
                {initials}
              </div>
              <button
                type="button"
                className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-brand-primary text-white shadow transition-colors hover:bg-brand-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"
                aria-label="Change profile photo"
              >
                <CameraIcon className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-0.5 pt-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-bold tracking-tight text-brand-deep sm:text-2xl">{fullName}</h2>
                {verified && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-brand-approved/20 bg-brand-approved/10 px-2.5 py-0.5 text-xs font-semibold text-brand-approved">
                    <BadgeCheckIcon className="h-3.5 w-3.5" />
                    Verified
                  </span>
                )}
              </div>
              <p className="max-w-2xl text-sm font-medium leading-relaxed text-brand-muted">
                {bio}
              </p>
            </div>
          </div>

          {/* Edit Profile Button */}
          <button
            type="button"
            onClick={() => openDrawer("basic")}
            className="inline-flex items-center justify-center gap-2 self-start rounded-xl bg-brand-primary px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-brand-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary md:self-end"
          >
            <PencilIcon className="h-4 w-4" />
            Edit Profile
          </button>
        </div>

        {/* Metadata Badges */}
        <div className="flex flex-wrap items-center gap-2.5 border-b border-brand-softline pb-4 pt-2">
          <span className="inline-flex items-center gap-1.5 break-all rounded-lg border border-brand-softline bg-brand-cream px-3 py-1 text-xs font-medium text-brand-deep">
            <svg
              className="h-3.5 w-3.5 text-brand-muted"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path d="M3 21h18M5 21V10m4 11V10m6 11V10m4 11V10M2 10l10-6 10 6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {school}
          </span>
          <span className="inline-flex items-center gap-1.5 break-all rounded-lg border border-brand-softline bg-brand-cream px-3 py-1 font-mono text-xs text-brand-deep">
            <svg
              className="h-3.5 w-3.5 text-brand-muted"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            PRN: {prn}
          </span>
          <span className="inline-flex items-center gap-1.5 break-all rounded-lg border border-brand-warmBorder bg-brand-lightOrange px-3 py-1 text-xs font-semibold text-brand-primary">
            <svg
              className="h-3.5 w-3.5"
              fill="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
            </svg>
            {team} • {role}
          </span>
        </div>

        {/* Contact & Social Links */}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 pt-4 text-xs font-medium text-brand-deep">
          {contacts.phone && (
            <a
              href={`tel:${contacts.phone.replace(/\s/g, "")}`}
              className="inline-flex items-center gap-1.5 break-all transition-colors hover:text-brand-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"
            >
              <PhoneIcon className="h-4 w-4 text-brand-muted" />
              <span>{contacts.phone}</span>
            </a>
          )}
          <a
            href={`mailto:${contacts.email}`}
            className="inline-flex items-center gap-1.5 break-all transition-colors hover:text-brand-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"
          >
            <MailIcon className="h-4 w-4 text-brand-muted" />
            <span>{contacts.email}</span>
          </a>
          <a
            href={contacts.github}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 break-all transition-colors hover:text-brand-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"
          >
            <GithubIcon className="h-4 w-4 text-brand-muted" />
            <span>{linkLabel(contacts.github)}</span>
          </a>
          <a
            href={contacts.linkedin}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 break-all transition-colors hover:text-brand-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"
          >
            <ExternalLinkIcon className="h-4 w-4 text-brand-muted" />
            <span>{linkLabel(contacts.linkedin)}</span>
          </a>
          <a
            href={contacts.website}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 break-all transition-colors hover:text-brand-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"
          >
            <GlobeIcon className="h-4 w-4 text-brand-muted" />
            <span>{linkLabel(contacts.website)}</span>
          </a>
        </div>
      </div>
    </section>
  );
}
