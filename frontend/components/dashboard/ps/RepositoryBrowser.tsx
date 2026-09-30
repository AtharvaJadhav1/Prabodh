"use client";

import { useEffect, useMemo, useState } from "react";
import type { SiStatement } from "../../../data/studentDashboard";
import { SearchIcon, LockIcon, CheckIcon } from "../icons";
import { useTeam } from "../TeamProvider";
import { api } from "../../../lib/api";
import type { CatalogPreference } from "./PreferenceSlotsPanel";

type Props = {
  targetRank: number;
  usedPsIds: string[];
  onPick: (pref: CatalogPreference) => void;
};

type FilterCategory = "All" | "Software" | "Hardware";

const filterPills: FilterCategory[] = ["All", "Software", "Hardware"];

function isStudentInnovation(ps: {
  title?: string;
  organisation?: string;
  ministry?: string;
  description?: string;
}): boolean {
  const blob = `${ps.title ?? ""} ${ps.organisation ?? ""} ${ps.ministry ?? ""}`.toLowerCase();
  return blob.includes("student innovation");
}

function matchesSearch(s: SiStatement, q: string): boolean {
  if (!q) return true;
  const t = q.toLowerCase();
  return (
    s.code.toLowerCase().includes(t) ||
    s.title.toLowerCase().includes(t) ||
    s.domain.toLowerCase().includes(t) ||
    s.ministry.toLowerCase().includes(t) ||
    s.category.toLowerCase().includes(t) ||
    s.description.toLowerCase().includes(t)
  );
}

function matchesFilter(s: SiStatement, f: FilterCategory): boolean {
  if (f === "All") return true;
  const c = s.category.toLowerCase();
  if (f === "Software") return c.includes("software");
  if (f === "Hardware") return c.includes("hardware");
  return true;
}

export default function RepositoryBrowser({ targetRank, usedPsIds, onPick }: Props) {
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterCategory>("All");
  const [remote, setRemote] = useState<SiStatement[] | null>(null);
  const [ids, setIds] = useState<Record<string, string>>({});
  const { isLead } = useTeam();

  useEffect(() => {
    const q = search.trim();
    const category = activeFilter === "Software" ? "software" : activeFilter === "Hardware" ? "hardware" : undefined;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          type PsRow = {
            id: string;
            code: string;
            title: string;
            theme: string;
            category: string;
            organisation: string;
            description: string;
          };
          const collected: PsRow[] = [];
          let page = 1;
          let pages = 1;
          do {
            const params = new URLSearchParams();
            params.set("limit", "200");
            params.set("page", String(page));
            if (q) params.set("q", q);
            if (category) params.set("category", category);
            const res = await api<{ items: PsRow[]; pages: number; total: number }>(
              `/problem-statements?${params.toString()}`,
            );
            collected.push(...(res.items ?? []));
            pages = Math.max(1, res.pages ?? 1);
            page += 1;
          } while (page <= pages && page <= 10);

          if (cancelled) return;
          const nextIds: Record<string, string> = {};
          setRemote(
            collected
              .filter((ps) => !isStudentInnovation(ps))
              .map((ps) => {
                nextIds[ps.code] = ps.id;
                return {
                  code: ps.code,
                  title: ps.title,
                  domain: ps.theme,
                  ministry: ps.organisation,
                  category: ps.category,
                  description: ps.description,
                  postedBy: ps.organisation,
                  updatedAgo: "live",
                };
              }),
          );
          setIds(nextIds);
        } catch {
          if (!cancelled) setRemote(null);
        }
      })();
    }, 300);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [search, activeFilter]);

  const source = remote ?? [];

  const filtered = useMemo(
    () => source.filter((s) => matchesSearch(s, search) && matchesFilter(s, activeFilter)),
    [search, activeFilter, source],
  );

  return (
    <div className="flex flex-col gap-6">
      {/* Search + Filters */}
      <div className="flex flex-col gap-3 rounded-2xl border border-brand-softline bg-white p-4 shadow-[0_2px_8px_rgba(91,46,16,0.04)] sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-muted" />
          <input
            type="text"
            placeholder="Search by title, theme, organisation, or code…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-brand-softline bg-brand-cream py-2.5 pl-10 pr-4 text-sm text-brand-deep transition-all placeholder:text-brand-muted/60 focus:border-brand-primary focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-primary/30"
          />
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {filterPills.map((pill) => (
            <button
              key={pill}
              type="button"
              onClick={() => setActiveFilter(pill)}
              className={`shrink-0 rounded-lg px-3 py-1.5 font-mono text-xs font-semibold transition-colors ${
                activeFilter === pill
                  ? "bg-brand-approved text-white shadow-sm"
                  : "bg-brand-cream text-brand-deep hover:bg-brand-softline"
              }`}
            >
              {pill}
            </button>
          ))}
        </div>
      </div>

      <p className="text-xs font-medium text-brand-muted">
        Showing {filtered.length} problem statement{filtered.length === 1 ? "" : "s"}
      </p>

      {/* PS Card List */}
      <div className="flex flex-col gap-4">
        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-brand-softline bg-white py-12 px-6 text-center shadow-[0_2px_8px_rgba(91,46,16,0.04)]">
            <SearchIcon className="mx-auto mb-3 h-8 w-8 text-brand-muted/40" />
            <p className="text-sm font-bold text-brand-deep">No problem statements match your search</p>
            <p className="mt-1 text-xs text-brand-muted">Try adjusting your filters or clearing the search.</p>
          </div>
        ) : (
          filtered.map((stmt) => (
            <div
              key={stmt.code}
              className="flex flex-col gap-4 rounded-2xl border border-brand-softline bg-white p-4 shadow-[0_2px_8px_rgba(91,46,16,0.04)] transition-all hover:border-brand-primary/40 hover:shadow-[0_6px_18px_rgba(91,46,16,0.08)] sm:p-5 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="max-w-3xl flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded border border-brand-softline bg-brand-cream px-2 py-0.5 font-mono text-xs font-bold text-brand-deep">
                    {stmt.code}
                  </span>
                  <span className="rounded-full border border-brand-warmBorder bg-brand-lightOrange px-2 py-0.5 text-[11px] font-bold uppercase text-brand-deep">
                    {stmt.ministry}
                  </span>
                  <span className="rounded-full border border-brand-warmBorder bg-brand-lightOrange px-2 py-0.5 text-[11px] font-bold uppercase text-brand-deep">
                    {stmt.category}
                  </span>
                  <span className="rounded-full border border-brand-warmBorder bg-brand-lightOrange px-2 py-0.5 text-[11px] font-bold uppercase text-brand-deep">
                    {stmt.domain}
                  </span>
                </div>
                <h4 className="mt-2 text-base font-bold text-brand-deep">{stmt.title}</h4>
                <p className="mt-1 line-clamp-2 text-sm text-brand-muted">{stmt.description}</p>
                <div className="mt-2 flex items-center gap-4 text-xs text-brand-muted">
                  <span>Posted by {stmt.postedBy}</span>
                </div>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-2 pt-3 sm:pt-0">
                {isLead ? (
                  <button
                    type="button"
                    disabled={!ids[stmt.code] || usedPsIds.includes(ids[stmt.code])}
                    onClick={() => {
                      const psId = ids[stmt.code];
                      if (!psId) return;
                      onPick({
                        kind: "catalog",
                        psId,
                        code: stmt.code,
                        title: stmt.title,
                        theme: stmt.domain,
                        category: stmt.category.toLowerCase().includes("hardware") ? "hardware" : "software",
                        organisation: stmt.ministry,
                        description: stmt.description,
                      });
                    }}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-brand-primary px-3 py-2 text-xs font-bold text-white shadow-md shadow-brand-primary/25 transition-all duration-150 hover:bg-brand-hover active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <CheckIcon className="h-4 w-4" />
                    {usedPsIds.includes(ids[stmt.code] ?? "") ? "Already added" : `Add to Preference #${targetRank}`}
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled
                    title="Only the Team Lead can select a problem statement"
                    className="inline-flex items-center gap-1.5 rounded-xl bg-brand-sand px-3 py-2 text-xs font-bold text-brand-muted/70 cursor-not-allowed"
                  >
                    <LockIcon className="h-4 w-4" />
                    Selection Locked — Team Lead Only
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
