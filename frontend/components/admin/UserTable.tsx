"use client";

import { useState, useMemo, type ReactNode } from "react";
import { SearchIcon } from "../dashboard/icons";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "../ui/table";

type Column<T> = {
  label: string;
  render: (row: T) => React.ReactNode;
  width?: string;
  minWidth?: string;
  /** Right-aligned columns get tighter right padding so the cell border is not clipped. */
  align?: "left" | "right";
};

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
      <div className="flex flex-nowrap items-center justify-between gap-3 overflow-x-auto scrollbar-none border-b border-stone-200 p-4 max-sm:flex-wrap max-sm:overflow-visible max-sm:p-3">
        <div className="shrink-0 max-sm:max-w-full max-sm:overflow-x-auto max-sm:scrollbar-none">{toolbar}</div>
        <span className="shrink-0 whitespace-nowrap text-xs font-medium text-stone-500 bg-stone-100 px-3 py-1.5 rounded-lg border border-stone-200/60">
          {filtered.length} of {rows.length}
        </span>
        <div className="relative shrink-0 w-44 max-sm:w-full">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-stone-200 bg-white outline-none focus:border-stone-400 transition h-9"
          />
        </div>
      </div>

      <Table className="table-fixed text-left min-w-[1090px]">
        <TableHeader className="bg-stone-50/80 text-xs font-semibold text-stone-500 uppercase tracking-wider">
          <TableRow className="hover:bg-transparent">
            {columns.map((col) => (
              <TableHead
                key={col.label}
                className={`h-auto py-3.5 font-semibold text-stone-500 uppercase tracking-wider whitespace-nowrap truncate ${
                  col.align === "right" ? "pl-6 pr-4 text-right" : "px-6"
                }`}
                style={{ width: col.width, minWidth: col.minWidth }}
              >
                {col.label}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody className="text-sm text-stone-700">
          {filtered.map((row) => (
            <TableRow key={rowKey(row)} className="hover:bg-stone-50/60">
              {columns.map((col) => (
                <TableCell
                  key={col.label}
                  className={`py-4 align-middle whitespace-nowrap overflow-hidden ${
                    col.align === "right" ? "pl-6 pr-4 text-right" : "px-6"
                  }`}
                  style={{ width: col.width, minWidth: col.minWidth }}
                >
                  {col.render(row)}
                </TableCell>
              ))}
            </TableRow>
          ))}
          {filtered.length === 0 && (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={columns.length} className="px-6 py-12 text-center text-xs font-medium text-stone-500">
                {emptyLabel}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </section>
  );
}