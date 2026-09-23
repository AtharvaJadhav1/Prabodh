"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDownIcon, ChevronUpIcon } from "../dashboard/icons";

export type FilterDropdownOption = { value: string; label: string };

type Props = {
  options: FilterDropdownOption[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
};

export default function FilterDropdown({ options, value, onChange, className = "" }: Props) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selected = options.find((o) => o.value === value);

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={`flex w-full items-center justify-between gap-3 rounded-xl border bg-white px-3.5 py-2.5 text-sm font-medium transition-all ${
          open ? "border-[#d95c26] ring-2 ring-[#d95c26]/10" : "border-neutral-200 hover:border-neutral-300"
        } ${selected?.value ? "text-neutral-800" : "text-neutral-400"}`}
      >
        <span className="truncate">{selected?.label ?? "Select"}</span>
        {open ? (
          <ChevronUpIcon className="h-4 w-4 shrink-0 text-neutral-400" />
        ) : (
          <ChevronDownIcon className="h-4 w-4 shrink-0 text-neutral-400" />
        )}
      </button>

      {open && (
        <div className="absolute left-0 z-50 mt-1.5 max-h-64 min-w-full overflow-y-auto rounded-2xl border border-neutral-200/90 bg-white p-1.5 shadow-lg">
          {options.map((option) => {
            const isSelected = option.value === selected?.value;
            return (
              <button
                key={option.value || "__all__"}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                className={`flex w-full items-center justify-between whitespace-nowrap rounded-xl px-3.5 py-2 text-left text-sm transition-colors ${
                  isSelected
                    ? "bg-[#fff5ee] font-semibold text-[#d95c26]"
                    : "text-neutral-700 hover:bg-neutral-100"
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}