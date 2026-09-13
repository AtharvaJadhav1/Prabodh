"use client";

import AdminShell from "../../../../components/admin/AdminShell";
import AllocationTable from "../../../../components/admin/AllocationTable";
import { useAdmin } from "../../../../components/admin/AdminProvider";

export default function AdminMentorAllocationPage() {
  const { allocations, assignTeam } = useAdmin();

  return (
    <AdminShell title="Mentor Allocation">
      <div className="mx-auto max-w-7xl">
        <AllocationTable allocations={allocations} onAssign={assignTeam} />
      </div>
    </AdminShell>
  );
}
