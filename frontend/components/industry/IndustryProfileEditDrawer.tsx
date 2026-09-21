"use client";

import { useEffect, useState } from "react";
import { useIndustryProfile, type IndustryEditSection, type IndustryProfile } from "./IndustryProfileProvider";
import DrawerShell from "../profile/DrawerShell";
import DrawerSectionNav, { type DrawerSection } from "../profile/DrawerSectionNav";
import TextInput from "../profile/TextInput";
import { UserIcon, CpuIcon } from "../dashboard/icons";

const sections: DrawerSection<IndustryEditSection>[] = [
  { key: "profile", label: "Basic Info", icon: UserIcon },
  { key: "expertise", label: "Domain & Expertise", icon: CpuIcon },
];

function toTags(value: string): string[] {
  return value
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

function TagEditor({
  values,
  onChange,
  placeholder,
}: {
  values: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
}) {
  const [text, setText] = useState(values.join(", "));

  useEffect(() => {
    setText(values.join(", "));
  }, [values]);

  const preview = text.trim() ? toTags(text) : values;

  return (
    <div className="space-y-1.5">
      <input
        type="text"
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          onChange(toTags(e.target.value));
        }}
        placeholder={placeholder}
        className="w-full rounded-xl border border-brand-sand bg-white px-4 py-2.5 text-sm font-medium text-brand-charcoal shadow-sm transition-all placeholder:text-brand-charcoal/50 focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 outline-none"
      />
      {preview.length > 0 ? (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {preview.map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-brand-primary/20 bg-brand-lightOrange px-2.5 py-0.5 text-[11px] font-semibold text-brand-primary"
            >
              {tag}
            </span>
          ))}
        </div>
      ) : null}
      <p className="text-[11px] text-brand-muted">Separate entries with commas.</p>
    </div>
  );
}

const labelClass = "block text-xs font-bold uppercase tracking-wider text-brand-deep";

export default function IndustryProfileEditDrawer() {
  const { profile, saving, drawerOpen, section, openDrawer, closeDrawer, saveProfile } = useIndustryProfile();

  const [draft, setDraft] = useState<IndustryProfile>(profile);
  const [error, setError] = useState("");

  useEffect(() => {
    if (drawerOpen) {
      setDraft(profile);
      setError("");
    }
  }, [drawerOpen, profile]);

  const patch = (p: Partial<IndustryProfile>) => setDraft((prev) => ({ ...prev, ...p }));

  const handleSave = () => {
    setError("");
    if (!draft.fullName.trim()) {
      setError("Full Name is required.");
      return;
    }
    void saveProfile(draft)
      .then(() => closeDrawer())
      .catch((err) => setError(err instanceof Error ? err.message : "Could not save profile"));
  };

  return (
    <DrawerShell
      open={drawerOpen}
      title="Edit Profile"
      subtitle="Changes save on the server."
      icon={<UserIcon className="h-5 w-5 text-brand-primary" />}
      onClose={closeDrawer}
      footer={
        <div className="flex gap-3">
          <button
            type="button"
            onClick={closeDrawer}
            disabled={saving}
            className="flex-1 rounded-xl border border-brand-sand px-4 py-3 text-sm font-bold text-brand-charcoal/70 transition-colors hover:border-brand-primary/40 hover:text-brand-primary disabled:opacity-50"
          >
            Discard
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex-1 rounded-xl bg-[#d95c26] px-6 py-2.5 font-medium text-white transition-colors hover:bg-[#c04d1c] disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      }
    >
      <DrawerSectionNav sections={sections} active={section} onSelect={openDrawer} />

      {error ? (
        <p className="mb-3 rounded-lg border border-brand-overdue/20 bg-brand-overdue/5 px-3 py-2 text-xs font-semibold text-brand-overdue">
          {error}
        </p>
      ) : null}

      {section === "profile" && (
        <div className="space-y-4">
          <TextInput
            label="Full Name"
            value={draft.fullName}
            onChange={(fullName) => patch({ fullName })}
            required
          />
          <TextInput
            label="Company / Organization"
            value={draft.company}
            onChange={(company) => patch({ company })}
            placeholder="e.g. Partner Health Systems"
            required
          />
          <TextInput
            label="Designation / Department"
            value={draft.designation}
            onChange={(designation) => patch({ designation })}
            placeholder="e.g. Chief Innovation Officer"
            required
          />
          <div className="space-y-1.5">
            <label className={labelClass}>Official Email</label>
            <input
              type="email"
              value={draft.email}
              readOnly
              className="w-full cursor-not-allowed rounded-xl border border-brand-sand bg-brand-cream px-4 py-2.5 text-sm font-medium text-brand-muted"
            />
          </div>
          <TextInput
            label="Contact Phone"
            type="tel"
            value={draft.phone}
            onChange={(phone) => patch({ phone })}
            placeholder="e.g. +91 98765 43210"
          />
          <TextInput
            label="Office Location"
            value={draft.location}
            onChange={(location) => patch({ location })}
            placeholder="e.g. Pune, Maharashtra"
          />
        </div>
      )}

      {section === "expertise" && (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className={labelClass}>Domain Expertise</label>
            <TagEditor
              values={draft.domainExpertise}
              onChange={(domainExpertise) => patch({ domainExpertise })}
              placeholder="e.g. Cloud Systems, AI/ML, FinTech"
            />
          </div>
          <div className="space-y-1.5">
            <label className={labelClass}>Core Skills / Tech Stack</label>
            <TagEditor
              values={draft.coreSkills}
              onChange={(coreSkills) => patch({ coreSkills })}
              placeholder="e.g. Kubernetes, Python, AWS, React"
            />
          </div>
          <TextInput
            label="Industry Experience (Years)"
            value={draft.experienceYears}
            onChange={(experienceYears) => patch({ experienceYears })}
            placeholder="e.g. 10"
          />
          <TextInput
            label="LinkedIn / Profile URL"
            type="url"
            value={draft.linkedinUrl}
            onChange={(linkedinUrl) => patch({ linkedinUrl })}
            placeholder="https://linkedin.com/in/..."
          />
        </div>
      )}
    </DrawerShell>
  );
}