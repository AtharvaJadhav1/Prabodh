"use client";

import { useState } from "react";
import AdminShell from "../../../../components/admin/AdminShell";
import UserTable from "../../../../components/admin/UserTable";
import { useAdmin } from "../../../../components/admin/AdminProvider";
import { apiPost } from "../../../../lib/api";
import type { PortalUser } from "../../../../lib/types";

type Tab = "students" | "institute-mentors" | "industry-mentors";

export default function AdminUsersPage() {
  const { users, mentors, reload } = useAdmin();
  const [tab, setTab] = useState<Tab>("students");
  const [csv, setCsv] = useState("email,fullName,platformRole,institute,department\n");
  const [importMsg, setImportMsg] = useState("");

  const students = users.filter((u) => u.platformRole === "student");
  const industry = users.filter((u) => u.platformRole === "industry_mentor");
  const institute = users.filter((u) => u.platformRole === "institute_mentor");

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: "students", label: "Students", count: students.length },
    { key: "institute-mentors", label: "Institute Mentors", count: institute.length || mentors.length },
    { key: "industry-mentors", label: "Industry Mentors", count: industry.length },
  ];

  const rowsFor = tab === "students" ? students : tab === "institute-mentors" ? institute : industry;

  return (
    <AdminShell
      breadcrumb={[{ label: "SIH Portal" }, { label: "Admin Console" }, { label: "Manage Users" }]}
      title="Manage Users"
      subtitle="Live directory plus CSV import (review, then activate)."
      showActions={false}
    >
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="rounded-2xl border border-brand-sand bg-white p-4">
          <p className="text-xs font-bold uppercase text-brand-deep">CSV import</p>
          <textarea
            value={csv}
            onChange={(e) => setCsv(e.target.value)}
            rows={4}
            className="mt-2 w-full rounded-xl border border-brand-sand p-3 font-mono text-xs"
          />
          <button
            type="button"
            className="mt-2 rounded-xl bg-brand-primary px-4 py-2 text-xs font-bold text-white"
            onClick={async () => {
              setImportMsg("");
              try {
                const batch = await apiPost<{ id: string; rowCount: number }>("/admin/users/import", { csv });
                await apiPost(`/admin/users/import/${batch.id}/activate`, {});
                setImportMsg(`Imported ${batch.rowCount} rows.`);
                await reload();
              } catch (err) {
                setImportMsg(err instanceof Error ? err.message : "Import failed");
              }
            }}
          >
            Import and activate
          </button>
          {importMsg ? <p className="mt-2 text-xs text-brand-muted">{importMsg}</p> : null}
        </div>

        <div className="flex w-fit items-center gap-1 rounded-xl border border-brand-sand bg-white p-1.5 shadow-inner">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`rounded-lg px-4 py-2 text-xs font-bold transition-all ${
                tab === t.key ? "bg-brand-lightOrange text-brand-primary shadow-sm" : "text-brand-muted hover:text-brand-deep"
              }`}
            >
              {t.label} ({t.count})
            </button>
          ))}
        </div>

        <UserTable<PortalUser>
          rows={rowsFor}
          rowKey={(u) => u.id}
          searchPlaceholder="Search users..."
          searchFn={(u, q) => u.fullName.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)}
          emptyLabel="No users match your search."
          columns={[
            { label: "Name", render: (u) => <span className="font-bold text-brand-deep">{u.fullName}</span> },
            { label: "Email", render: (u) => <span className="font-mono text-brand-muted">{u.email}</span> },
            { label: "Role", render: (u) => u.platformRole },
            { label: "Institute", render: (u) => u.institute ?? "—" },
            { label: "Department", render: (u) => u.department ?? "—" },
          ]}
        />
      </div>
    </AdminShell>
  );
}
