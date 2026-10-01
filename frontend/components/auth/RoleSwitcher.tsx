"use client";

import { useState } from "react";
import { isDualMentor, type PlatformRole } from "../../lib/session";
import { roleLabel, useAuth } from "./AuthProvider";

const SWITCH_TARGETS: PlatformRole[] = ["institute_mentor", "industry_mentor"];

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

  return (
    <div className="rounded-xl border border-brand-softline bg-white p-3">
      <p className="text-[10px] font-bold uppercase tracking-widest text-brand-muted">
        Workspace Role
      </p>
      <p className="mt-1 truncate text-sm font-extrabold text-brand-deep">
        {roleLabel(current ?? "institute_mentor")}
      </p>
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
        className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-deep px-4 py-2 text-xs font-bold tracking-wide text-white transition-all duration-200 hover:bg-brand-primary disabled:opacity-60"
      >
        {busy ? "Switching…" : `Switch to ${roleLabel(other)}`}
      </button>
    </div>
  );
}
