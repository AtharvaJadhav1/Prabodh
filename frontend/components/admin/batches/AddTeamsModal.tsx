"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "../../../lib/api";
import LoadingState from "../../LoadingState";
import FilterDropdown, { type FilterDropdownOption } from "../FilterDropdown";
import StatusPill, { STATUS_BADGES, type TeamStatus } from "../StatusPill";
import { SearchIcon, UsersIcon, XIcon } from "../../dashboard/icons";
import type { BatchTeam } from "./types";

type Props = {
  open: boolean;
  onClose: () => void;
  /** Teams already chosen in the parent (kept ticked, never listed twice). */
  selectedIds: string[];
  onConfirm: (teams: BatchTeam[]) => void;
};

const STATUS_ORDER: TeamStatus[] = ["forming", "active", "locked", "disqualified"];

function uniqueOptions(values: Array<string | null | undefined>, allLabel: string): FilterDropdownOption[] {
  const set = new Set(values.map((v) => (v ?? "").trim()).filter(Boolean));
  return [
    { value: "", label: allLabel },
    ...[...set].sort((a, b) => a.localeCompare(b)).map((v) => ({ value: v, label: v })),
  ];
}

/** Lists ONLY teams that are not in any batch yet, with search + filters. */
export default function AddTeamsModal({ open, onClose, selectedIds, onConfirm }: Props) {
  const [teams, setTeams] = useState<BatchTeam[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [institute, setInstitute] = useState("");
  const [theme, setTheme] = useState("");
  const [picked, setPicked] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!open) return;
    setSearch("");
    setStatus("");
    setInstitute("");
    setTheme("");
    setPicked(new Set(selectedIds));
    setError("");
    setLoading(true);
    let cancelled = false;
    api<{ items: BatchTeam[] }>("/admin/teams?unbatched=true&limit=1000&page=1")
      .then((res) => {
        if (!cancelled) setTeams(res.items ?? []);
      })
      .catch(() => {
        if (!cancelled) setError("Could not load teams. Close this window and try again.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // selectedIds is read once when the modal opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const statusOptions: FilterDropdownOption[] = useMemo(
    () => [
      { value: "", label: "All statuses" },
      ...STATUS_ORDER.map((s) => ({ value: s, label: STATUS_BADGES[s].label })),
    ],
    [],
  );
  const instituteOptions = useMemo(() => uniqueOptions(teams.map((t) => t.institute), "All institutes"), [teams]);
  const themeOptions = useMemo(() => uniqueOptions(teams.map((t) => t.theme), "All themes"), [teams]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return teams.filter((t) => {
      if (status && t.status !== status) return false;
      if (institute && t.institute !== institute) return false;
      if (theme && (t.theme ?? "") !== theme) return false;
      if (!q) return true;
      return (
        t.name.toLowerCase().includes(q) ||
        t.teamCode.toLowerCase().includes(q) ||
        t.institute.toLowerCase().includes(q) ||
        (t.theme ?? "").toLowerCase().includes(q)
      );
    });
  }, [teams, search, status, institute, theme]);

  const allFilteredPicked = filtered.length > 0 && filtered.every((t) => picked.has(t.id));

  const toggle = (id: string) =>
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const toggleAllFiltered = () =>
    setPicked((prev) => {
      const next = new Set(prev);
      if (allFilteredPicked) filtered.forEach((t) => next.delete(t.id));
      else filtered.forEach((t) => next.add(t.id));
      return next;
    });

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-brand-deep/50 p-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Add teams to batch"
        className="my-8 flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-brand-sand bg-white shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-brand-sand bg-brand-cream p-5">
          <div>
            <h3 className="text-lg font-bold text-brand-deep">Add teams</h3>
            <p className="mt-0.5 text-xs text-brand-muted">
              Only teams that are not in any batch are shown ({teams.length} available).
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1.5 text-brand-muted transition-colors hover:bg-white hover:text-brand-deep"
          >
            <XIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-3 border-b border-neutral-100 p-5">
          <div className="relative">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by team name, code, institute or theme…"
              className="w-full rounded-xl border border-neutral-200 bg-neutral-50 py-2.5 pl-9 pr-3 text-xs text-neutral-900 placeholder-neutral-400 transition focus:border-brand-primary focus:bg-white focus:outline-none"
            />
            <SearchIcon className="absolute left-3 top-3 h-4 w-4 text-neutral-400" />
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <FilterDropdown options={statusOptions} value={status} onChange={setStatus} />
            <FilterDropdown options={instituteOptions} value={institute} onChange={setInstitute} />
            <FilterDropdown options={themeOptions} value={theme} onChange={setTheme} />
          </div>
        </div>

        <div className="min-h-[200px] flex-1 overflow-y-auto">
          {loading ? (
            <div className="py-10">
              <LoadingState compact label="Loading teams" steps={["Finding teams without a batch"]} />
            </div>
          ) : error ? (
            <p className="px-5 py-10 text-center text-sm font-medium text-red-600">{error}</p>
          ) : teams.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-neutral-500">
              Every team is already in a batch.
            </p>
          ) : filtered.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-neutral-500">No teams match your search or filters.</p>
          ) : (
            <table className="w-full border-collapse text-left text-xs">
              <thead className="sticky top-0 bg-white">
                <tr className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
                  <th className="w-10 border-b border-neutral-100 px-5 py-2.5">
                    <input
                      type="checkbox"
                      aria-label="Select all shown teams"
                      checked={allFilteredPicked}
                      onChange={toggleAllFiltered}
                      className="h-4 w-4 accent-[#d95c26]"
                    />
                  </th>
                  <th className="border-b border-neutral-100 px-2 py-2.5">Team</th>
                  <th className="border-b border-neutral-100 px-2 py-2.5">Institute</th>
                  <th className="border-b border-neutral-100 px-2 py-2.5 text-center">Status</th>
                  <th className="border-b border-neutral-100 px-5 py-2.5 text-right">Members</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((t) => (
                  <tr
                    key={t.id}
                    onClick={() => toggle(t.id)}
                    className={`cursor-pointer border-b border-neutral-100 transition-colors last:border-b-0 hover:bg-neutral-50 ${
                      picked.has(t.id) ? "bg-brand-lightOrange/40" : ""
                    }`}
                  >
                    <td className="px-5 py-3">
                      <input
                        type="checkbox"
                        aria-label={`Select ${t.name}`}
                        checked={picked.has(t.id)}
                        onChange={() => toggle(t.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="h-4 w-4 accent-[#d95c26]"
                      />
                    </td>
                    <td className="px-2 py-3">
                      <div className="font-bold text-neutral-900">{t.name}</div>
                      <div className="font-mono text-[11px] text-neutral-500">
                        {t.teamCode} · {t.theme ?? "No theme"}
                      </div>
                    </td>
                    <td className="px-2 py-3 text-neutral-700">{t.institute}</td>
                    <td className="px-2 py-3 text-center">
                      <span className="inline-flex justify-center">
                        <StatusPill status={t.status} />
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <span className="inline-flex items-center gap-1 font-bold text-neutral-900">
                        <UsersIcon className="h-3.5 w-3.5 text-neutral-400" />
                        {t._count?.members ?? 0}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-brand-sand bg-brand-cream p-4">
          <span className="text-xs font-semibold text-brand-muted">{picked.size} selected</span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-brand-sand bg-white px-4 py-2 text-xs font-bold text-brand-deep hover:bg-brand-cream"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                // Keep teams chosen earlier even if they're not in this list (they always are, but be safe).
                onConfirm(teams.filter((t) => picked.has(t.id)));
                onClose();
              }}
              className="rounded-xl bg-brand-primary px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-brand-hover"
            >
              Add {picked.size} team{picked.size === 1 ? "" : "s"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
