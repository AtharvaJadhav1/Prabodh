"use client";

import { useState, useMemo, type ReactNode } from "react";
import { SearchIcon } from "../dashboard/icons";

type Column<T> = { label: string; render: (row: T) => React.ReactNode };

type Props<T> = {
  rows: T[];
  columns: Column<T>[];
  searchPlaceholder: string;
  searchFn: (row: T, query: string) => boolean;
  rowKey: (row: T) => string;
  emptyLabel: string;
  toolbar?: ReactNode;
};

export default function UserTable<T>({
  rows,
  columns,
  searchPlaceholder,
  searchFn,
  rowKey,
  emptyLabel,
  toolbar,
}: Props<T>) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return rows;
    return rows.filter((r) => searchFn(r, search.toLowerCase()));
  }, [rows, search, searchFn]);

  return (
    <section className="rounded-2xl border border-neutral-200/80 bg-white p-6 shadow-sm">
      <div className="flex flex-col items-start justify-between gap-4 border-b border-neutral-100 pb-6 md:flex-row md:items-center">
        <div className="flex flex-wrap items-center gap-3">
          {toolbar ? (
            <div className="inline-flex items-center gap-1.5 rounded-xl bg-neutral-100/70 p-1">{toolbar}</div>
          ) : null}
          <span className="rounded-lg border border-neutral-200 bg-neutral-50 px-2.5 py-1.5 text-[11px] font-semibold text-neutral-500">
            {filtered.length} of {rows.length}
          </span>
        </div>
        <div className="relative w-full md:w-72">
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-neutral-200 bg-white px-3.5 py-2 text-xs text-neutral-900 transition outline-none placeholder:text-neutral-400 focus:border-[#d95c26] focus:ring-2 focus:ring-[#d95c26]/10"
          />
          <SearchIcon className="absolute right-3 top-2.5 h-4 w-4 text-neutral-400" />
        </div>
      </div>

      <div className="w-full overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-left text-xs">
          <thead>
            <tr className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
              {columns.map((col) => (
                <th key={col.label} className="border-b border-neutral-100 px-3 py-3 font-semibold">
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => (
              <tr
                key={rowKey(row)}
                className="border-b border-neutral-100 transition-colors last:border-b-0 hover:bg-neutral-50/60"
              >
                {columns.map((col) => (
                  <td key={col.label} className="px-3 py-4 align-middle">
                    {col.render(row)}
                  </td>
                ))}
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="px-3 py-12 text-center text-xs font-medium text-neutral-500">
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