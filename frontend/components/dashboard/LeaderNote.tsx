"use client";

import { MailIcon, LockIcon } from "./icons";
import { useTeam } from "./TeamProvider";

export default function LeaderNote() {
  const { isLead } = useTeam();
  return (
    <div className="flex items-start gap-3 p-4 rounded-2xl border border-brand-softline bg-white shadow-[0_2px_8px_rgba(91,46,16,0.04)]">
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-deep/10 text-brand-deep">
        {isLead ? <MailIcon className="h-4 w-4" /> : <LockIcon className="h-4 w-4" />}
      </div>
      {isLead ? (
        <p className="text-xs text-brand-muted">
          <span className="font-bold text-brand-deep">Leader Privilege:</span> Only the team lead can
          dispatch email invites or accept incoming join requests.
        </p>
      ) : (
        <p className="text-xs text-brand-muted">
          <span className="font-bold text-brand-deep">Read-Only Access:</span> You are viewing the group
          as a Team Member. The Team Lead manages invites and join requests.
        </p>
      )}
    </div>
  );
}