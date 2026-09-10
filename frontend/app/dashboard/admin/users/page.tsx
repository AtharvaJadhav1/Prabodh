"use client";

import { useState } from "react";
import AdminShell from "../../../../components/admin/AdminShell";
import UserTable from "../../../../components/admin/UserTable";
import { useAdmin } from "../../../../components/admin/AdminProvider";
import { availableMentors } from "../../../../data/adminDashboard";
import type { Member } from "../../../../data/studentDashboard";
import type { IndustryMentor } from "../../../../data/mentorDashboard";

type Tab = "students" | "institute-mentors" | "industry-mentors";

export default function AdminUsersPage() {
  const { students, industryMentors } = useAdmin();
  const [tab, setTab] = useState<Tab>("students");

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: "students", label: "Students", count: students.length },
    { key: "institute-mentors", label: "Institute Mentors", count: availableMentors.length },
    { key: "industry-mentors", label: "Industry Mentors", count: industryMentors.length },
  ];

  return (
    <AdminShell
      breadcrumb={[{ label: "SIH 2026 Portal" }, { label: "Admin Console" }, { label: "Manage Users" }]}
      title="Manage Users"
      subtitle="View and search all students, institute mentors, and industry mentors on the platform."
      showActions={false}
    >
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex items-center gap-1 rounded-xl border border-brand-sand bg-white p-1.5 shadow-inner w-fit">
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

        {tab === "students" && (
          <UserTable<Member>
            rows={students}
            rowKey={(m) => m.prn || m.name}
            searchPlaceholder="Search student..."
            searchFn={(m, q) => m.name.toLowerCase().includes(q) || m.prn.toLowerCase().includes(q)}
            emptyLabel="No students match your search."
            columns={[
              { label: "Name", render: (m) => <span className="font-bold text-brand-deep">{m.name}</span> },
              { label: "PRN", render: (m) => <span className="font-mono text-brand-muted">{m.prn || "—"}</span> },
              { label: "Branch", render: (m) => m.branch || "—" },
              { label: "Role", render: (m) => m.role ?? "—" },
              {
                label: "Status",
                render: (m) => (
                  <span className="rounded-full border border-brand-sand bg-brand-cream px-2.5 py-0.5 text-[11px] font-semibold text-brand-charcoal">
                    {m.status}
                  </span>
                ),
              },
            ]}
          />
        )}

        {tab === "institute-mentors" && (
          <UserTable
            rows={availableMentors}
            rowKey={(m) => m.id}
            searchPlaceholder="Search mentor..."
            searchFn={(m, q) => m.name.toLowerCase().includes(q)}
            emptyLabel="No institute mentors match your search."
            columns={[
              { label: "Name", render: (m) => <span className="font-bold text-brand-deep">{m.name}</span> },
              { label: "Employee ID", render: (m) => <span className="font-mono text-brand-muted">{m.id}</span> },
              { label: "Title", render: (m) => m.title },
            ]}
          />
        )}

        {tab === "industry-mentors" && (
          <UserTable<IndustryMentor>
            rows={industryMentors}
            rowKey={(m) => m.id}
            searchPlaceholder="Search industry mentor..."
            searchFn={(m, q) => m.name.toLowerCase().includes(q) || m.company.toLowerCase().includes(q)}
            emptyLabel="No industry mentors match your search."
            columns={[
              { label: "Name", render: (m) => <span className="font-bold text-brand-deep">{m.name}</span> },
              { label: "Company", render: (m) => m.company },
              { label: "Designation", render: (m) => m.designation },
              { label: "Mapped Teams", render: (m) => String(m.mappedTeamIds.length) },
            ]}
          />
        )}
      </div>
    </AdminShell>
  );
}
