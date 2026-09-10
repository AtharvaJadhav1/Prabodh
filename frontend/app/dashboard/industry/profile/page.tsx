"use client";

import { useState } from "react";
import IndustryShell from "../../../../components/industry/IndustryShell";
import TextInput from "../../../../components/profile/TextInput";
import StringListEditor from "../../../../components/profile/StringListEditor";
import { industryMentor } from "../../../../data/industryDashboard";

export default function IndustryProfilePage() {
  const [name, setName] = useState(industryMentor.name);
  const [email, setEmail] = useState(industryMentor.email);
  const [phone, setPhone] = useState(industryMentor.phone);
  const [company, setCompany] = useState(industryMentor.company);
  const [designation, setDesignation] = useState(industryMentor.designation);
  const [expertise, setExpertise] = useState<string[]>(industryMentor.expertise);

  return (
    <IndustryShell
      breadcrumb={[{ label: "SIH 2026 Portal" }, { label: "Industry Mentorship" }, { label: "My Profile" }]}
      title="Industry Mentor Profile"
      subtitle="View and manage your industry mentor identity and domain expertise."
      showActions={false}
    >
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex items-center gap-4 rounded-2xl border border-brand-sand bg-white p-6 shadow-sm">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-brand-deep text-lg font-bold tracking-wider text-white shadow-xs">
            {industryMentor.initials}
          </div>
          <div>
            <h2 className="text-lg font-bold text-brand-deep">{name}</h2>
            <p className="text-xs text-brand-muted">{designation} &middot; {company}</p>
            <span className="mt-1 inline-block rounded bg-brand-cream px-2 py-0.5 text-[10px] font-mono text-brand-muted border border-brand-sand">
              ID: {industryMentor.id}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 rounded-2xl border border-brand-sand bg-white p-6 shadow-sm sm:grid-cols-2">
          <TextInput label="Full Name" value={name} onChange={setName} required />
          <TextInput label="Company / Organization" value={company} onChange={setCompany} required />
          <TextInput label="Designation" value={designation} onChange={setDesignation} required />
          <TextInput label="Official Email" type="email" value={email} onChange={setEmail} required />
          <TextInput label="Contact Phone" type="tel" value={phone} onChange={setPhone} />
        </div>

        <div className="space-y-2 rounded-2xl border border-brand-sand bg-white p-6 shadow-sm">
          <label className="block text-xs font-bold uppercase tracking-wider text-brand-deep">
            Domain Expertise
          </label>
          <StringListEditor
            items={expertise}
            onChange={setExpertise}
            label="Domain Expertise"
            placeholder="Add an area of expertise..."
          />
        </div>

        <button
          type="button"
          className="w-full rounded-xl bg-brand-primary px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-primary/25 transition-all hover:bg-brand-hover active:scale-[0.99] sm:w-auto"
        >
          Save Changes
        </button>
      </div>
    </IndustryShell>
  );
}
