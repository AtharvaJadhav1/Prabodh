"use client";

import AdminShell from "../../../../components/admin/AdminShell";
import AllocationTable from "../../../../components/admin/AllocationTable";
import { useAdmin } from "../../../../components/admin/AdminProvider";

export default function AdminMentorAllocationPage() {
  const { allocations, assignTeam, assignIndustryMentor } = useAdmin();

  return (
    <AdminShell title="Mentor Allocation">
      <div className="mx-auto max-w-7xl">
        <AllocationTable
          allocations={allocations}
          onAssignInstitute={assignTeam}
          onAssignIndustry={assignIndustryMentor}
        />
      </div>
    </AdminShell>
  );
}
