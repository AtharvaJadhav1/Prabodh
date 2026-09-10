import type { MentorInvite } from "../../data/industryDashboard";

type Props = {
  history: MentorInvite[];
};

export default function InviteHistoryList({ history }: Props) {
  const rows = history.filter(
    (inv, index, arr) => arr.findIndex((item) => item.id === inv.id) === index,
  );

  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-brand-sand bg-brand-cream p-8 text-center">
        <p className="text-xs font-medium text-brand-muted">No responded invites yet.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-brand-sand bg-white shadow-xs">
      <table className="w-full text-left text-xs">
        <thead>
          <tr className="border-b border-brand-sand bg-brand-cream/60 text-[10px] uppercase tracking-wider text-brand-muted">
            <th className="px-4 py-3 font-bold">Institute Mentor</th>
            <th className="px-4 py-3 font-bold">Teams</th>
            <th className="px-4 py-3 text-center font-bold">Status</th>
            <th className="px-4 py-3 text-right font-bold">Responded</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-brand-sand">
          {rows.map((inv) => (
            <tr key={inv.id} className="transition-colors hover:bg-brand-cream/80">
              <td className="px-4 py-4">
                <div className="text-sm font-bold text-brand-deep">{inv.instituteMentorName}</div>
                <div className="mt-0.5 text-[11px] text-brand-muted">{inv.instituteMentorTitle}</div>
              </td>
              <td className="px-4 py-4 text-brand-charcoal">{inv.groupIds.length}</td>
              <td className="px-4 py-4 text-center">
                {inv.status === "accepted" ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-brand-approved/20 bg-brand-approved/10 px-2.5 py-1 text-[11px] font-semibold text-brand-approved">
                    Accepted
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full border border-brand-overdue/20 bg-red-50 px-2.5 py-1 text-[11px] font-semibold text-brand-overdue">
                    Declined
                  </span>
                )}
              </td>
              <td className="px-4 py-4 text-right text-brand-muted">{inv.respondedAt}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
