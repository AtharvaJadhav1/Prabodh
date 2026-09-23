"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDownIcon, ChevronUpIcon } from "../dashboard/icons";
import { tracks as defaultTracks } from "../../data/mentorDashboard";

type Props = {
  value: string;
  onChange: (value: string) => void;
  options?: string[];
};

export default function TrackDropdown({ value, onChange, options = defaultTracks }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const activeOption = options.includes(value) ? value : options[0];

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`flex items-center justify-between gap-3 rounded-2xl border bg-white px-4 py-2.5 text-xs font-medium text-neutral-800 transition-all ${
          isOpen ? "border-[#d95c26] ring-2 ring-[#d95c26]/10" : "border-neutral-200 hover:border-neutral-300"
        }`}
      >
        <span>{activeOption}</span>
        {isOpen ? (
          <ChevronUpIcon className="h-4 w-4 shrink-0 text-neutral-400" />
        ) : (
          <ChevronDownIcon className="h-4 w-4 shrink-0 text-neutral-400" />
        )}
      </button>

      {/* Custom Popover Menu */}
      {isOpen && (
        <div className="absolute right-0 z-50 mt-1.5 max-h-60 w-48 overflow-y-auto rounded-2xl border border-neutral-200/90 bg-white p-1.5 shadow-lg focus:outline-none">
          {options.map((track) => {
            const isSelected = track === activeOption;
            return (
              <button
                key={track}
                type="button"
                onClick={() => {
                  onChange(track);
                  setIsOpen(false);
                }}
                className={`w-full rounded-xl px-3.5 py-2 text-left text-xs transition-colors ${
                  isSelected
                    ? "bg-[#fff5ee] font-semibold text-[#d95c26]"
                    : "text-neutral-700 hover:bg-neutral-100"
                }`}
              >
                {track}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}