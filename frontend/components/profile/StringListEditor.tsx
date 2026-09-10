"use client";

import { useState } from "react";
import { PlusIcon, XIcon } from "../dashboard/icons";

type StringListEditorProps = {
  items: string[];
  onChange: (items: string[]) => void;
  label: string;
  placeholder: string;
};

export default function StringListEditor({
  items,
  onChange,
  label,
  placeholder,
}: StringListEditorProps) {
  const [draft, setDraft] = useState("");

  const add = () => {
    const value = draft.trim();
    if (!value) return;
    if (items.some((item) => item.toLowerCase() === value.toLowerCase())) return;
    onChange([...items, value]);
    setDraft("");
  };

  return (
    <div className="space-y-2">
      {items.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {items.map((item, index) => (
            <span
              key={`${item}-${index}`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-brand-sand bg-white px-3 py-1.5 text-xs font-semibold text-brand-charcoal"
            >
              {item}
              <button
                type="button"
                onClick={() => onChange(items.filter((_, i) => i !== index))}
                className="rounded p-0.5 text-brand-muted transition-colors hover:text-brand-primary"
                aria-label={`Remove ${item}`}
              >
                <XIcon className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder={placeholder}
          className="w-full rounded-xl border border-brand-sand bg-white px-3.5 py-2.5 text-sm font-medium text-brand-charcoal shadow-sm transition-all placeholder:text-brand-charcoal/45 focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 outline-none"
        />
        <button
          type="button"
          onClick={add}
          className="inline-flex shrink-0 items-center gap-1 rounded-xl bg-brand-primary px-3.5 py-2.5 text-xs font-bold text-white transition-colors hover:bg-brand-hover"
        >
          <PlusIcon className="h-3.5 w-3.5" />
          Add
        </button>
      </div>
    </div>
  );
}