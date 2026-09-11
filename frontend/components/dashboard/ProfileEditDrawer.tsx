"use client";

import { useEffect, useState } from "react";
import type {
  Profile,
  Skill,
  Project,
  Certification,
  Experience,
  Achievement,
} from "../../data/studentProfile";
import { useProfile, type StudentEditSection } from "./ProfileProvider";
import DrawerShell from "../profile/DrawerShell";
import DrawerSectionNav, { type DrawerSection } from "../profile/DrawerSectionNav";
import TextInput from "../profile/TextInput";
import TextArea from "../profile/TextArea";
import ItemListEditor from "../profile/ItemListEditor";
import StringListEditor from "../profile/StringListEditor";
import {
  UserIcon,
  MailIcon,
  CodeIcon,
  RocketIcon,
  AwardIcon,
  BriefcaseIcon,
  TrophyIcon,
} from "./icons";

const sections: DrawerSection<StudentEditSection>[] = [
  { key: "basic", label: "Basic Info", icon: UserIcon },
  { key: "contacts", label: "Contacts", icon: MailIcon },
  { key: "skills", label: "Skills", icon: CodeIcon },
  { key: "projects", label: "Projects", icon: RocketIcon },
  { key: "certifications", label: "Certifications", icon: AwardIcon },
  { key: "experience", label: "Experience", icon: BriefcaseIcon },
  { key: "achievements", label: "Achievements", icon: TrophyIcon },
];

type CheckboxRowProps = {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
};

function CheckboxRow({ label, checked, onChange }: CheckboxRowProps) {
  return (
    <label className="flex w-full cursor-pointer items-center justify-between rounded-xl border border-brand-softline bg-white px-4 py-2.5 shadow-sm">
      <span className="text-sm font-semibold text-brand-deep">{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 accent-brand-primary"
      />
    </label>
  );
}

export default function ProfileEditDrawer() {
  const {
    profile,
    drawerOpen,
    section,
    openDrawer,
    closeDrawer,
    updateBasicInfo,
    updateContacts,
    updateSkills,
    setProjects,
    setCertifications,
    setExperience,
    setAchievements,
    saveProfileJson,
  } = useProfile();

  const [draft, setDraft] = useState<Profile>(profile);

  useEffect(() => {
    if (drawerOpen) setDraft(profile);
  }, [drawerOpen, profile]);

  const patch = (p: Partial<Profile>) => setDraft((prev) => ({ ...prev, ...p }));
  const patchContacts = (contacts: Profile["contacts"]) => patch({ contacts });
  const patchSkills = (skills: Profile["skills"]) => patch({ skills });

  const handleSave = () => {
    updateBasicInfo({
      fullName: draft.fullName,
      bio: draft.bio,
      school: draft.school,
      team: draft.team,
      role: draft.role,
      hackathonBadge: draft.hackathonBadge,
    });
    updateContacts(draft.contacts);
    updateSkills(draft.skills);
    setProjects(draft.projects);
    setCertifications(draft.certifications);
    setExperience(draft.experience);
    setAchievements(draft.achievements);
    void saveProfileJson(draft).then(() => closeDrawer());
  };

  const primaryEmpty: Skill = { name: "", level: undefined, tag: undefined };
  const projectEmpty: Project = { title: "", badge: "", team: "", role: "", repo: "", description: "", stack: [] };
  const certEmpty: Certification = { name: "", issuer: "", credential: "", date: "", verified: false };
  const expEmpty: Experience = { title: "", org: "", period: "", location: "", current: false, description: "" };
  const achievementEmpty: Achievement = { title: "", description: "" };

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
            className="flex-1 rounded-xl border border-brand-softline px-4 py-3 text-sm font-bold text-brand-charcoal/70 transition-colors hover:border-brand-primary/40 hover:text-brand-primary"
          >
            Discard
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex-1 rounded-xl bg-brand-primary px-4 py-3 text-sm font-bold text-white shadow-md shadow-brand-primary/25 transition-colors hover:bg-brand-hover"
          >
            Save Changes
          </button>
        </div>
      }
    >
      <DrawerSectionNav sections={sections} active={section} onSelect={openDrawer} />

      {section === "basic" && (
        <div className="space-y-4">
          <TextInput
            label="Full Name"
            value={draft.fullName}
            onChange={(fullName) => patch({ fullName })}
            required
          />
          <TextArea
            label="Bio"
            rows={3}
            value={draft.bio}
            onChange={(bio) => patch({ bio })}
          />
          <TextInput
            label="School"
            value={draft.school}
            onChange={(school) => patch({ school })}
            required
          />
          <div className="grid grid-cols-2 gap-3">
            <TextInput
              label="Team"
              value={draft.team}
              onChange={(team) => patch({ team })}
              required
            />
            <TextInput
              label="Role"
              value={draft.role}
              onChange={(role) => patch({ role })}
              required
            />
          </div>
          <TextInput
            label="Hackathon Badge"
            value={draft.hackathonBadge}
            onChange={(hackathonBadge) => patch({ hackathonBadge })}
          />
        </div>
      )}

      {section === "contacts" && (
        <div className="space-y-4">
          <TextInput
            label="Phone"
            type="tel"
            value={draft.contacts.phone}
            onChange={(phone) => patchContacts({ ...draft.contacts, phone })}
          />
          <TextInput
            label="Email"
            type="email"
            value={draft.contacts.email}
            onChange={(email) => patchContacts({ ...draft.contacts, email })}
            required
          />
          <TextInput
            label="GitHub Profile URL"
            type="url"
            value={draft.contacts.github}
            onChange={(github) => patchContacts({ ...draft.contacts, github })}
            placeholder="https://github.com/username"
          />
          <TextInput
            label="LinkedIn URL"
            type="url"
            value={draft.contacts.linkedin}
            onChange={(linkedin) => patchContacts({ ...draft.contacts, linkedin })}
            placeholder="https://linkedin.com/in/username"
          />
          <TextInput
            label="Personal Website"
            type="url"
            value={draft.contacts.website}
            onChange={(website) => patchContacts({ ...draft.contacts, website })}
            placeholder="https://yourdomain.dev"
          />
        </div>
      )}

      {section === "skills" && (
        <div className="space-y-6">
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-brand-deep">
              Primary Technical Skills
            </h3>
            <ItemListEditor<Skill>
              items={draft.skills.primary}
              onChange={(primary) => patchSkills({ ...draft.skills, primary })}
              createEmpty={() => primaryEmpty}
              addLabel="Add Primary Skill"
              itemLabel="Skill"
              renderItem={(item, update) => (
                <>
                  <TextInput
                    label="Skill Name"
                    value={item.name}
                    onChange={(name) => update({ name })}
                    required
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <TextInput
                      label="Level (optional)"
                      value={item.level ?? ""}
                      onChange={(level) => update({ level: level || undefined })}
                      placeholder="e.g. Advanced"
                    />
                    <TextInput
                      label="Tag (optional)"
                      value={item.tag ?? ""}
                      onChange={(tag) => update({ tag: tag || undefined })}
                      placeholder="e.g. SIH Focus"
                    />
                  </div>
                </>
              )}
            />
          </div>

          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-brand-deep">
              Secondary Skills / Tools
            </h3>
            <StringListEditor
              items={draft.skills.secondary}
              onChange={(secondary) => patchSkills({ ...draft.skills, secondary })}
              label="Secondary Skill"
              placeholder="e.g. Docker"
            />
          </div>

          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-brand-deep">
              Hackathon Tracks
            </h3>
            <StringListEditor
              items={draft.skills.tracks}
              onChange={(tracks) => patchSkills({ ...draft.skills, tracks })}
              label="Track"
              placeholder="e.g. AI / Machine Learning"
            />
          </div>
        </div>
      )}

      {section === "projects" && (
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-brand-deep">
            Projects &amp; Repositories
          </h3>
          <ItemListEditor<Project>
            items={draft.projects}
            onChange={(projects) => patch({ projects })}
            createEmpty={() => projectEmpty}
            addLabel="Add Project"
            itemLabel="Project"
            renderItem={(item, update) => (
              <>
                <TextInput
                  label="Title"
                  value={item.title}
                  onChange={(title) => update({ title })}
                  required
                />
                <TextInput
                  label="Badge (optional)"
                  value={item.badge ?? ""}
                  onChange={(badge) => update({ badge: badge || undefined })}
                  placeholder="e.g. SIH Selected"
                />
                <TextInput
                  label="Team"
                  value={item.team}
                  onChange={(team) => update({ team })}
                  required
                />
                <TextInput
                  label="Role (optional)"
                  value={item.role ?? ""}
                  onChange={(role) => update({ role: role || undefined })}
                />
                <TextInput
                  label="Repository URL"
                  type="url"
                  value={item.repo}
                  onChange={(repo) => update({ repo })}
                />
                <TextArea
                  label="Description"
                  rows={3}
                  value={item.description}
                  onChange={(description) => update({ description })}
                  required
                />
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-brand-deep">
                    Tech Stack
                  </label>
                  <StringListEditor
                    items={item.stack}
                    onChange={(stack) => update({ stack })}
                    label="Tech"
                    placeholder="e.g. FastAPI"
                  />
                </div>
              </>
            )}
          />
        </div>
      )}

      {section === "certifications" && (
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-brand-deep">
            Certifications
          </h3>
          <ItemListEditor<Certification>
            items={draft.certifications}
            onChange={(certifications) => patch({ certifications })}
            createEmpty={() => certEmpty}
            addLabel="Add Certification"
            itemLabel="Certification"
            renderItem={(item, update) => (
              <>
                <TextInput
                  label="Name"
                  value={item.name}
                  onChange={(name) => update({ name })}
                  required
                />
                <TextInput
                  label="Issuer"
                  value={item.issuer}
                  onChange={(issuer) => update({ issuer })}
                  required
                />
                <div className="grid grid-cols-2 gap-3">
                  <TextInput
                    label="Credential ID (optional)"
                    value={item.credential ?? ""}
                    onChange={(credential) => update({ credential: credential || undefined })}
                  />
                  <TextInput
                    label="Date (optional)"
                    value={item.date ?? ""}
                    onChange={(date) => update({ date: date || undefined })}
                    placeholder="e.g. Dec 2023"
                  />
                </div>
                <CheckboxRow
                  label="Verified"
                  checked={item.verified}
                  onChange={(verified) => update({ verified })}
                />
              </>
            )}
          />
        </div>
      )}

      {section === "experience" && (
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-brand-deep">
            Work Experience
          </h3>
          <ItemListEditor<Experience>
            items={draft.experience}
            onChange={(experience) => patch({ experience })}
            createEmpty={() => expEmpty}
            addLabel="Add Experience"
            itemLabel="Entry"
            renderItem={(item, update) => (
              <>
                <TextInput
                  label="Title"
                  value={item.title}
                  onChange={(title) => update({ title })}
                  required
                />
                <TextInput
                  label="Organization"
                  value={item.org}
                  onChange={(org) => update({ org })}
                  required
                />
                <TextInput
                  label="Period"
                  value={item.period}
                  onChange={(period) => update({ period })}
                  placeholder="e.g. Aug 2023 – Present"
                  required
                />
                <TextInput
                  label="Location (optional)"
                  value={item.location ?? ""}
                  onChange={(location) => update({ location: location || undefined })}
                />
                <TextArea
                  label="Description"
                  rows={3}
                  value={item.description}
                  onChange={(description) => update({ description })}
                />
                <CheckboxRow
                  label="Currently working here"
                  checked={item.current ?? false}
                  onChange={(current) => update({ current })}
                />
              </>
            )}
          />
        </div>
      )}

      {section === "achievements" && (
        <div className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-brand-deep">
            Achievements
          </h3>
          <ItemListEditor<Achievement>
            items={draft.achievements}
            onChange={(achievements) => patch({ achievements })}
            createEmpty={() => achievementEmpty}
            addLabel="Add Achievement"
            itemLabel="Achievement"
            renderItem={(item, update) => (
              <>
                <TextInput
                  label="Title"
                  value={item.title}
                  onChange={(title) => update({ title })}
                  required
                />
                <TextArea
                  label="Description"
                  rows={3}
                  value={item.description}
                  onChange={(description) => update({ description })}
                />
              </>
            )}
          />
        </div>
      )}
    </DrawerShell>
  );
}