"use client";

import { FormEvent, useEffect, useState } from "react";
import { apiPatch } from "../../../../lib/api";
import { useAuth } from "../../../../components/auth/AuthProvider";

export default function ExpertProfilePage() {
  const { session, ready, refreshMe } = useAuth();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [institute, setInstitute] = useState("");
  const [department, setDepartment] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!session) return;
    setFullName(session.fullName ?? "");
    setPhone(session.phone ?? "");
    setInstitute(session.institute ?? "");
    setDepartment(session.department ?? "");
  }, [session]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");
    try {
      await apiPatch("/me", {
        fullName: fullName.trim(),
        phone: phone.trim() || undefined,
        institute: institute.trim() || undefined,
        department: department.trim() || undefined,
      });
      await refreshMe();
      setMessage("Profile updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update profile");
    } finally {
      setSaving(false);
    }
  }

  if (!ready) {
    return <p className="text-sm text-brand-muted">Loading profile…</p>;
  }

  if (!session) {
    return <p className="text-sm text-brand-muted">Sign in to view your profile.</p>;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-bold tracking-tight text-brand-deep sm:text-3xl">Profile</h1>
        <p className="mt-2 text-sm leading-relaxed text-brand-muted">
          Your account details from Prabodh. Email is managed by your administrator.
        </p>
      </div>

      <form
        onSubmit={(e) => void onSubmit(e)}
        className="space-y-4 rounded-2xl border border-brand-softline bg-white p-6 shadow-sm"
      >
        <div className="space-y-1.5">
          <label htmlFor="expert-email" className="block text-xs font-bold uppercase tracking-wider text-brand-deep">
            Email
          </label>
          <input
            id="expert-email"
            type="email"
            value={session.email}
            disabled
            className="w-full rounded-xl border border-brand-sand bg-brand-cream/60 px-4 py-3 text-sm font-medium text-brand-muted outline-none"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="expert-name" className="block text-xs font-bold uppercase tracking-wider text-brand-deep">
            Full name
          </label>
          <input
            id="expert-name"
            type="text"
            required
            minLength={2}
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full rounded-xl border border-brand-sand bg-white px-4 py-3 text-sm font-medium text-brand-charcoal outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="expert-phone" className="block text-xs font-bold uppercase tracking-wider text-brand-deep">
            Phone
          </label>
          <input
            id="expert-phone"
            type="text"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Optional"
            className="w-full rounded-xl border border-brand-sand bg-white px-4 py-3 text-sm font-medium text-brand-charcoal outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
          />
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="expert-institute"
            className="block text-xs font-bold uppercase tracking-wider text-brand-deep"
          >
            Institute
          </label>
          <input
            id="expert-institute"
            type="text"
            value={institute}
            onChange={(e) => setInstitute(e.target.value)}
            className="w-full rounded-xl border border-brand-sand bg-white px-4 py-3 text-sm font-medium text-brand-charcoal outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
          />
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="expert-department"
            className="block text-xs font-bold uppercase tracking-wider text-brand-deep"
          >
            Department
          </label>
          <input
            id="expert-department"
            type="text"
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            className="w-full rounded-xl border border-brand-sand bg-white px-4 py-3 text-sm font-medium text-brand-charcoal outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
          />
        </div>

        {error ? <p className="text-sm font-medium text-red-700">{error}</p> : null}
        {message ? <p className="text-sm font-medium text-emerald-700">{message}</p> : null}

        <button
          type="submit"
          disabled={saving || fullName.trim().length < 2}
          className="inline-flex items-center justify-center rounded-xl bg-brand-primary px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-hover disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save profile"}
        </button>
      </form>
    </div>
  );
}
