"use client";

import { useState } from "react";
import { useMentorProfile } from "./MentorProfileProvider";
import { useAuth } from "../auth/AuthProvider";
import { apiPatch } from "../../lib/api";
import Avatar from "../Avatar";
import AvatarPickerModal from "../dashboard/AvatarPickerModal";
import { WAVES_PRESET_LIST, buildWavesAvatarUrl, resolveMentorAvatarUrl } from "../../lib/mentorAvatar";
import ExpandableContactItem from "../dashboard/ExpandableContactItem";
import { handleFromUrl, isHttpUrl, isLinkedinSocial, normalizeExternalUrl, socialHref } from "../../lib/url";
import {
  HashIcon,
  ShieldCheckIcon,
  MailIcon,
  MapPinIcon,
  BookOpenIcon,
  Share2Icon,
  LinkedinIcon,
  PencilIcon,
  CameraIcon,
} from "../dashboard/icons";

export default function MentorProfileHeaderCard() {
  const { profile, openDrawer } = useMentorProfile();
  const { session, refreshMe } = useAuth();
  const { fullName, designation, department, facultyId, roleBadge, email, location, linkedinUrl, socials } = profile;
  const [pickerOpen, setPickerOpen] = useState(false);

  const saveAvatar = async (avatarUrl: string) => {
    await apiPatch("/me", { profileJson: { avatarUrl } });
    await refreshMe();
  };

  const linkedinHref = normalizeExternalUrl(linkedinUrl);
  const hasLinkedin = Boolean(linkedinHref) && isHttpUrl(linkedinHref);
  // The dedicated LinkedIn field above owns LinkedIn now, so a leftover entry in the generic
  // link list would otherwise render a second icon beside it.
  const otherSocials = socials.filter((link) => !isLinkedinSocial(link));

  return (
    <section className="rounded-2xl border border-brand-sand bg-white shadow-sm">
      {/* Cover Banner */}
      <div className="custom-pattern relative flex h-24 w-full items-end justify-end rounded-t-2xl bg-gradient-to-r from-brand-deep via-[#7E3B14] to-brand-deep-deep px-6" />

      {/* Bio & Identity */}
      <div className="relative px-8 max-sm:px-4 pb-6 pt-4">
        <div className="-mt-10 mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {/* Avatar + Name */}
          <div className="flex min-w-0 items-center gap-4">
            <div className="relative shrink-0">
              <Avatar
                src={resolveMentorAvatarUrl("INSTITUTE", { profileJson: session?.profileJson, email, fullName })}
                seed={fullName}
                className="h-20 w-20 rounded-2xl border-4 border-white shadow-md"
              />
              <button
                type="button"
                onClick={() => setPickerOpen(true)}
                className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-brand-primary text-white shadow-md transition-colors hover:bg-brand-hover"
                aria-label="Change profile photo"
              >
                <CameraIcon className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="min-w-0 pt-5">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="min-w-0 break-words text-xl font-bold tracking-tight text-brand-deep sm:text-2xl">{fullName}</h2>
              </div>
              <p className="mt-0.5 break-words text-xs font-medium text-brand-muted">
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
          <div className="flex flex-wrap items-center gap-3">
            {otherSocials.map((link, i) => {
              const target = socialHref(link);
              const content = (
                <>
                  {link.label === "Scholar" && <BookOpenIcon className="h-3.5 w-3.5" />}
                  {link.label === "ResearchGate" && <Share2Icon className="h-3.5 w-3.5" />}
                  {link.label}
                </>
              );
              return (
                <span key={`${link.label}-${i}`} className="flex items-center gap-3">
                  {i > 0 && <span className="text-brand-sand">&bull;</span>}
                  {target ? (
                    <a
                      href={target}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-medium transition-colors hover:text-brand-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"
                    >
                      {content}
                    </a>
                  ) : (
                    // No usable address: show the text, never a link that reloads this page.
                    <span className="inline-flex items-center gap-1 font-medium">{content}</span>
                  )}
                </span>
              );
            })}
          </div>
        </div>
      </div>
      <AvatarPickerModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSaved={saveAvatar}
        presetStyle={{
          previewSeed: email || fullName,
          presets: WAVES_PRESET_LIST.map((p) => ({
            key: p.key,
            label: p.label,
            description: p.description,
            buildUrl: (seed) => buildWavesAvatarUrl(p.key, seed),
          })),
        }}
      />
    </section>
  );
}