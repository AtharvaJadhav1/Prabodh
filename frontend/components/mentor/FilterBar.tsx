"use client";

import { SearchIcon } from "../dashboard/icons";
import TrackDropdown from "./TrackDropdown";

type Props = {
  search: string;
  onSearchChange: (search: string) => void;
  track: string;
  onTrackChange: (track: string) => void;
};

export default function FilterBar({ search, onSearchChange, track, onTrackChange }: Props) {
  return (
    <div className="mb-6 flex w-full flex-col items-stretch justify-between gap-4 rounded-2xl border border-neutral-200/80 bg-white p-3 shadow-sm sm:flex-row sm:items-center">
      {/* Left: Search */}
      <div className="relative w-full sm:w-80 md:w-96">
        <SearchIcon className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Filter teams, PRN, or topic..."
          className="w-full rounded-xl border border-neutral-200 bg-neutral-50/50 py-2.5 pl-10 pr-3.5 text-xs text-neutral-800 transition-all placeholder:text-neutral-400 focus:border-[#d95c26] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#d95c26]/15"
        />
      </div>

      {/* Right: Custom dropdown pinned to the corner */}
      <div className="min-w-[160px] shrink-0 self-end sm:self-auto">
        <TrackDropdown value={track} onChange={onTrackChange} />
      </div>
    </div>
  );
}