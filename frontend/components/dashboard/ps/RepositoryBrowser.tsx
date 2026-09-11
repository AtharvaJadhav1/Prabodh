"use client";

import { useEffect, useMemo, useState } from "react";
import { siFolders, type SiStatement } from "../../../data/studentDashboard";
import { SearchIcon, LockIcon, ExternalLinkIcon, CheckIcon, ShieldCheckIcon } from "../icons";
import { useTeam } from "../TeamProvider";
import PlaceholderLink from "../PlaceholderLink";
import { api, apiPost } from "../../../lib/api";

type FilterCategory = "All" | "Software" | "Hardware" | "Hybrid" | "FinTech" | "AgriTech";

const filterPills: FilterCategory[] = ["All", "Software", "Hardware", "Hybrid", "FinTech", "AgriTech"];

function matchesSearch(s: SiStatement, q: string): boolean {
  if (!q) return true;
  const t = q.toLowerCase();
  return (
    s.code.toLowerCase().includes(t) ||
    s.title.toLowerCase().includes(t) ||
    s.domain.toLowerCase().includes(t) ||
    s.ministry.toLowerCase().includes(t) ||
    s.category.toLowerCase().includes(t)
  );
}

function matchesFilter(s: SiStatement, f: FilterCategory): boolean {
  if (f === "All") return true;
  const d = s.domain.toLowerCase();
  const c = s.category.toLowerCase();
  if (f === "Software") return c.includes("software");
  if (f === "Hardware") return c.includes("hardware") || c.includes("iot");
  if (f === "Hybrid") return c.includes("hybrid");
  if (f === "FinTech") return d.includes("fintech");
  if (f === "AgriTech") return d.includes("agritech") || d.includes("agri");
  return true;
}

export default function RepositoryBrowser() {
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterCategory>("All");
  const [activeFolder, setActiveFolder] = useState<string | null>(null);
  const [remote, setRemote] = useState<SiStatement[] | null>(null);
  const [ids, setIds] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [selectError, setSelectError] = useState("");
  const { isLead, teamId, reload } = useTeam();

  useEffect(() => {
    const q = search.trim();
    const category = activeFilter === "Software" ? "software" : activeFilter === "Hardware" ? "hardware" : undefined;
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (category) params.set("category", category);
      void api<{ items: Array<{ id: string; code: string; title: string; theme: string; category: string; organisation: string; description: string }> }>(
        `/problem-statements?${params.toString()}`,
      )
        .then((res) => {
          const nextIds: Record<string, string> = {};
          setRemote(
            res.items.map((ps) => {
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
        })
        .catch(() => setRemote(null));
    }, 300);
    return () => window.clearTimeout(timer);
  }, [search, activeFilter]);

  const source = remote ?? [];

  const filtered = useMemo(() => {
    let results = source.filter((s) => matchesSearch(s, search) && matchesFilter(s, activeFilter));
    if (activeFolder) {
      const folder = siFolders.find((f) => f.id === activeFolder);
      if (folder) {
        const kw = folder.filterDomain.toLowerCase();
        results = results.filter(
          (s) =>
            s.domain.toLowerCase().includes(kw) ||
            s.ministry.toLowerCase().includes(kw) ||
            s.title.toLowerCase().includes(kw),
        );
      }
    }
    return results;
  }, [search, activeFilter, activeFolder, source]);

  return (
    <div className="flex flex-col gap-6">
      {/* Category Folders */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-widest text-brand-muted">
            Featured Cohort Collections
          </span>
          <PlaceholderLink icon={<ExternalLinkIcon className="h-3 w-3" />} label="Download Registry PDF" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {siFolders.map((folder) => {
            const isActive = activeFolder === folder.id;
            return (
              <button
                key={folder.id}
                type="button"
                onClick={() => setActiveFolder(isActive ? null : folder.id)}
                className={`group rounded-2xl p-5 text-left shadow-[0_2px_8px_rgba(91,46,16,0.04)] transition-all ${
                  isActive
                    ? "border-2 border-brand-primary bg-white shadow-[0_6px_18px_rgba(91,46,16,0.10)]"
                    : "border border-brand-softline bg-white hover:shadow-[0_6px_18px_rgba(91,46,16,0.08)]"
                }`}
              >
                <div
                  className={`mb-3 flex h-12 w-12 items-center justify-center rounded-xl ${
                    isActive ? "bg-brand-primary text-white" : "bg-brand-approved/10 text-brand-approved"
                  } transition-transform group-hover:scale-105`}
                >
                  <svg
                    className="h-6 w-6"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <h4 className="text-sm font-bold text-brand-deep group-hover:text-brand-primary">
                  {folder.title}
                </h4>
                <div className="mt-2 flex items-center justify-between text-brand-muted">
                  <span className="font-mono text-xs font-semibold">
                    {source.filter(
                      (s) =>
                        s.domain.toLowerCase().includes(folder.filterDomain.toLowerCase()) ||
                        s.ministry.toLowerCase().includes(folder.filterDomain.toLowerCase()) ||
                        s.title.toLowerCase().includes(folder.filterDomain.toLowerCase()),
                    ).length}{" "}
                    problem statements
                  </span>
                  <svg
                    className="h-4 w-4 transition-transform group-hover:translate-x-1"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Search + Filters */}
      <div className="flex flex-col gap-3 rounded-2xl border border-brand-softline bg-white p-4 shadow-[0_2px_8px_rgba(91,46,16,0.04)] sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-muted" />
          <input
            type="text"
            placeholder="Search by title, domain, ministry, or technology stack..."
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

      {selectError ? <p className="text-sm font-medium text-red-700">{selectError}</p> : null}

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
              className="flex flex-col gap-4 rounded-2xl border border-brand-softline bg-white p-5 shadow-[0_2px_8px_rgba(91,46,16,0.04)] transition-all hover:border-brand-primary/40 hover:shadow-[0_6px_18px_rgba(91,46,16,0.08)] sm:flex-row sm:items-center sm:justify-between"
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
                  <span>Updated {stmt.updatedAgo}</span>
                </div>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-2 pt-3 sm:pt-0">
                {isLead ? (
                  <button
                    type="button"
                    disabled={busy === stmt.code || !teamId}
                    onClick={async () => {
                      const psId = ids[stmt.code];
                      if (!teamId || !psId) return;
                      setBusy(stmt.code);
                      try {
                        setSelectError("");
                        const idea = await apiPost<{ id: string }>("/idea-submissions", {
                          teamId,
                          psId,
                          abstract: (stmt.description + " Selected via SIH portal.").slice(0, 400).padEnd(20, "."),
                          techStack: "To be confirmed",
                          feasibilityNotes: "Draft feasibility captured at PS selection.",
                        });
                        await apiPost(`/idea-submissions/${idea.id}/lock`, {});
                        await reload();
                      } catch (err) {
                        setSelectError(err instanceof Error ? err.message : "Could not select this problem statement");
                      } finally {
                        setBusy(null);
                      }
                    }}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-brand-primary px-3 py-2 text-xs font-bold text-white shadow-md shadow-brand-primary/25 transition-all duration-150 hover:bg-brand-hover active:scale-[0.99] disabled:opacity-60"
                  >
                    <CheckIcon className="h-4 w-4" />
                    {busy === stmt.code ? "Selecting…" : "Select This PS"}
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
                <PlaceholderLink icon={<ExternalLinkIcon className="h-3.5 w-3.5" />} label="View Specs" />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
