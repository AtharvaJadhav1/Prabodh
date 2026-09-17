"use client";

import { useState } from "react";
import AdminShell from "../../../../components/admin/AdminShell";
import UserTable from "../../../../components/admin/UserTable";
import Avatar from "../../../../components/Avatar";
import { useAdmin } from "../../../../components/admin/AdminProvider";
import { apiPost } from "../../../../lib/api";
import type { PortalUser } from "../../../../lib/types";

type Tab = "students" | "institute-mentors" | "industry-mentors";

export default function AdminUsersPage() {
  const { users, mentors, reload } = useAdmin();
  const [tab, setTab] = useState<Tab>("students");
  const [csv, setCsv] = useState("email,fullName,platformRole,institute,department\n");
  const [importMsg, setImportMsg] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [invitePassword, setInvitePassword] = useState("");
  const [inviteRole, setInviteRole] = useState<"institute_mentor" | "industry_mentor" | "admin">("institute_mentor");
  const [inviteInstitute, setInviteInstitute] = useState("");
  const [inviteDepartment, setInviteDepartment] = useState("");
  const [inviteMsg, setInviteMsg] = useState("");
  const [inviteBusy, setInviteBusy] = useState(false);
  const [importBusy, setImportBusy] = useState(false);

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
    <AdminShell title="Manage Users">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="rounded-2xl border border-brand-sand bg-white p-4">
          <p className="text-xs font-bold uppercase text-brand-deep">Invite faculty / staff</p>
          <p className="mt-1 text-xs text-brand-muted">
            Creates the account and emails login ID (email) and password. Faculty cannot self-register.
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <input
              type="email"
              placeholder="Email (login ID)"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              className="rounded-xl border border-brand-sand px-3 py-2 text-sm"
            />
            <input
              type="text"
              placeholder="Full name"
              value={inviteName}
              onChange={(e) => setInviteName(e.target.value)}
              className="rounded-xl border border-brand-sand px-3 py-2 text-sm"
            />
            <input
              type="password"
              placeholder="Temporary password"
              value={invitePassword}
              onChange={(e) => setInvitePassword(e.target.value)}
              className="rounded-xl border border-brand-sand px-3 py-2 text-sm"
            />
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as typeof inviteRole)}
              className="rounded-xl border border-brand-sand px-3 py-2 text-sm"
            >
              <option value="institute_mentor">Institute mentor</option>
              <option value="industry_mentor">Industry mentor</option>
              <option value="admin">Admin</option>
            </select>
            <input
              type="text"
              placeholder="Institute (optional)"
              value={inviteInstitute}
              onChange={(e) => setInviteInstitute(e.target.value)}
              className="rounded-xl border border-brand-sand px-3 py-2 text-sm"
            />
            <input
              type="text"
              placeholder="Department (optional)"
              value={inviteDepartment}
              onChange={(e) => setInviteDepartment(e.target.value)}
              className="rounded-xl border border-brand-sand px-3 py-2 text-sm"
            />
          </div>
          <button
            type="button"
            disabled={inviteBusy}
            className="mt-3 rounded-xl bg-brand-deep px-4 py-2 text-xs font-bold text-white disabled:opacity-60"
            onClick={async () => {
              setInviteMsg("");
              setInviteBusy(true);
              try {
                const result = await apiPost<{
                  email: string;
                  emailSent?: boolean;
                  emailError?: string | null;
                }>("/admin/users/invite", {
                  email: inviteEmail.trim(),
                  fullName: inviteName.trim(),
                  password: invitePassword,
                  platformRole: inviteRole,
                  institute: inviteInstitute.trim() || undefined,
                  department: inviteDepartment.trim() || undefined,
                });
                setInviteMsg(
                  `Invited ${result.email}. Credentials email is sending in the background.`,
                );
                setInviteEmail("");
                setInviteName("");
                setInvitePassword("");
                void reload();
              } catch (err) {
                setInviteMsg(err instanceof Error ? err.message : "Invite failed");
              } finally {
                setInviteBusy(false);
              }
            }}
          >
            {inviteBusy ? "Sending…" : "Create account & email credentials"}
          </button>
          {inviteMsg ? <p className="mt-2 text-xs text-brand-muted">{inviteMsg}</p> : null}
        </div>

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
            disabled={importBusy}
            className="mt-2 rounded-xl bg-brand-primary px-4 py-2 text-xs font-bold text-white disabled:opacity-60"
            onClick={async () => {
              setImportMsg("");
              setImportBusy(true);
              try {
                const batch = await apiPost<{ id: string; rowCount: number }>(
                  "/admin/users/import",
                  { csv },
                  { timeoutMs: 60_000 },
                );
                await apiPost(`/admin/users/import/${batch.id}/activate`, {}, { timeoutMs: 120_000 });
                setImportMsg(
                  `Imported ${batch.rowCount} rows. Staff credential emails are sending in the background.`,
                );
                void reload();
              } catch (err) {
                setImportMsg(err instanceof Error ? err.message : "Import failed");
              } finally {
                setImportBusy(false);
              }
            }}
          >
            {importBusy ? "Importing…" : "Import and activate"}
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
            { label: "Name", render: (u) => (
              <span className="flex items-center gap-2.5">
                <Avatar src={u.avatarUrl || null} seed={u.fullName || u.email || "user"} className="h-8 w-8" />
                <span className="font-bold text-brand-deep">{u.fullName}</span>
              </span>
            ) },
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
