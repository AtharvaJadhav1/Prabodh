"use client";

import { useEffect, useState } from "react";
import IndustryShell from "../../../../components/industry/IndustryShell";
import TextInput from "../../../../components/profile/TextInput";
import { useAuth, initialsFrom } from "../../../../components/auth/AuthProvider";
import { apiPatch } from "../../../../lib/api";

export default function IndustryProfilePage() {
  const { session, refreshMe } = useAuth();
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [department, setDepartment] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!session) return;
    setName(session.fullName);
    setCompany(session.institute ?? "");
    setDepartment(session.department ?? "");
    setPhone(session.phone ?? "");
  }, [session]);

  return (
    <IndustryShell
      breadcrumb={[{ label: "SIH 2026 Portal" }, { label: "Industry Mentorship" }, { label: "My Profile" }]}
      title="Industry Mentor Profile"
      subtitle="View and manage your industry mentor identity."
      showActions={false}
    >
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex items-center gap-4 rounded-2xl border border-brand-sand bg-white p-6 shadow-sm">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-brand-deep text-lg font-bold tracking-wider text-white shadow-xs">
            {initialsFrom(session?.fullName ?? "I")}
          </div>
          <div>
            <h2 className="text-lg font-bold text-brand-deep">{name || session?.fullName}</h2>
            <p className="text-xs text-brand-muted">{department} &middot; {company}</p>
            <span className="mt-1 inline-block rounded bg-brand-cream px-2 py-0.5 text-[10px] font-mono text-brand-muted border border-brand-sand">
              {session?.email}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 rounded-2xl border border-brand-sand bg-white p-6 shadow-sm sm:grid-cols-2">
          <TextInput label="Full Name" value={name} onChange={setName} required />
          <TextInput label="Company / Organization" value={company} onChange={setCompany} required />
          <TextInput label="Designation / Department" value={department} onChange={setDepartment} />
          <TextInput label="Official Email" type="email" value={session?.email ?? ""} onChange={() => undefined} />
          <TextInput label="Contact Phone" type="tel" value={phone} onChange={setPhone} />
        </div>

        {error ? <p className="text-sm text-red-700">{error}</p> : null}

        <button
          type="button"
          disabled={saving}
          onClick={async () => {
            setError("");
            setSaving(true);
            try {
              await apiPatch("/me", { fullName: name, institute: company, department, phone });
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
    </IndustryShell>
  );
}
