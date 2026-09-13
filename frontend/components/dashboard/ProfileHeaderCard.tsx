"use client";

import { useState } from "react";
import { useProfile } from "./ProfileProvider";
import ExpandableContactItem from "./ExpandableContactItem";
import AvatarPickerModal from "./AvatarPickerModal";
import Avatar from "../Avatar";
import {
  CameraIcon,
  BadgeCheckIcon,
  FlagIcon,
  MailIcon,
  GithubIcon,
  LinkedinIcon,
  PencilIcon,
} from "./icons";

function handleFromUrl(url: string, domain: string) {
  const cleaned = url.replace(/^https?:\/\//, "").replace(/^\//, "").replace(/\/$/, "");
  const prefix = `${domain}/`;
  return cleaned.toLowerCase().startsWith(prefix)
    ? `@${cleaned.slice(prefix.length)}`
    : cleaned;
}

export default function ProfileHeaderCard() {
  const { profile, openDrawer } = useProfile();
  const { fullName, verified, bio, school, team, role, contacts, avatarUrl } = profile;
  const [pickerOpen, setPickerOpen] = useState(false);

  return (
    <section className="overflow-hidden rounded-2xl border border-brand-softline bg-white shadow-[0_2px_8px_rgba(91,46,16,0.04)]">
      {/* LinkedIn-style Cover Banner */}
      <div className="relative h-36 w-full overflow-hidden bg-gradient-to-r from-[#4A2810] via-[#8C3E14] to-[#C25E26] sm:h-48">
        <svg
          className="absolute inset-0 h-full w-full opacity-20"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <defs>
            <pattern id="pbl-banner-dots" width="26" height="26" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="2" fill="white" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#pbl-banner-dots)" />
        </svg>

        <span className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/25 px-3 py-1 text-xs font-semibold text-white/90 backdrop-blur-sm">
          <FlagIcon className="h-3.5 w-3.5" />
          PRABODH
        </span>

        <button
          type="button"
          onClick={() => openDrawer("basic")}
          className="absolute bottom-3 right-3 inline-flex items-center gap-2 rounded-xl bg-white/90 px-4 py-2 text-xs font-bold text-brand-deep shadow-md backdrop-blur-sm transition-colors hover:bg-white"
        >
          <PencilIcon className="h-3.5 w-3.5" />
          Edit Profile
        </button>
      </div>

      {/* Identity */}
      <div className="relative px-6 pb-6 pt-0">
        <div className="-mt-14 flex flex-col gap-4 sm:-mt-16 md:flex-row md:items-end md:justify-between">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:gap-5">
            <div className="relative ml-6 sm:ml-0">
              <Avatar
                src={avatarUrl || null}
                seed={fullName || contacts.email || "innovator"}
                alt={fullName}
                className="h-24 w-24 border-4 border-white bg-[#FAF7F2] shadow-lg sm:h-28 sm:w-28"
              />
              <button
                type="button"
                onClick={() => setPickerOpen(true)}
                className="absolute bottom-1 right-1 flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-[#C25E26] text-white shadow-md transition-colors hover:bg-[#A84E1D] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C25E26] sm:h-10 sm:w-10"
                aria-label="Change profile photo"
              >
                <CameraIcon className="h-4 w-4 sm:h-5 sm:w-5" />
              </button>
            </div>

            <div className="space-y-1 pt-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-extrabold tracking-tight text-brand-deep sm:text-2xl">{fullName}</h2>
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
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-brand-warmBorder bg-brand-lightOrange px-3 py-1 text-xs font-semibold text-brand-primary">
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
        <div className="mt-3 flex items-center gap-2 pt-1">
          <ExpandableContactItem
            icon={<MailIcon className="h-4 w-4" />}
            label="Email Address"
            value={contacts.email}
            onCopy
          />
          <ExpandableContactItem
            icon={<GithubIcon className="h-4 w-4" />}
            label={contacts.github ? "GitHub Profile" : "Add your GitHub profile link"}
            value={contacts.github ? handleFromUrl(contacts.github, "github.com") : "empty"}
            isLink={Boolean(contacts.github)}
            href={contacts.github || undefined}
            onAction={contacts.github ? undefined : () => openDrawer("contacts")}
          />
          <ExpandableContactItem
            icon={<LinkedinIcon className="h-4 w-4" />}
            label={contacts.linkedin ? "LinkedIn Profile" : "Add your LinkedIn profile link"}
            value={contacts.linkedin ? handleFromUrl(contacts.linkedin, "linkedin.com/in") : "empty"}
            isLink={Boolean(contacts.linkedin)}
            href={contacts.linkedin || undefined}
            onAction={contacts.linkedin ? undefined : () => openDrawer("contacts")}
          />
        </div>
      </div>

      <AvatarPickerModal open={pickerOpen} onClose={() => setPickerOpen(false)} />
    </section>
  );
}