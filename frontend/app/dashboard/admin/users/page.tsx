"use client";

import { useRef, useState } from "react";
import AdminShell from "../../../../components/admin/AdminShell";
import UserTable from "../../../../components/admin/UserTable";
import MentorDropdown from "../../../../components/admin/MentorDropdown";
import Avatar from "../../../../components/Avatar";
import { useAdmin } from "../../../../components/admin/AdminProvider";
import { api, apiPost } from "../../../../lib/api";
import type { PortalUser } from "../../../../lib/types";
import {
  UserPlusIcon,
  SendIcon,
  UploadCloudIcon,
  FileSpreadsheetIcon,
} from "../../../../components/dashboard/icons";

type Tab = "students" | "institute-mentors" | "industry-mentors" | "student-experts";
type InviteRole = "institute_mentor" | "industry_mentor" | "admin" | "student_expert";

const INPUT_CLS =
  "w-full rounded-xl border border-neutral-200 bg-white px-3.5 py-2.5 text-sm text-neutral-800 placeholder:text-neutral-400 focus:border-[#d95c26] focus:ring-2 focus:ring-[#d95c26]/20 transition-all outline-none";
const LABEL_CLS = "mb-1.5 block text-xs font-medium text-neutral-600";
const CSV_HEADER = "email,fullName,platformRole,institute,department";

const INVITE_ROLES: { value: InviteRole; label: string }[] = [
  { value: "institute_mentor", label: "Institute Mentor" },
  { value: "industry_mentor", label: "Industrial Mentor" },
  { value: "student_expert", label: "Student Expert" },
  { value: "admin", label: "Nodal Admin" },
];

export default function AdminUsersPage() {
  const { users, reload } = useAdmin();
  const [tab, setTab] = useState<Tab>("students");
  const [csv, setCsv] = useState(`${CSV_HEADER}\n`);
  const [importMode, setImportMode] = useState<"paste" | "upload">("paste");
  const [dragOver, setDragOver] = useState(false);
  const [fileInputKey, setFileInputKey] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteRole, setInviteRole] = useState<InviteRole>("institute_mentor");
  const [inviteInstitute, setInviteInstitute] = useState("");
  const [inviteDepartment, setInviteDepartment] = useState("");
  const [inviteMsg, setInviteMsg] = useState("");
  const [inviteBusy, setInviteBusy] = useState(false);
  const [importBusy, setImportBusy] = useState(false);

  const students = users.filter((u) => u.platformRole === "student");
  const industry = users.filter((u) => u.platformRole === "industry_mentor");
  const institute = users.filter((u) => u.platformRole === "institute_mentor");
  const experts = users.filter((u) => u.platformRole === "student_expert");

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: "students", label: "Students", count: students.length },
    { key: "institute-mentors", label: "Institute Mentors", count: institute.length },
    { key: "industry-mentors", label: "Industry Mentors", count: industry.length },
    { key: "student-experts", label: "Student Experts", count: experts.length },
  ];

  const rowsFor =
    tab === "students"
      ? students
      : tab === "institute-mentors"
        ? institute
        : tab === "industry-mentors"
          ? industry
          : experts;

  const readCsvFile = (file: File | undefined | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setCsv(typeof reader.result === "string" ? reader.result : "");
      setImportMode("paste");
      setFileInputKey((k) => k + 1);
    };
    reader.readAsText(file);
  };

  const downloadTemplate = () => {
    const content = `${CSV_HEADER}\njane.doe@example.edu,Dr. Jane Doe,institute_mentor,School of Computing,AI & Analytics\nravi.kumar@example.org,Ravi Kumar,industry_mentor,Acme Technologies,Research\npriya.expert@example.edu,Priya Expert,student_expert,School of Computing,Expert Cell`;
    const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "users_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const rowCount = csv.trim() ? csv.trim().split(/\r?\n/).filter((line) => line.trim()).length : 0;

  return (
    <AdminShell title="Manage Users">
      <div className="mx-auto max-w-7xl bg-[#f5f1eb] px-0 pb-4">
        <section className="mb-6 rounded-2xl border border-neutral-200/80 bg-white p-6 shadow-sm">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#d95c26]/10">
              <UserPlusIcon className="h-5 w-5 text-[#d95c26]" />
            </span>
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-neutral-900">Invite Faculty / Staff / Experts</h2>
              <p className="mt-1 text-xs text-neutral-500">
                Creates the account and emails the login ID (email) along with the auto-generated
                password. Faculty, industry mentors, and student experts cannot self-register.
              </p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className={LABEL_CLS} htmlFor="invite-email">
                Email Address
              </label>
              <input
                id="invite-email"
                type="email"
                placeholder="e.g. name@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className={INPUT_CLS}
              />
            </div>
            <div>
              <label className={LABEL_CLS} htmlFor="invite-name">
                Full Name
              </label>
              <input
                id="invite-name"
                type="text"
                placeholder="e.g. Dr. Jane Doe"
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
                className={INPUT_CLS}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={LABEL_CLS} htmlFor="invite-role">
                Role
              </label>
              <MentorDropdown
                options={INVITE_ROLES.map((r) => ({ id: r.value, name: r.label }))}
                selectedId={inviteRole}
                placeholder="Select role..."
                onSelect={(id) => setInviteRole(id as InviteRole)}
              />
            </div>
            <div>
              <label className={LABEL_CLS} htmlFor="invite-institute">
                Institute / School
              </label>
              <input
                id="invite-institute"
                type="text"
                placeholder="e.g. School of Computing"
                value={inviteInstitute}
                onChange={(e) => setInviteInstitute(e.target.value)}
                className={INPUT_CLS}
              />
            </div>
            <div>
              <label className={LABEL_CLS} htmlFor="invite-department">
                Department
              </label>
              <input
                id="invite-department"
                type="text"
                placeholder="e.g. AI & Analytics"
                value={inviteDepartment}
                onChange={(e) => setInviteDepartment(e.target.value)}
                className={INPUT_CLS}
              />
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-neutral-100 pt-5">
            <button
              type="button"
              disabled={inviteBusy}
              onClick={async () => {
                setInviteMsg("");
                setInviteBusy(true);
                try {
                  const role = inviteRole;
                  const result = await apiPost<{
                    email: string;
                    emailSent?: boolean;
                    emailError?: string | null;
                  }>("/admin/users/invite", {
                    email: inviteEmail.trim(),
                    fullName: inviteName.trim(),
                    platformRole: role,
                    institute: inviteInstitute.trim() || undefined,
                    department: inviteDepartment.trim() || undefined,
                  });
                  setInviteMsg(`Invited ${result.email}. Credentials email is sending in the background.`);
                  setInviteEmail("");
                  setInviteName("");
                  void reload();
                } catch (err) {
                  setInviteMsg(err instanceof Error ? err.message : "Invite failed");
                } finally {
                  setInviteBusy(false);
                }
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-[#3c2415] px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[#2a190e] active:scale-[0.98] disabled:opacity-60"
            >
              {inviteBusy ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/60 border-t-white" />
                  Sending…
                </>
              ) : (
                <>
                  <SendIcon className="h-4 w-4" />
                  Create account &amp; email credentials
                </>
              )}
            </button>
            {inviteMsg ? <p className="text-xs font-medium text-neutral-500">{inviteMsg}</p> : null}
          </div>
        </section>

        <section className="mb-8 rounded-2xl border border-neutral-200/80 bg-white p-6 shadow-sm">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#d95c26]/10">
              <FileSpreadsheetIcon className="h-5 w-5 text-[#d95c26]" />
            </span>
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-neutral-900">CSV Bulk Import</h2>
              <p className="mt-1 text-xs text-neutral-500">
                Import many faculty and staff accounts at once — paste raw CSV or upload a file.
              </p>
            </div>
          </div>

          <div className="mt-5 inline-flex items-center gap-1 rounded-xl border border-neutral-200 bg-neutral-50 p-1">
            <button
              type="button"
              onClick={() => setImportMode("paste")}
              className={`rounded-lg px-4 py-1.5 text-xs font-bold transition-all ${
                importMode === "paste"
                  ? "bg-white text-[#c04d1c] shadow-sm ring-1 ring-neutral-200"
                  : "text-neutral-500 hover:text-neutral-800"
              }`}
            >
              Paste CSV
            </button>
            <button
              type="button"
              onClick={() => setImportMode("upload")}
              className={`rounded-lg px-4 py-1.5 text-xs font-bold transition-all ${
                importMode === "upload"
                  ? "bg-white text-[#c04d1c] shadow-sm ring-1 ring-neutral-200"
                  : "text-neutral-500 hover:text-neutral-800"
              }`}
            >
              Upload File
            </button>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <span className="inline-flex max-w-full items-center gap-1.5 break-all rounded-lg border border-neutral-200 bg-neutral-50 px-2.5 py-1.5 font-mono text-[11px] text-neutral-500">
              {CSV_HEADER}
            </span>
            <button
              type="button"
              onClick={downloadTemplate}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#d95c26] transition hover:text-[#c04d1c]"
            >
              <FileSpreadsheetIcon className="h-4 w-4" />
              Download sample .csv template
            </button>
          </div>

          {importMode === "paste" ? (
            <div className="mt-3 overflow-hidden rounded-xl border border-neutral-200 transition-all focus-within:border-[#d95c26] focus-within:ring-2 focus-within:ring-[#d95c26]/20">
              <textarea
                value={csv}
                onChange={(e) => setCsv(e.target.value)}
                rows={6}
                spellCheck={false}
                placeholder={`${CSV_HEADER}\njane.doe@example.edu,Dr. Jane Doe,institute_mentor,...`}
                className="block w-full resize-y border-0 bg-white p-3.5 font-mono text-xs leading-relaxed text-neutral-800 outline-none placeholder:text-neutral-400"
              />
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-neutral-100 bg-neutral-50/60 px-3.5 py-2 text-[11px] text-neutral-400">
                <span>{rowCount} row{rowCount === 1 ? "" : "s"}</span>
                <span>One account per row · role in: institute_mentor, industry_mentor, admin</span>
              </div>
            </div>
          ) : (
            <div
              role="button"
              tabIndex={0}
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") fileInputRef.current?.click();
              }}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                readCsvFile(e.dataTransfer.files?.[0]);
              }}
              className={`mt-3 cursor-pointer rounded-xl border-2 border-dashed p-6 text-center transition-all ${
                dragOver
                  ? "border-[#d95c26]/60 bg-[#d95c26]/5"
                  : "border-neutral-200 bg-neutral-50/50 hover:border-[#d95c26]/60 hover:bg-neutral-50"
              }`}
            >
              <UploadCloudIcon className="mx-auto h-8 w-8 text-neutral-300" />
              <p className="mt-2 text-sm font-medium text-neutral-700">Drag &amp; drop CSV file here, or click to browse</p>
              <p className="mt-1 text-xs text-neutral-400">.csv files · parsed into the editor above</p>
              <input
                key={fileInputKey}
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => {
                  readCsvFile(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
            </div>
          )}

          <div className="mt-4 flex flex-col items-start gap-3 border-t border-neutral-100 pt-3 sm:flex-row sm:items-center">
            <button
              type="button"
              disabled={importBusy}
              onClick={async () => {
                setImportBusy(true);
                try {
                  const batch = await apiPost<{ id: string; rowCount: number }>(
                    "/admin/users/import",
                    { csv },
                    { timeoutMs: 120_000 },
                  );
                  const queued = await apiPost<{
                    id: string;
                    status: string;
                    queued?: boolean;
                    message?: string;
                  }>(`/admin/users/import/${batch.id}/activate`, {}, { timeoutMs: 30_000 });

                  if (queued.status === "activated") {
                    void reload();
                    return;
                  }

                  const started = Date.now();
                  const maxWaitMs = 15 * 60 * 1000;
                  while (Date.now() - started < maxWaitMs) {
                    await new Promise((r) => setTimeout(r, 2000));
                    const status = await api<{
                      id: string;
                      status: string;
                      rowCount: number;
                      counts: { pending: number; activated: number; failed: number; skipped: number };
                      done: boolean;
                    }>(`/admin/users/import/${batch.id}/status`, {}, { timeoutMs: 30_000 });

                    if (status.status === "activated") {
                      void reload();
                      return;
                    }
                    if (status.status === "rejected") {
                      throw new Error(
                        `Import failed after ${status.counts.activated} activated / ${status.counts.failed} failed.`,
                      );
                    }
                  }
                  throw new Error("Import is still processing — refresh later to check status.");
                } catch {
                  setImportBusy(false);
                }
              }}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#d95c26] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[#c04d1c] active:scale-[0.98] disabled:opacity-60"
            >
              {importBusy ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/60 border-t-white" />
                  Importing…
                </>
              ) : (
                <>
                  <UploadCloudIcon className="h-4 w-4" />
                  Import and activate
                </>
              )}
            </button>
          </div>
        </section>

        <UserTable<PortalUser>
          toolbar={tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`whitespace-nowrap rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all ${
                tab === t.key ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-500 hover:text-neutral-800"
              }`}
            >
              {t.label} <span className="font-normal text-neutral-400">({t.count})</span>
            </button>
          ))}
          rows={rowsFor}
          rowKey={(u) => u.id}
          searchPlaceholder="Search users..."
          searchFn={(u, q) => u.fullName.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)}
          emptyLabel="No users match your search."
          columns={[
            {
              label: "Name",
              render: (u) => (
                <span className="flex items-center gap-2.5">
                  <Avatar src={u.avatarUrl || null} seed={u.fullName || u.email || "user"} className="h-8 w-8" />
                  <span className="font-bold text-brand-deep">{u.fullName}</span>
                </span>
              ),
            },
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