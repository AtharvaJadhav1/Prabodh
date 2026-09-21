"use client";

import { useIndustryProfile } from "./IndustryProfileProvider";
import ExpandableContactItem from "../dashboard/ExpandableContactItem";
import { PencilIcon, MailIcon, PhoneIcon, MapPinIcon, BadgeCheckIcon, HashIcon } from "../dashboard/icons";

export default function IndustryProfileHeaderCard() {
  const { profile, openDrawer } = useIndustryProfile();
  const {
    initials,
    fullName,
    designation,
    company,
    email,
    phone,
    location,
    industryMentorId,
    roleBadge,
  } = profile;

  return (
    <section className="flex flex-col gap-6 rounded-3xl border border-neutral-100 bg-white p-6 shadow-sm sm:p-8">
      {/* Top row */}
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-[#3c2415] text-2xl font-bold text-[#ffddb8]">
            {initials}
          </div>
          <div>
            <h2 className="text-2xl font-bold text-neutral-900 sm:text-3xl">{fullName}</h2>
            <p className="mt-1 text-sm font-medium text-neutral-500">
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
        <ExpandableContactItem
          icon={<BadgeCheckIcon className="h-4 w-4" />}
          label="Verified Domain Specialist"
          value={roleBadge}
        />
        <ExpandableContactItem
          icon={<MailIcon className="h-4 w-4" />}
          label="Official Work Email (click to copy)"
          value={email || "—"}
          onCopy
        />
        <ExpandableContactItem
          icon={<PhoneIcon className="h-4 w-4" />}
          label="Direct Contact Number"
          value={phone || "empty"}
          onAction={phone ? undefined : () => openDrawer("profile")}
        />
        <ExpandableContactItem
          icon={<MapPinIcon className="h-4 w-4" />}
          label="Office / City Location"
          value={location || "empty"}
          onAction={location ? undefined : () => openDrawer("profile")}
        />
        <ExpandableContactItem
          icon={<BadgeCheckIcon className="h-4 w-4" />}
          label="University Partner Account Verified"
          value="Verified Industry Profile"
        />
      </div>
    </section>
  );
}