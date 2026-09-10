"use client";

import { useState, useMemo } from "react";
import { SearchIcon } from "../dashboard/icons";

type Column<T> = { label: string; render: (row: T) => React.ReactNode };

type Props<T> = {
  rows: T[];
  columns: Column<T>[];
  searchPlaceholder: string;
  searchFn: (row: T, query: string) => boolean;
  rowKey: (row: T) => string;
  emptyLabel: string;
};

export default function UserTable<T>({ rows, columns, searchPlaceholder, searchFn, rowKey, emptyLabel }: Props<T>) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return rows;
    return rows.filter((r) => searchFn(r, search.toLowerCase()));
  }, [rows, search, searchFn]);

  return (
    <section className="rounded-2xl border border-brand-sand bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <span className="rounded-full border border-brand-warmBorder bg-brand-lightOrange px-2.5 py-0.5 text-xs font-semibold text-brand-primary">
          {filtered.length} of {rows.length}
        </span>
        <div className="relative min-w-[220px]">
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-brand-sand bg-brand-cream py-2 pl-9 pr-3 text-xs text-brand-charcoal placeholder-brand-muted transition focus:border-brand-primary focus:bg-white focus:outline-none"
          />
          <SearchIcon className="absolute left-3 top-2.5 h-4 w-4 text-brand-muted" />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-brand-sand bg-brand-cream/60 text-[10px] uppercase tracking-wider text-brand-muted">
              {columns.map((col) => (
                <th key={col.label} className="px-4 py-3 font-bold">
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-sand">
            {filtered.map((row) => (
              <tr key={rowKey(row)} className="transition-colors hover:bg-brand-cream/80">
                {columns.map((col) => (
                  <td key={col.label} className="px-4 py-4">
                    {col.render(row)}
                  </td>
                ))}
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="px-4 py-12 text-center text-xs font-medium text-brand-muted">
                  {emptyLabel}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
