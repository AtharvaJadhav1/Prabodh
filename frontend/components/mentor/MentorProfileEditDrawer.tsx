"use client";

import { useEffect, useState } from "react";
import type {
  MentorProfile,
  MentorCohort,
  MentorExpertise,
  MentorTrackRecordEntry,
} from "../../data/mentorDashboard";
import {
  useMentorProfile,
  type MentorEditSection,
} from "./MentorProfileProvider";
import DrawerShell from "../profile/DrawerShell";
import DrawerSectionNav, { type DrawerSection } from "../profile/DrawerSectionNav";
import TextInput from "../profile/TextInput";
import TextArea from "../profile/TextArea";
import ItemListEditor from "../profile/ItemListEditor";
import {
  UserIcon,
  Share2Icon,
  LayoutDashboardIcon,
  CpuIcon,
  TrophyIcon,
} from "../dashboard/icons";

const sections: DrawerSection<MentorEditSection>[] = [
  { key: "basic", label: "Basic Info", icon: UserIcon },
  { key: "socials", label: "Socials", icon: Share2Icon },
  { key: "overview", label: "Overview", icon: LayoutDashboardIcon },
  { key: "expertise", label: "Expertise", icon: CpuIcon },
  { key: "record", label: "Track Record", icon: TrophyIcon },
];

const designationOptions = [
  "Assistant Professor",
  "Associate Professor",
  "Professor",
  "Professor & Head of Department (HOD)",
  "Dean / Associate Dean",
  "Adjunct / Visiting Faculty",
  "Research Scholar / Teaching Assistant",
  "Other / Custom",
];

const designationChips = ["Assistant Professor", "Associate Professor", "Professor", "Professor & Head of Department (HOD)"];

const labelClass = "block text-xs font-bold uppercase tracking-wider text-brand-deep";

const selectClass =
  "w-full rounded-xl border border-brand-sand bg-white px-4 py-2.5 text-sm font-medium text-brand-charcoal shadow-sm transition-all focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 outline-none";

export default function MentorProfileEditDrawer() {
  const {
    profile,
    saving,
    drawerOpen,
    section,
    openDrawer,
    closeDrawer,
    saveProfile,
  } = useMentorProfile();

  const [draft, setDraft] = useState<MentorProfile>(profile);
  const [customDesignation, setCustomDesignation] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (drawerOpen) {
      setDraft(profile);
      setError("");
    }
  }, [drawerOpen, profile]);

  const patch = (p: Partial<MentorProfile>) => setDraft((prev) => ({ ...prev, ...p }));

  const handleSave = () => {
    setError("");
    void saveProfile(draft)
      .then(() => closeDrawer())
      .catch((err) => setError(err instanceof Error ? err.message : "Could not save profile"));
  };

  const socialEmpty = { label: "", href: "" };
  const expertiseEmpty: MentorExpertise = { area: "", focusLevel: "Secondary", details: "" };
  const recordEmpty: MentorTrackRecordEntry = {
    season: "",
    teamName: "",
    outcome: "",
    result: "Qualified",
  };

  return (
    <DrawerShell
      open={drawerOpen}
      title="Edit Profile"
      subtitle="Changes stay saved for this session."
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
            className="flex-1 rounded-xl bg-brand-primary px-4 py-3 text-sm font-bold text-white shadow-md shadow-brand-primary/25 transition-colors hover:bg-brand-hover disabled:opacity-60"
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

      {section === "basic" && (
        <div className="space-y-4">
          <TextInput
            label="Full Name"
            value={draft.fullName}
            onChange={(fullName) => patch({ fullName })}
            required
          />
          <div className="space-y-1.5">
            <label className={labelClass}>
              Designation<span className="text-brand-primary"> *</span>
            </label>
            <select
              value={
                !draft.designation
                  ? ""
                  : designationOptions.includes(draft.designation)
                    ? draft.designation
                    : "Other / Custom"
              }
              onChange={(e) => {
                const value = e.target.value;
                if (value === "Other / Custom") {
                  setCustomDesignation(draft.designation);
                  patch({ designation: draft.designation });
                } else {
                  setCustomDesignation("");
                  patch({ designation: value });
                }
              }}
              className={selectClass}
            >
              {!draft.designation ? (
                <option value="" disabled>
                  Select a designation…
                </option>
              ) : null}
              {designationOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            {!draft.designation || designationOptions.includes(draft.designation) ? null : (
              <TextInput
                label="Custom Designation"
                value={draft.designation}
                onChange={(designation) => {
                  setCustomDesignation(designation);
                  patch({ designation });
                }}
                placeholder="e.g. Director, Training & Placement"
                required
              />
            )}
            <div className="flex flex-wrap gap-1.5 pt-1.5">
              {designationChips.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => {
                    setCustomDesignation("");
                    patch({ designation: chip });
                  }}
                  className={`border border-brand-softline bg-brand-canvas px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    draft.designation === chip
                      ? "border-brand-primary/40 text-brand-primary"
                      : "text-brand-charcoal/80 hover:bg-brand-primary/10"
                  }`}
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>
          <TextInput
            label="Department / Discipline"
            value={draft.department}
            onChange={(department) => patch({ department })}
            placeholder="e.g. CSE, IT, AI & ML, Mechanical, Electronics"
            required
          />
          <TextInput
            label="Email"
            type="email"
            value={draft.email}
            onChange={(email) => patch({ email })}
            required
          />
          <TextInput
            label="Location"
            value={draft.location}
            onChange={(location) => patch({ location })}
            placeholder="e.g. Block S-309"
          />
          <TextInput
            label="Role Badge"
            value={draft.roleBadge}
            onChange={(roleBadge) => patch({ roleBadge })}
            required
          />
        </div>
      )}

      {section === "socials" && (
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-brand-deep">
            Social &amp; Research Links
          </h3>
          <TextInput
            label="LinkedIn Profile URL"
            type="url"
            value={draft.linkedinUrl}
            onChange={(linkedinUrl) => patch({ linkedinUrl })}
            placeholder="https://linkedin.com/in/..."
          />
          <p className="text-xs text-brand-muted">
            Students see this as a LinkedIn icon beside your name when they invite you. Leave blank to hide it.
          </p>
          <ItemListEditor<{ label: string; href: string }>
            items={draft.socials}
            onChange={(socials) => patch({ socials })}
            createEmpty={() => socialEmpty}
            addLabel="Add Link"
            itemLabel="Link"
            renderItem={(item, update) => (
              <>
                <TextInput
                  label="Label"
                  value={item.label}
                  onChange={(label) => update({ label })}
                  placeholder="e.g. Google Scholar"
                  required
                />
                <TextInput
                  label="URL"
                  type="url"
                  value={item.href}
                  onChange={(href) => update({ href })}
                  placeholder="https://..."
                  required
                />
              </>
            )}
          />
        </div>
      )}

      {section === "overview" && (
        <div className="space-y-6">
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-brand-deep">
              Next Action
            </h3>
            <TextArea
              label="Next Action Note"
              rows={3}
              value={draft.nextAction}
              onChange={(nextAction) => patch({ nextAction })}
            />
          </div>

          <p className="rounded-xl border border-brand-sand bg-brand-cream p-3 text-xs text-brand-muted">
            Assigned cohorts, team counts and student totals are generated automatically from the teams you mentor,
            so there is nothing to edit here.
          </p>
        </div>
      )}

      {section === "expertise" && (
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-brand-deep">
            Domain Expertise
          </h3>
          <ItemListEditor<MentorExpertise>
            items={draft.domainExpertise}
            onChange={(domainExpertise) => patch({ domainExpertise })}
            createEmpty={() => expertiseEmpty}
            addLabel="Add Expertise Area"
            itemLabel="Area"
            renderItem={(item, update) => (
              <>
                <TextInput
                  label="Area"
                  value={item.area}
                  onChange={(area) => update({ area })}
                  required
                />
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-brand-deep">
                    Focus Level
                  </label>
                  <select
                    value={item.focusLevel}
                    onChange={(e) => update({ focusLevel: e.target.value as MentorExpertise["focusLevel"] })}
                    className={selectClass}
                  >
                    <option value="Primary">Primary</option>
                    <option value="Secondary">Secondary</option>
                  </select>
                </div>
                <TextArea
                  label="Details"
                  rows={2}
                  value={item.details}
                  onChange={(details) => update({ details })}
                />
              </>
            )}
          />
        </div>
      )}

      {section === "record" && (
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-brand-deep">
            Track Record
          </h3>
          <ItemListEditor<MentorTrackRecordEntry>
            items={draft.trackRecord}
            onChange={(trackRecord) => patch({ trackRecord })}
            createEmpty={() => recordEmpty}
            addLabel="Add Record Entry"
            itemLabel="Entry"
            renderItem={(item, update) => (
              <>
                <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
                  <TextInput
                    label="Season"
                    value={item.season}
                    onChange={(season) => update({ season })}
                    placeholder="e.g. SIH 2025"
                    required
                  />
                  <TextInput
                    label="Team"
                    value={item.teamName}
                    onChange={(teamName) => update({ teamName })}
                    required
                  />
                </div>
                <TextInput
                  label="Outcome"
                  value={item.outcome}
                  onChange={(outcome) => update({ outcome })}
                  placeholder="e.g. National Finalist — Smart Mobility track"
                />
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-brand-deep">
                    Result
                  </label>
                  <select
                    value={item.result}
                    onChange={(e) => update({ result: e.target.value as MentorTrackRecordEntry["result"] })}
                    className={selectClass}
                  >
                    <option value="Winner">Winner</option>
                    <option value="Runner-up">Runner-up</option>
                    <option value="Finalist">Finalist</option>
                    <option value="Qualified">Qualified</option>
                  </select>
                </div>
              </>
            )}
          />
        </div>
      )}
    </DrawerShell>
  );
}