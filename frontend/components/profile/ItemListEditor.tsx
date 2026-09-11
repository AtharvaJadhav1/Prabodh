"use client";

import type { ReactNode } from "react";
import { TrashIcon, PlusIcon } from "../dashboard/icons";

type ItemListEditorProps<T> = {
  items: T[];
  onChange: (items: T[]) => void;
  renderItem: (item: T, update: (patch: Partial<T>) => void) => ReactNode;
  createEmpty: () => T;
  addLabel: string;
  itemLabel: string;
};

export default function ItemListEditor<T>({
  items = [],
  onChange,
  renderItem,
  createEmpty,
  addLabel,
  itemLabel,
}: ItemListEditorProps<T>) {
  return (
    <div className="space-y-3">
      {items.length === 0 && (
        <p className="rounded-xl border border-dashed border-brand-sand bg-brand-cream p-3 text-center text-xs font-medium text-brand-muted">
          No {itemLabel} yet — add your first one below.
        </p>
      )}

      {items.map((item, index) => (
        <div
          key={index}
          className="space-y-3 rounded-xl border border-brand-sand bg-brand-cream/60 p-3.5"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-brand-muted">
              {itemLabel} {index + 1}
            </span>
            <button
              type="button"
              onClick={() => onChange(items.filter((_, i) => i !== index))}
              className="inline-flex items-center gap-1 rounded-lg border border-brand-sand px-2 py-1 text-[11px] font-bold text-brand-charcoal/70 transition-colors hover:border-brand-primary/40 hover:text-brand-primary"
              aria-label={`Remove ${itemLabel} ${index + 1}`}
            >
              <TrashIcon className="h-3 w-3" />
              Remove
            </button>
          </div>
          {renderItem(item, (patch) =>
            onChange(items.map((it, i) => (i === index ? { ...it, ...patch } : it)))
          )}
        </div>
      ))}

      <button
        type="button"
        onClick={() => onChange([...items, createEmpty()])}
        className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-brand-primary/40 bg-brand-lightOrange px-3 py-2.5 text-xs font-bold text-brand-primary transition-colors hover:bg-brand-lightOrange/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"
      >
        <PlusIcon className="h-4 w-4" />
        {addLabel}
      </button>
    </div>
  );
}