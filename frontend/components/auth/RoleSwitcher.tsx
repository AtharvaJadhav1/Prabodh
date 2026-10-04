"use client";

import { useState } from "react";
import { isDualMentor, type PlatformRole } from "../../lib/session";
import { roleLabel, useAuth } from "./AuthProvider";
import { LandmarkIcon, BriefcaseIcon, ChevronsUpDownIcon } from "../dashboard/icons";

const SWITCH_TARGETS: PlatformRole[] = ["institute_mentor", "industry_mentor"];

interface RoleConfig {
  icon: React.FC<{ className?: string }>;
  label: string;
}

const ROLE_CONFIG: Partial<Record<PlatformRole, RoleConfig>> = {
  institute_mentor: {
    icon: LandmarkIcon,
    label: "Institute Mentor",
  },
  industry_mentor: {
    icon: BriefcaseIcon,
    label: "Industry Mentor",
  },
};

/**
 * Premium Notion-style workspace switcher. Renders ONLY for accounts holding both
 * institute_mentor and industry_mentor — everyone else sees nothing.
 */
export default function RoleSwitcher() {
  const { session, switchRole } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isDualMentor(session)) return null;

  const current = session?.activeRole ?? session?.platformRole;
  const other = SWITCH_TARGETS.find((r) => r !== current) ?? "institute_mentor";

  const currentConfig = current ? ROLE_CONFIG[current] : undefined;
  const otherConfig = ROLE_CONFIG[other];
  const CurrentIcon = currentConfig?.icon ?? LandmarkIcon;
  const OtherIcon = otherConfig?.icon ?? BriefcaseIcon;

  const handleSwitch = async () => {
    setBusy(true);
    setError(null);
    try {
      await switchRole(other);
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : "Could not switch workspace. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="px-3 py-2">
      <p className="text-[10px] font-semibold text-brand-muted uppercase tracking-widest mb-1.5 px-1">
        Workspace
      </p>
      <button
        type="button"
        onClick={handleSwitch}
        disabled={busy}
        aria-label={`Switch to ${otherConfig?.label ?? roleLabel(other)}`}
        className="group w-full flex items-center justify-between p-2 rounded-lg border border-transparent hover:border-brand-softline hover:bg-brand-cream/80 hover:shadow-sm transition-all duration-200 ease-in-out text-left disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-8 h-8 rounded-md bg-brand-deep/10 text-brand-deep">
            <CurrentIcon className="w-4 h-4" aria-hidden="true" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-semibold text-brand-deep leading-none truncate">
              {currentConfig?.label ?? roleLabel(current ?? "institute_mentor")}
            </span>
            <span className="text-xs text-brand-muted mt-0.5 truncate">
              Click to switch
            </span>
          </div>
        </div>

        {/* Hover-revealed swap icon */}
        <div className="text-brand-muted group-hover:text-brand-deep transition-colors duration-200 flex-shrink-0">
          <ChevronsUpDownIcon className="w-4 h-4" aria-hidden="true" />
        </div>
      </button>
      {error ? (
        <p role="alert" className="mt-1.5 px-1 text-[11px] font-semibold text-red-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}