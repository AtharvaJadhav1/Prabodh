"use client";

import { useState } from "react";
import { tracks } from "../../data/mentorDashboard";
import { SearchIcon } from "../dashboard/icons";

type Props = {
  totalGroups: number;
  pendingCount: number;
  evaluatedCount: number;
  activeFilter: "all" | "pending" | "evaluated";
  onFilterChange: (filter: "all" | "pending" | "evaluated") => void;
  search: string;
  onSearchChange: (search: string) => void;
  track: string;
  onTrackChange: (track: string) => void;
};

export default function FilterBar({
  totalGroups,
  pendingCount,
  evaluatedCount,
  activeFilter,
  onFilterChange,
  search,
  onSearchChange,
  track,
  onTrackChange,
}: Props) {
  const filters: { key: "all" | "pending" | "evaluated"; label: string; count: number; color: string }[] = [
    { key: "all", label: "All", count: totalGroups, color: "bg-brand-deep text-white" },
    { key: "pending", label: "Needs Review", count: pendingCount, color: "bg-brand-amber/10 text-brand-primary border-brand-amber/40" },
    { key: "evaluated", label: "Evaluated", count: evaluatedCount, color: "bg-brand-approved/10 text-brand-approved border-brand-approved/30" },
  ];

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-3 bg-white rounded-xl border border-brand-sand mb-6">
      {/* Status Pills */}
      <div className="flex items-center gap-1.5">
        {filters.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => onFilterChange(f.key)}
            className={`flex h-[34px] items-center rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
              activeFilter === f.key
                ? f.key === "all"
                  ? "bg-brand-deep text-white shadow-xs"
                  : `border ${f.color} font-bold`
                : "bg-brand-cream text-brand-muted border border-brand-sand hover:bg-brand-lightOrange hover:text-brand-primary"
            }`}
          >
            <span>{f.label}</span>
            <span className={`ml-1.5 inline-flex items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
              activeFilter === f.key
                ? f.key === "all"
                  ? "bg-white/20 text-white"
                  : f.color
                : "bg-brand-sand text-brand-muted"
            }`}>
              {f.count}
            </span>
          </button>
        ))}
      </div>

      {/* Search + Track */}
      <div className="flex items-center gap-3 w-full md:w-auto">
        <div className="relative w-full max-w-xs">
          <SearchIcon className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-brand-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Filter teams, PRN, or topic..."
            className="h-9 w-full rounded-lg border border-brand-sand bg-brand-cream pl-8 pr-3 text-xs text-brand-charcoal placeholder-brand-muted focus:border-brand-primary focus:outline-none"
          />
        </div>
        <select
          value={track}
          onChange={(e) => onTrackChange(e.target.value)}
          className="h-9 rounded-lg border border-brand-sand bg-brand-cream px-2.5 text-xs font-semibold text-brand-deep focus:border-brand-primary focus:outline-none"
        >
          {tracks.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
