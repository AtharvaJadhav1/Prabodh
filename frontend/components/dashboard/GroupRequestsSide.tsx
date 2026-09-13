import {
  GradCapIcon,
  CheckIcon,
} from "./icons";

export function ComplianceCard() {
  return (
    <div className="space-y-3 rounded-2xl border border-brand-softline bg-white p-5 shadow-[0_2px_8px_rgba(91,46,16,0.04)]">
      <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-brand-muted">
        <CheckIcon className="h-4 w-4 text-brand-approved" /> Mandatory Compliance Rules
      </h3>
      <ul className="space-y-2 text-xs text-brand-charcoal/75">
        <li className="flex items-start gap-2.5 text-xs">
          <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-brand-approved/10 text-[10px] font-bold text-brand-approved">✓</span>
          <span><strong>Exactly 6 members:</strong> Roster must have exactly 6 verified students. No more, no less.</span>
        </li>
        <li className="flex items-start gap-2.5 text-xs">
          <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-brand-approved/10 text-[10px] font-bold text-brand-approved">✓</span>
          <span><strong>Gender Diversity:</strong> Minimum 1 female participant is mandatory.</span>
        </li>
        <li className="flex items-start gap-2.5 text-xs">
          <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-brand-approved/10 text-[10px] font-bold text-brand-approved">✓</span>
          <span><strong>Single Team Lock:</strong> A student cannot join or be invited by multiple active teams.</span>
        </li>
      </ul>
    </div>
  );
}

export function MentorInvitePointer() {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-brand-softline bg-white p-4 shadow-[0_2px_8px_rgba(91,46,16,0.04)]">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-primary/10 text-brand-primary">
        <GradCapIcon className="h-4 w-4" />
      </div>
      <div>
        <p className="text-xs font-bold text-brand-deep">Mentor Invitations</p>
        <p className="mt-0.5 text-[11px] leading-relaxed text-brand-muted">
          Institute and industry mentor invitations now live on the dedicated{" "}
          <a href="/dashboard/student/mentors" className="font-bold text-brand-primary underline underline-offset-2">
            Mentors
          </a>{" "}
          page.
        </p>
      </div>
    </div>
  );
}