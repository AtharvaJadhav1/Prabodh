"use client";

import { useState } from "react";
import AdminShell from "../../../../components/admin/AdminShell";
import TextInput from "../../../../components/profile/TextInput";
import { admin } from "../../../../data/adminDashboard";

export default function AdminProfilePage() {
  const [name, setName] = useState(admin.name);
  const [title, setTitle] = useState(admin.title);
  const [empId] = useState(admin.empId);

  return (
    <AdminShell
      breadcrumb={[{ label: "SIH 2026 Portal" }, { label: "Admin Console" }, { label: "My Profile" }]}
      title="Admin Profile"
      subtitle="View and manage your administrator identity."
      showActions={false}
    >
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex items-center gap-4 rounded-2xl border border-brand-sand bg-white p-6 shadow-sm">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-brand-deep text-lg font-bold tracking-wider text-white shadow-xs">
            {admin.initials}
          </div>
          <div>
            <h2 className="text-lg font-bold text-brand-deep">{name}</h2>
            <p className="text-xs text-brand-muted">{title} &middot; {admin.role}</p>
            <span className="mt-1 inline-block rounded bg-brand-cream px-2 py-0.5 text-[10px] font-mono text-brand-muted border border-brand-sand">
              EMP: {empId}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 rounded-2xl border border-brand-sand bg-white p-6 shadow-sm sm:grid-cols-2">
          <TextInput label="Full Name" value={name} onChange={setName} required />
          <TextInput label="Title" value={title} onChange={setTitle} required />
        </div>

        <button
          type="button"
          className="w-full rounded-xl bg-brand-primary px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-primary/25 transition-all hover:bg-brand-hover active:scale-[0.99] sm:w-auto"
        >
          Save Changes
        </button>
      </div>
    </AdminShell>
  );
}
