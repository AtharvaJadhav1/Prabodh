"use client";

import { useEffect, useRef, useState } from "react";
import { CheckIcon, ChevronDownIcon } from "../dashboard/icons";

export type MentorOption = {
  id: string;
  name: string;
  subtext?: string;
};

type MentorDropdownProps = {
  options: MentorOption[];
  selectedId?: string;
  placeholder?: string;
  onSelect: (id: string) => void;
};

export default function MentorDropdown({
  options,
  selectedId,
  placeholder = "Select mentor...",
  onSelect,
}: MentorDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.id === selectedId);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={dropdownRef} className="relative w-full min-w-[220px]">
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex w-full items-center justify-between gap-2 rounded-xl border border-neutral-200 bg-white px-3.5 py-2.5 text-left text-sm shadow-sm transition-all hover:border-neutral-300 hover:bg-neutral-50/60 focus:outline-none focus:ring-2 focus:ring-[#d95c26]/20"
      >
        <span className={`truncate font-medium ${selectedOption ? "text-neutral-900" : "text-neutral-400"}`}>
          {selectedOption ? selectedOption.name : placeholder}
        </span>
        <ChevronDownIcon
          className={`h-4 w-4 shrink-0 text-neutral-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {/* Floating Menu */}
      {isOpen && (
        <div className="absolute left-0 top-[calc(100%+4px)] z-50 max-h-60 w-full overflow-y-auto rounded-xl border border-neutral-200 bg-white p-1 shadow-xl">
          {options.length === 0 ? (
            <div className="px-3 py-2 text-center text-xs text-neutral-400">No mentors available</div>
          ) : (
            options.map((option) => {
              const isSelected = option.id === selectedId;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => {
                    onSelect(option.id);
                    setIsOpen(false);
                  }}
                  className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                    isSelected ? "bg-[#d95c26]/10 font-semibold text-[#d95c26]" : "text-neutral-700 hover:bg-neutral-100"
                  }`}
                >
                  <div className="flex flex-col truncate pr-2">
                    <span className="truncate">{option.name}</span>
                    {option.subtext && (
                      <span className="truncate text-xs font-normal text-neutral-400">{option.subtext}</span>
                    )}
                  </div>
                  {isSelected && <CheckIcon className="h-4 w-4 shrink-0 text-[#d95c26]" />}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}