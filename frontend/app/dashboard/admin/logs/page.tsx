"use client";

import AdminShell from "../../../../components/admin/AdminShell";
import AuditLogView from "../../../../components/audit/AuditLogView";

export default function AdminLogsPage() {
  return (
    <AdminShell title="Audit Logs">
      <AuditLogView endpoint="/admin/logs" />
    </AdminShell>
  );
}
