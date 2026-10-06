import { inviteStatusLabel, type MentorInvite } from "../../data/industryDashboard";

type Props = {
  history: MentorInvite[];
};

export default function InviteHistoryList({ history }: Props) {
  const rows = history.filter(
    (inv, index, arr) => arr.findIndex((item) => item.id === inv.id) === index,
  );

  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-brand-sand bg-brand-cream p-8 max-sm:p-5 text-center">
        <p className="text-xs font-medium text-brand-muted">No responded invites yet.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-brand-sand bg-white shadow-xs">
      <table className="w-full min-w-[560px] text-left text-xs">
        <thead>
          <tr className="border-b border-brand-sand bg-brand-cream/60 text-xs uppercase tracking-wider text-brand-muted">
            <th className="px-4 py-3 font-bold">Team / Invited by</th>
            <th className="px-4 py-3 font-bold">Code</th>
            <th className="px-4 py-3 text-center font-bold">Status</th>
            <th className="px-4 py-3 text-right font-bold">Responded</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-brand-sand">
          {rows.map((inv) => (
            <tr key={inv.id} className="transition-colors hover:bg-brand-cream/80">
              <td className="px-4 py-4">
                <div className="text-sm font-bold text-brand-deep">{inv.teamName}</div>
                <div className="mt-0.5 text-xs text-brand-muted">
                  {inv.invitedByName ? `Invited by ${inv.invitedByName}` : "Invited by an institute mentor"}
                </div>
              </td>
              <td className="px-4 py-4 font-mono text-brand-charcoal">{inv.teamCode}</td>
              <td className="px-4 py-4 text-center">
                {inv.status === "accepted" ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-brand-approved/20 bg-brand-approved/10 px-2.5 py-1 text-xs font-semibold whitespace-nowrap text-brand-approved">
                    {inviteStatusLabel("accepted")}
                  </span>
                ) : inv.status === "expired" || inv.status === "unassigned" ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-brand-sand bg-brand-cream px-2.5 py-1 text-xs font-semibold whitespace-nowrap text-brand-muted">
                    {inviteStatusLabel(inv.status)}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full border border-brand-overdue/20 bg-red-50 px-2.5 py-1 text-xs font-semibold whitespace-nowrap text-brand-overdue">
                    {inviteStatusLabel(inv.status)}
                  </span>
                )}
              </td>
              <td className="px-4 py-4 text-right text-brand-muted">{inv.respondedAt ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
