"use client";

import { useState } from "react";
import { isDualMentor, type PlatformRole } from "../../lib/session";
import { roleLabel, useAuth } from "./AuthProvider";
import { LandmarkIcon, BriefcaseIcon, RefreshIcon } from "../dashboard/icons";

const SWITCH_TARGETS: PlatformRole[] = ["institute_mentor", "industry_mentor"];

interface RoleConfig {
  icon: React.FC<{ className?: string }>;
  label: string;
  brandColor: string;
}

const ROLE_CONFIG: Record<Exclude<PlatformRole, "student" | "admin" | "student_expert">, RoleConfig> = {
  institute_mentor: {
    icon: LandmarkIcon,
    label: "Institute Mentor",
    brandColor: "#5c3a21",
  },
  industry_mentor: {
    icon: BriefcaseIcon,
    label: "Industry Mentor",
    brandColor: "#5c3a21",
  },
};

/**
 * Dual-role workspace switcher. Renders ONLY for accounts holding both
 * institute_mentor and industry_mentor — everyone else sees nothing.
 */
export default function RoleSwitcher() {
  const { session, switchRole } = useAuth();
  const [busy, setBusy] = useState(false);

  if (!isDualMentor(session)) return null;

  const current = session?.activeRole ?? session?.platformRole;
  const other = SWITCH_TARGETS.find((r) => r !== current) ?? "institute_mentor";

  const currentConfig = ROLE_CONFIG[current as keyof typeof ROLE_CONFIG];
  const otherConfig = ROLE_CONFIG[other as keyof typeof ROLE_CONFIG];
  const CurrentIcon = currentConfig?.icon ?? LandmarkIcon;
  const OtherIcon = otherConfig?.icon ?? BriefcaseIcon;

  return (
    <div className="p-4 bg-white border border-brand-softline rounded-xl shadow-sm flex flex-col gap-3">
      {/* Current State Group */}
      <div>
        <p className="text-[10px] font-semibold text-brand-muted uppercase tracking-widest mb-1">
          Workspace Role
        </p>
        <div className="flex items-center gap-2">
          <CurrentIcon className="w-4 h-4 text-[#5c3a21]" aria-hidden="true" />
          <span className="font-bold text-[#5c3a21] text-base">
            {currentConfig?.label ?? roleLabel(current ?? "institute_mentor")}
          </span>
        </div>
      </div>

      {/* Secondary Action Button */}
      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            await switchRole(other);
          } finally {
            setBusy(false);
          }
        }}
        className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg border border-[#5c3a21]/30 text-[#5c3a21] font-medium text-sm hover:bg-[#5c3a21]/5 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <RefreshIcon className="w-4 h-4" aria-hidden="true" />
        {busy ? "Switching…" : `Switch to ${otherConfig?.label ?? roleLabel(other)}`}
      </button>
    </div>
  );
}