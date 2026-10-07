"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "../../lib/api";
import { resolveMentorAvatarUrl } from "../../lib/mentorAvatar";
import { BriefcaseIcon, SearchIcon } from "./icons";
import MentorLinkedinIcon from "./MentorLinkedinIcon";

type IndustryMentorRow = {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  companyName: string | null;
  designation: string | null;
  domainExpertise: string[];
  linkedinUrl?: string | null;
  avatarUrl?: string | null;
};

const MAX_DOMAIN_BADGES = 3;

/**
 * Read-only industry mentor pool shown to student teams once their faculty slot is
 * locked. Students browse and search profiles only — there are no invite/request
 * actions, so the component renders zero buttons.
 */
export default function IndustryMentorsDirectory() {
  const [rows, setRows] = useState<IndustryMentorRow[] | null>(null);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");

  useEffect(() => {
    let alive = true;
    api<IndustryMentorRow[]>("/mentors/industry")
      .then((data) => {
        if (alive) setRows(data ?? []);
      })
      .catch(() => {
        if (alive) setError("Could not load the industry mentors directory.");
      });
    return () => {
      alive = false;
    };
  }, []);

  const q = query.trim().toLowerCase();
  const filtered = useMemo(() => {
    if (!rows) return [];
    if (!q) return rows;
    return rows.filter((m) =>
      [
        m.fullName,
        m.email,
        m.companyName ?? "",
        m.designation ?? "",
        ...(m.domainExpertise ?? []).map((d) => d.toLowerCase()),
      ].some((value) => value.toLowerCase().includes(q)),
    );
  }, [rows, q]);

  const avatarSrc = (m: IndustryMentorRow) =>
    m.avatarUrl ?? resolveMentorAvatarUrl("INDUSTRY", { email: m.email, fullName: m.fullName });

  return (
    <div className="rounded-2xl border border-brand-softline bg-white p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-bold text-brand-deep">
          <BriefcaseIcon className="h-4 w-4 text-brand-primary" />
          Industry Mentors Directory
        </h3>
        {rows ? (
          <span className="rounded-full bg-brand-cream px-2.5 py-1 text-[11px] font-bold text-brand-muted">
            {filtered.length} of {rows.length} mentors
          </span>
        ) : null}
      </div>

      <div className="relative mt-4">
        <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-muted" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search industry mentors by name, company, or domain"
          placeholder="Search by name, company, or domain (e.g. AI/ML, IoT, Cloud)"
          className="h-10 w-full rounded-xl border border-brand-softline bg-brand-cream pl-9 pr-3 text-sm text-brand-deep outline-none focus:border-brand-primary focus:bg-white"
        />
      </div>

      {error ? (
        <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-xs font-semibold text-red-700">{error}</p>
      ) : rows === null ? (
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl border border-brand-softline bg-brand-cream/60" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <p className="mt-4 rounded-xl border border-dashed border-brand-softline bg-brand-cream px-4 py-6 text-center text-xs text-brand-muted">
          No industry mentors match your search.
        </p>
      ) : (
        <ul className="mt-4 grid max-h-[460px] grid-cols-1 gap-3 overflow-y-auto pr-1 sm:grid-cols-2">
          {filtered.map((m) => {
            const domains = m.domainExpertise ?? [];
            return (
              <li
                key={m.id}
                className="flex items-start gap-3 rounded-xl border border-brand-softline bg-white p-4"
              >
                <img
                  src={avatarSrc(m)}
                  alt={`${m.fullName} avatar`}
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  className="h-12 w-12 shrink-0 rounded-full border border-brand-softline bg-brand-cream object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 text-sm font-bold text-brand-deep">
                    <span className="truncate">{m.fullName}</span>
                    <MentorLinkedinIcon url={m.linkedinUrl} name={m.fullName} />
                  </p>
                  <p className="mt-0.5 truncate text-xs text-brand-muted">
                    {[m.designation, m.companyName].filter(Boolean).join(" · ") || "Industry Mentor"}
                  </p>
                  {domains.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {domains.slice(0, MAX_DOMAIN_BADGES).map((d) => (
                        <span
                          key={d}
                          className="rounded-md bg-brand-lightOrange/60 px-2 py-0.5 text-[10px] font-bold text-brand-primary"
                        >
                          {d}
                        </span>
                      ))}
                      {domains.length > MAX_DOMAIN_BADGES ? (
                        <span className="rounded-md bg-brand-cream px-2 py-0.5 text-[10px] font-bold text-brand-muted">
                          +{domains.length - MAX_DOMAIN_BADGES}
                        </span>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}