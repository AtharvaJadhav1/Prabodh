"use client";

import { tracks } from "../../data/mentorDashboard";
import { SearchIcon } from "../dashboard/icons";

type Props = {
  search: string;
  onSearchChange: (search: string) => void;
  track: string;
  onTrackChange: (track: string) => void;
};

export default function FilterBar({ search, onSearchChange, track, onTrackChange }: Props) {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-3 bg-white rounded-xl border border-brand-sand mb-6">
      {/* Search + Track */}
      <div className="flex items-center gap-3 w-full">
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