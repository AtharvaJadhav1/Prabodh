"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { api, apiPost } from "../../lib/api";
import type { IndustrialMentorProfile } from "../../lib/types";
import { XIcon, SearchIcon, CheckIcon, MailIcon, BriefcaseIcon, UserCheckIcon } from "../dashboard/icons";

type Props = {
  open: boolean;
  teamId: string;
  teamName: string;
  onClose: () => void;
  onInvited: () => void;
};

const DOMAIN_FILTERS = [
  "AI/ML",
  "IoT",
  "Web/Mobile",
  "Data Analytics",
  "Cloud",
  "Cybersecurity",
  "Robotics",
  "Hardware",
  "Sustainability",
  "FinTech",
];

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export default function InviteIndustrialMentorModal({ open, teamId, teamName, onClose, onInvited }: Props) {
  const [results, setResults] = useState<IndustrialMentorProfile[]>([]);
  const [query, setQuery] = useState("");
  const [domain, setDomain] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [invitedIds, setInvitedIds] = useState<Set<string>>(new Set());
  const [busyEmail, setBusyEmail] = useState<string | null>(null);

  const load = useCallback(async (q: string, d: string) => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (d) params.set("domain", d);
      const rows = await api<IndustrialMentorProfile[]>(`/industrial-mentors${params.size ? `?${params.toString()}` : ""}`);
      setResults(rows.filter((m) => m.isActive));
    } catch {
      setError("Could not load the industrial mentor directory.");
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setDomain("");
    setInvitedIds(new Set());
    setError("");
    void load("", "");
  }, [open, load]);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => void load(query.trim(), domain), 250);
    return () => clearTimeout(t);
  }, [query, domain, open, load]);

  const handleInvite = async (m: IndustrialMentorProfile) => {
    if (busyEmail) return;
    setBusyEmail(m.email);
    setError("");
    try {
      await apiPost("/mentors/invite", { teamId, email: m.email, mentorType: "industry" });
      setInvitedIds((prev) => new Set(prev).add(m.id));
      onInvited();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send the invitation");
    } finally {
      setBusyEmail(null);
    }
  };

  const filtered = useMemo(
    () =>
      results.filter((m) =>
        domain ? (m.domainExpertise ?? []).includes(domain) : true,
      ),
    [results, domain],
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-deep/50 p-4 backdrop-blur-sm overflow-y-auto">
      <div className="my-8 w-full max-w-2xl overflow-hidden rounded-2xl border border-brand-sand bg-white shadow-2xl">
        <div className="border-b border-brand-sand bg-brand-cream p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-lightOrange text-brand-primary">
                <BriefcaseIcon className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-brand-deep">Invite an Industrial Mentor</h3>
                <p className="mt-0.5 text-xs text-brand-muted">
                  Pick an industry expert from the registered directory. They will accept or decline the invitation.
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

        <div className="space-y-4 p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-muted" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name, company or email"
                className="w-full rounded-xl border border-brand-sand bg-brand-cream py-2.5 pl-9 pr-3 text-xs text-brand-charcoal placeholder-brand-muted transition focus:border-brand-primary focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {DOMAIN_FILTERS.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDomain((prev) => (prev === d ? "" : d))}
                className={`rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                  domain === d
                    ? "border-brand-primary bg-brand-lightOrange text-brand-primary"
                    : "border-brand-sand bg-brand-cream text-brand-charcoal hover:border-brand-primary"
                }`}
              >
                {d}
              </button>
            ))}
          </div>

          {error ? <p className="text-xs font-semibold text-brand-overdue">{error}</p> : null}

          <div className="space-y-2">
            {loading ? (
              <p className="py-6 text-center text-xs text-brand-muted">Loading directory…</p>
            ) : filtered.length === 0 ? (
              <p className="py-6 text-center text-xs text-brand-muted">
                No matching industrial mentors found. Ask the nodal admin to register them first.
              </p>
            ) : (
              filtered.map((m) => {
                const invited = invitedIds.has(m.id);
                const busy = busyEmail === m.email;
                return (
                  <div
                    key={m.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-brand-sand p-3"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-deep text-xs font-bold tracking-wider text-white">
                        {initials(m.fullName)}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-brand-deep">{m.fullName}</p>
                        <p className="truncate text-xs text-brand-muted">
                          {[m.companyName, m.designation].filter(Boolean).join(" · ") || m.email}
                        </p>
                        <p className="truncate text-[11px] text-brand-muted">
                          <span className="inline-flex items-center gap-1">
                            <MailIcon className="h-3 w-3" /> {m.email}
                          </span>
                        </p>
                        {(m.domainExpertise ?? []).length > 0 ? (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {m.domainExpertise!.map((d) => (
                              <span
                                key={d}
                                className="rounded bg-brand-lightOrange px-1.5 py-0.5 text-[10px] font-semibold text-brand-primary"
                              >
                                {d}
                              </span>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    </div>
                    {invited ? (
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-brand-approved/30 bg-brand-approved/10 px-3 py-1.5 text-xs font-bold text-brand-approved">
                        <CheckIcon className="h-3.5 w-3.5" /> Invitation sent
                      </span>
                    ) : (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void handleInvite(m)}
                        className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-brand-primary px-3.5 py-2 text-xs font-bold text-white shadow-sm transition-colors hover:bg-brand-hover disabled:opacity-60"
                      >
                        {busy ? (
                          <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                        ) : (
                          <UserCheckIcon className="h-3.5 w-3.5" />
                        )}
                        {busy ? "Sending…" : "Invite"}
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>

          <p className="text-[11px] text-brand-muted">
            Inviting a mentor for <span className="font-bold text-brand-deep">{teamName}</span>. Only the team&apos;s
            assigned faculty mentor can send these invitations.
          </p>
        </div>
      </div>
    </div>
  );
}