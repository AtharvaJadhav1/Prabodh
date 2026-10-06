"use client";

import { useState } from "react";
import { useIndustryProfile } from "./IndustryProfileProvider";
import { useAuth } from "../auth/AuthProvider";
import { apiPatch } from "../../lib/api";
import Avatar from "../Avatar";
import AvatarPickerModal from "../dashboard/AvatarPickerModal";
import { WAVES_PRESET_LIST, buildWavesAvatarUrl, resolveMentorAvatarUrl } from "../../lib/mentorAvatar";
import ExpandableContactItem from "../dashboard/ExpandableContactItem";
import { PencilIcon, MailIcon, PhoneIcon, MapPinIcon, BadgeCheckIcon, HashIcon, CameraIcon } from "../dashboard/icons";

export default function IndustryProfileHeaderCard() {
  const { profile, openDrawer } = useIndustryProfile();
  const { session, refreshMe } = useAuth();
  const {
    fullName,
    designation,
    company,
    email,
    phone,
    location,
    industryMentorId,
    roleBadge,
  } = profile;
  const [pickerOpen, setPickerOpen] = useState(false);

  const saveAvatar = async (avatarUrl: string) => {
    await apiPatch("/me", { profileJson: { avatarUrl } });
    await refreshMe();
  };

  return (
    <section className="flex flex-col gap-6 rounded-3xl border border-neutral-100 bg-white p-5 shadow-sm sm:p-8">
      {/* Top row */}
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center">
          <div className="relative shrink-0">
            <Avatar
              src={resolveMentorAvatarUrl("INDUSTRY", { profileJson: session?.profileJson, email, fullName })}
              seed={fullName}
              className="h-20 w-20 rounded-2xl"
            />
            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-[#d95c26] text-white shadow-md transition-colors hover:bg-[#c04d1c]"
              aria-label="Change profile photo"
            >
              <CameraIcon className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="min-w-0">
            <h2 className="break-words text-2xl font-bold text-neutral-900 sm:text-3xl">{fullName}</h2>
            <p className="mt-1 break-words text-sm font-medium text-neutral-500">
              {designation ? `${designation} • ` : ""}
              {company || "Independent Industry Expert"}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => openDrawer("profile")}
          className="inline-flex shrink-0 items-center gap-2 self-start rounded-xl bg-[#d95c26] px-5 py-2.5 font-medium text-white transition-colors hover:bg-[#c04d1c] sm:self-auto"
        >
          <PencilIcon className="h-4 w-4" />
          Edit Profile
        </button>
      </div>

      {/* Metadata badges */}
      <div className="flex flex-wrap items-center gap-2 border-t border-neutral-100 pt-4">
        <ExpandableContactItem
          icon={<HashIcon className="h-4 w-4" />}
          label="Industry Mentor ID (click to copy)"
          value={industryMentorId || "—"}
          onCopy
        />
        {roleBadge ? (
          <ExpandableContactItem
            icon={<BadgeCheckIcon className="h-4 w-4" />}
            label="Role"
            value={roleBadge}
          />
        ) : null}
        <ExpandableContactItem
          icon={<MailIcon className="h-4 w-4" />}
          label="Official Work Email (click to copy)"
          value={email || "—"}
          onCopy
        />
        <ExpandableContactItem
          icon={<PhoneIcon className="h-4 w-4" />}
          label="Direct Contact Number"
          value={phone || "Not provided"}
          onAction={phone ? undefined : () => openDrawer("profile")}
        />
        <ExpandableContactItem
          icon={<MapPinIcon className="h-4 w-4" />}
          label="Office / City Location"
          value={location || "Not provided"}
          onAction={location ? undefined : () => openDrawer("profile")}
        />
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