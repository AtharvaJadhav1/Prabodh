"use client";

import { useState, useMemo, type ReactNode } from "react";
import { SearchIcon } from "../dashboard/icons";

type Column<T> = { label: string; render: (row: T) => React.ReactNode; width?: string; minWidth?: string };

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
    <section className="rounded-2xl border border-stone-200 bg-white shadow-xs">
      <div className="flex flex-col sm:flex-row items-start justify-between gap-4 border-b border-stone-200 p-6">
        <div className="flex items-center gap-1 p-1 bg-stone-100/80 rounded-2xl border border-stone-200/60 overflow-x-auto w-full sm:w-auto">
          {toolbar}
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <span className="text-xs font-medium text-stone-500 whitespace-nowrap bg-stone-100 px-3 py-1.5 rounded-lg border border-stone-200/60">
            {filtered.length} of {rows.length}
          </span>
          <div className="relative flex-1 sm:w-80">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-stone-200 bg-white outline-none focus:border-stone-400 transition h-10"
            />
          </div>
        </div>
      </div>

        <div className="w-full overflow-x-auto">
          <table className="w-full table-fixed divide-y divide-stone-200 text-left">
            <thead className="bg-stone-50/80 text-xs font-semibold text-stone-500 uppercase tracking-wider">
              <tr>
                {columns.map((col) => (
                  <th
                    key={col.label}
                    className="px-6 py-3.5"
                    style={{ width: col.width, minWidth: col.minWidth }}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 text-sm text-stone-700">
              {filtered.map((row) => (
                <tr key={rowKey(row)} className="hover:bg-stone-50/60 transition-colors">
                  {columns.map((col) => (
                    <td
                      key={col.label}
                      className="px-6 py-4 align-middle"
                      style={{ width: col.width, minWidth: col.minWidth }}
                    >
                      {col.render(row)}
                    </td>
                  ))}
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={columns.length} className="px-6 py-12 text-center text-xs font-medium text-stone-500">
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