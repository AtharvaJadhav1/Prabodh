"use client";

import type { ComponentType } from "react";

export type DrawerSection<T extends string> = {
  key: T;
  label: string;
  icon: ComponentType<{ className?: string }>;
};

type DrawerSectionNavProps<T extends string> = {
  sections: DrawerSection<T>[];
  active: T;
  onSelect: (key: T) => void;
};

export default function DrawerSectionNav<T extends string>({
  sections,
  active,
  onSelect,
}: DrawerSectionNavProps<T>) {
  return (
    <nav className="-mx-5 mb-5 border-b border-brand-sand px-5 pb-4" aria-label="Edit profile sections">
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {sections.map((section) => {
          const isActive = section.key === active;
          return (
            <button
              key={section.key}
              type="button"
              onClick={() => onSelect(section.key)}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary ${
                isActive
                  ? "border-brand-primary bg-brand-primary text-white shadow-sm shadow-brand-primary/25"
                  : "border-brand-sand bg-white text-brand-muted hover:border-brand-primary/40 hover:text-brand-primary"
              }`}
            >
              <section.icon className="h-3.5 w-3.5" />
              {section.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}