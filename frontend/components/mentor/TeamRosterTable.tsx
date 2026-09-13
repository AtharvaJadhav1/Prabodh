export type RosterMember = {
  id: string;
  name: string;
  email: string;
  department?: string | null;
  isLeader: boolean;
  inviteStatus: string;
};

export default function TeamRosterTable({ members }: { members: RosterMember[] }) {
  return (
    <div className="rounded-xl border border-brand-sand bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-brand-sand bg-brand-cream/60">
              <th className="px-4 py-3 font-bold text-brand-muted">Name</th>
              <th className="px-4 py-3 font-bold text-brand-muted">Email</th>
              <th className="px-4 py-3 font-bold text-brand-muted">Department</th>
              <th className="px-4 py-3 font-bold text-brand-muted">Role</th>
              <th className="px-4 py-3 font-bold text-brand-muted">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-sand">
            {members.map((m) => (
              <tr key={m.id} className="transition-colors hover:bg-brand-cream/40">
                <td className="px-4 py-3 font-bold text-brand-deep">{m.name}</td>
                <td className="px-4 py-3 text-brand-muted">{m.email}</td>
                <td className="px-4 py-3 text-brand-deep">{m.department || "—"}</td>
                <td className="px-4 py-3 text-brand-deep">{m.isLeader ? "Team Leader" : "Member"}</td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${
                      m.inviteStatus === "accepted"
                        ? "bg-brand-approved/10 text-brand-approved"
                        : "bg-brand-sand text-brand-muted"
                    }`}
                  >
                    {m.inviteStatus}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
