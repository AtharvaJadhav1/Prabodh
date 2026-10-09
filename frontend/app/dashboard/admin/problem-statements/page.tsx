"use client";

import AdminShell from "../../../../components/admin/AdminShell";
import ProblemStatementsAdmin from "../../../../components/admin/ProblemStatementsAdmin";

export default function AdminProblemStatementsPage() {
  return (
    <AdminShell title="Problem Statements">
      <ProblemStatementsAdmin />
    </AdminShell>
  );
}
