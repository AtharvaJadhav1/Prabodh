"use client";

import AdminShell from "../../../../components/admin/AdminShell";
import AllocationTable from "../../../../components/admin/AllocationTable";
import { useAdmin } from "../../../../components/admin/AdminProvider";

export default function AdminMentorAllocationPage() {
  const { allocations, assignTeam } = useAdmin();

  return (
    <AdminShell
      breadcrumb={[{ label: "SIH 2026 Portal" }, { label: "Admin Console" }, { label: "Mentor Allocation" }]}
      title="Mentor Allocation"
      subtitle="Assign or reassign Institute Mentors to every registered team."
      showActions={false}
    >
      <div className="mx-auto max-w-7xl">
        <AllocationTable allocations={allocations} onAssign={assignTeam} />
      </div>
    </AdminShell>
  );
}
