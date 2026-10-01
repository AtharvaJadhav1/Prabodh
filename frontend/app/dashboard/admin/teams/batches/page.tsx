"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import AdminShell from "../../../../../components/admin/AdminShell";
import LoadingState from "../../../../../components/LoadingState";
import { api } from "../../../../../lib/api";
import { PlusIcon, SearchIcon, UsersIcon, ChevronRightIcon } from "../../../../../components/dashboard/icons";
import { BATCHES_HREF, type BatchSummary } from "../../../../../components/admin/batches/types";

export default function AdminBatchesPage() {
  const [batches, setBatches] = useState<BatchSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    let cancelled = false;
    api<BatchSummary[]>("/admin/batches")
      .then((rows) => {
        if (!cancelled) setBatches(rows ?? []);
      })
      .catch(() => {
        if (!cancelled) setError("Failed to load batches. Refresh to try again.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? batches.filter((b) => b.name.toLowerCase().includes(q)) : batches;
  }, [batches, search]);

  return (
    <AdminShell title="Batches">
      <div className="mx-auto max-w-5xl">
        <Link href="/dashboard/admin/teams" className="text-sm font-medium text-brand-muted hover:text-brand-primary">
          ← Back to Teams
        </Link>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:w-80">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search batches…"
              className="w-full rounded-xl border border-neutral-200 bg-white py-2.5 pl-9 pr-3 text-xs text-neutral-900 placeholder-neutral-400 transition focus:border-brand-primary focus:outline-none"
            />
            <SearchIcon className="absolute left-3 top-3 h-4 w-4 text-neutral-400" />
          </div>
          <Link
            href={`${BATCHES_HREF}/new`}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-brand-primary px-4 py-2.5 text-xs font-bold text-white shadow-sm transition-colors hover:bg-brand-hover"
          >
            <PlusIcon className="h-4 w-4" />
            Create batch
          </Link>
        </div>

        <div className="mt-5">
          {loading ? (
            <div className="flex h-48 items-center justify-center rounded-2xl border border-brand-sand bg-white">
              <LoadingState compact label="Loading batches" steps={["Fetching batches"]} />
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm font-medium text-red-600">{error}</div>
          ) : batches.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-neutral-300 bg-white p-10 text-center">
              <p className="text-sm font-semibold text-neutral-800">No batches created yet</p>
              <p className="mt-1 text-xs text-neutral-500">Create a batch and add teams that aren&apos;t in any batch.</p>
            </div>
          ) : filtered.length === 0 ? (
            <p className="rounded-2xl border border-neutral-200 bg-white p-8 text-center text-sm text-neutral-500">
              No batches match &ldquo;{search}&rdquo;.
            </p>
          ) : (
            <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {filtered.map((b) => (
                <li key={b.id}>
                  <Link
                    href={`${BATCHES_HREF}/${b.id}`}
                    className="flex h-full items-center justify-between gap-4 rounded-2xl border border-neutral-200/80 bg-white p-5 shadow-sm transition hover:border-brand-primary/40 hover:shadow-md"
                  >
                    <div className="min-w-0">
                      <h3 className="truncate text-base font-bold text-brand-deep">{b.name}</h3>
                      {b.description ? (
                        <p className="mt-0.5 line-clamp-2 text-xs text-neutral-500">{b.description}</p>
                      ) : null}
                      <p className="mt-2 text-[11px] font-medium text-neutral-400">
                        Created {new Date(b.createdAt).toLocaleDateString()}
                        {b.createdBy ? ` by ${b.createdBy.fullName}` : ""}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <span className="inline-flex items-center gap-1 rounded-full border border-neutral-200 bg-neutral-50 px-2.5 py-1 text-xs font-bold text-neutral-900">
                        <UsersIcon className="h-3.5 w-3.5 text-neutral-400" />
                        {b.teamCount} team{b.teamCount === 1 ? "" : "s"}
                      </span>
                      <ChevronRightIcon className="h-4 w-4 text-neutral-300" />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </AdminShell>
  );
}
