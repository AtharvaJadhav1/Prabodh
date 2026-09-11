"use client";

import { useState, useEffect } from "react";
import type { IndustryMentor, MentorGroup } from "../../data/mentorDashboard";
import { domainExpertiseOptions } from "../../data/mentorDashboard";
import { XIcon } from "../dashboard/icons";

type Props = {
  open: boolean;
  onClose: () => void;
  onSave: (mentor: IndustryMentor, initialTeamIds: string[]) => void;
  editMentor?: IndustryMentor | null;
  unmappedGroups: MentorGroup[];
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function AddIndustryMentorModal({
  open,
  onClose,
  onSave,
  editMentor,
  unmappedGroups,
}: Props) {
  const isEdit = !!editMentor;

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [designation, setDesignation] = useState("");
  const [expertise, setExpertise] = useState<string[]>([]);
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]);
  const [emailTouched, setEmailTouched] = useState(false);

  useEffect(() => {
    if (editMentor) {
      setName(editMentor.name);
      setEmail(editMentor.email);
      setPhone(editMentor.phone);
      setCompany(editMentor.company);
      setDesignation(editMentor.designation);
      setExpertise([...editMentor.expertise]);
      setSelectedTeams([...editMentor.mappedTeamIds]);
    } else {
      setName("");
      setEmail("");
      setPhone("");
      setCompany("");
      setDesignation("");
      setExpertise([]);
      setSelectedTeams([]);
    }
    setEmailTouched(false);
  }, [editMentor, open]);

  if (!open) return null;

  const emailValid = EMAIL_RE.test(email);
  const canSubmit =
    name.trim() &&
    email.trim() &&
    emailValid &&
    company.trim() &&
    expertise.length > 0;

  const toggleExpertise = (domain: string) => {
    setExpertise((prev) =>
      prev.includes(domain) ? prev.filter((d) => d !== domain) : [...prev, domain],
    );
  };

  const toggleTeam = (teamId: string) => {
    setSelectedTeams((prev) =>
      prev.includes(teamId) ? prev.filter((id) => id !== teamId) : [...prev, teamId],
    );
  };

  const handleSubmit = () => {
    if (!canSubmit) return;

    const initials = name
      .split(" ")
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

    onSave(
      {
        id: editMentor?.id ?? `IM${Date.now().toString().slice(-3)}`,
        name: name.trim(),
        initials,
        email: email.trim(),
        phone: phone.trim(),
        company: company.trim(),
        designation: designation.trim(),
        expertise,
        mappedTeamIds: selectedTeams,
      },
      selectedTeams,
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-deep/50 p-4 backdrop-blur-sm overflow-y-auto">
      <div className="my-8 w-full max-w-xl overflow-hidden rounded-2xl border border-brand-sand bg-white shadow-2xl">
        {/* Header */}
        <div className="border-b border-brand-sand bg-brand-cream p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-lightOrange text-brand-primary">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-brand-deep">
                  {isEdit ? "Edit Industry Mentor" : "Invite Industry Mentor"}
                </h3>
                <p className="mt-0.5 text-xs text-brand-muted">
                  {isEdit
                    ? "Update mentor details and team assignments."
                    : "Sends an email invite with role claims to join the portal and mentor assigned hackathon teams."}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-brand-muted transition-colors hover:bg-white hover:text-brand-deep"
            >
              <XIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Form */}
        <div className="space-y-4 p-6">
          {/* Name & Email */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-bold text-brand-deep">
                Full Name <span className="text-brand-primary">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Rahul Bhide"
                className="w-full rounded-xl border border-brand-sand bg-brand-cream px-3.5 py-2.5 text-xs text-brand-charcoal placeholder-brand-muted transition focus:border-brand-primary focus:bg-white focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-brand-deep">
                Corporate Email ID <span className="text-brand-primary">*</span>
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setEmailTouched(true);
                }}
                onBlur={() => setEmailTouched(true)}
                placeholder="e.g. rahul.bhide@company.com"
                className={`w-full rounded-xl border bg-brand-cream px-3.5 py-2.5 text-xs text-brand-charcoal placeholder-brand-muted transition focus:bg-white focus:outline-none ${
                  emailTouched && email && !emailValid
                    ? "border-brand-overdue focus:border-brand-overdue"
                    : "border-brand-sand focus:border-brand-primary"
                }`}
              />
              {emailTouched && email && !emailValid && (
                <p className="mt-1 text-[11px] font-medium text-brand-overdue">
                  Please enter a valid email address.
                </p>
              )}
            </div>
          </div>

          {/* Company & Designation */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-bold text-brand-deep">
                Company / Organization Name <span className="text-brand-primary">*</span>
              </label>
              <input
                type="text"
                required
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="e.g. Prasu Soft Labs Pvt Ltd"
                className="w-full rounded-xl border border-brand-sand bg-brand-cream px-3.5 py-2.5 text-xs text-brand-charcoal placeholder-brand-muted transition focus:border-brand-primary focus:bg-white focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-brand-deep">
                Current Designation / Title
              </label>
              <input
                type="text"
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
                placeholder="e.g. Lead AI Architect"
                className="w-full rounded-xl border border-brand-sand bg-brand-cream px-3.5 py-2.5 text-xs text-brand-charcoal placeholder-brand-muted transition focus:border-brand-primary focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          {/* Phone */}
          <div>
            <label className="mb-1 block text-xs font-bold text-brand-deep">Contact Phone</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. +91 98907 99553"
              className="w-full rounded-xl border border-brand-sand bg-brand-cream px-3.5 py-2.5 text-xs text-brand-charcoal placeholder-brand-muted transition focus:border-brand-primary focus:bg-white focus:outline-none"
            />
          </div>

          {/* Domain Focus */}
          <div>
            <label className="mb-1.5 block text-xs font-bold text-brand-deep">
              Domain Focus / Expertise (Multi-Select)
            </label>
            <div className="flex flex-wrap gap-2">
              {domainExpertiseOptions.map((domain) => {
                const selected = expertise.includes(domain);
                return (
                  <button
                    key={domain}
                    type="button"
                    onClick={() => toggleExpertise(domain)}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                      selected
                        ? "border-brand-primary bg-brand-lightOrange text-brand-primary"
                        : "border-brand-sand bg-brand-cream text-brand-charcoal hover:border-brand-primary"
                    }`}
                  >
                    {domain}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Initial Assigned Teams */}
          <div>
            <label className="mb-1 block text-xs font-bold text-brand-deep">
              Initial Assigned Teams (Optional)
            </label>
            {unmappedGroups.length === 0 ? (
              <div className="rounded-xl border border-brand-sand bg-brand-cream p-4 text-center">
                <p className="text-xs font-medium text-brand-muted">
                  All teams currently have an industry mentor assigned.
                </p>
              </div>
            ) : (
              <div className="max-h-36 overflow-y-auto space-y-2 rounded-xl border border-brand-sand bg-brand-cream p-3">
                {unmappedGroups.map((group) => (
                  <label
                    key={group.teamId}
                    className="flex cursor-pointer items-center justify-between rounded-lg p-1.5 transition-colors hover:bg-white"
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedTeams.includes(group.teamId)}
                        onChange={() => toggleTeam(group.teamId)}
                        className="accent-brand-primary"
                      />
                      <span className="text-xs font-bold text-brand-deep">{group.teamName}</span>
                      <span className="font-mono text-[11px] text-brand-muted">({group.teamId})</span>
                    </div>
                    <span className="rounded bg-brand-lightOrange px-2 py-0.5 text-[10px] font-semibold text-brand-primary">
                      Unassigned
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-brand-sand px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-brand-sand px-4 py-2.5 text-xs font-bold text-brand-deep transition-colors hover:bg-brand-cream"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="flex items-center gap-2 rounded-xl bg-brand-primary px-5 py-2.5 text-xs font-bold text-white shadow-sm transition-all hover:bg-brand-hover active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <span>{isEdit ? "Save Changes" : "Send Invitation via Email"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
