"use client";

import { useEffect, useState } from "react";
import AdminShell from "../../../../components/admin/AdminShell";
import TextInput from "../../../../components/profile/TextInput";
import { useAuth, initialsFrom } from "../../../../components/auth/AuthProvider";
import { apiPatch } from "../../../../lib/api";

export default function AdminProfilePage() {
  const { session, refreshMe } = useAuth();
  const [name, setName] = useState("");
  const [department, setDepartment] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!session) return;
    setName(session.fullName);
    setDepartment(session.department ?? "");
  }, [session]);

  return (
    <AdminShell
      breadcrumb={[{ label: "Prabodh Portal" }, { label: "Admin Console" }, { label: "My Profile" }]}
      title="Admin Profile"
      subtitle="View and manage your administrator identity."
      showActions={false}
    >
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex items-center gap-4 rounded-2xl border border-brand-sand bg-white p-6 shadow-sm">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-brand-deep text-lg font-bold tracking-wider text-white shadow-xs">
            {initialsFrom(session?.fullName ?? "A")}
          </div>
          <div>
            <h2 className="text-lg font-bold text-brand-deep">{name || session?.fullName}</h2>
            <p className="text-xs text-brand-muted">Administrator &middot; {session?.email}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 rounded-2xl border border-brand-sand bg-white p-6 shadow-sm sm:grid-cols-2">
          <TextInput label="Full Name" value={name} onChange={setName} required />
          <TextInput label="Department" value={department} onChange={setDepartment} />
        </div>

        {error ? <p className="text-sm text-red-700">{error}</p> : null}

        <button
          type="button"
          disabled={saving}
          onClick={async () => {
            setError("");
            setSaving(true);
            try {
              await apiPatch("/me", { fullName: name, department });
              await refreshMe();
            } catch (err) {
              setError(err instanceof Error ? err.message : "Save failed");
            } finally {
              setSaving(false);
            }
          }}
          className="w-full rounded-xl bg-brand-primary px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-primary/25 transition-all hover:bg-brand-hover active:scale-[0.99] disabled:opacity-60 sm:w-auto"
        >
          {saving ? "Saving…" : "Save Changes"}
        </button>
      </div>
    </AdminShell>
  );
}
