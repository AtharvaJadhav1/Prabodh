"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "../../../lib/api";
import { PlusIcon, UsersIcon } from "../../dashboard/icons";
import { BATCHES_HREF, type BatchSummary } from "./types";

/** Entry point on the admin Teams page: see existing batches or start a new one. */
export default function BatchesCard() {
  const [batches, setBatches] = useState<BatchSummary[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api<BatchSummary[]>("/admin/batches")
      .then((rows) => {
        if (!cancelled) setBatches(rows ?? []);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="mb-5 rounded-2xl border border-neutral-200/80 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-lightOrange text-brand-primary">
            <UsersIcon className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-brand-deep">Batches</h2>
            <p className="mt-0.5 text-xs font-medium text-neutral-500">
              {failed
                ? "Could not load batches."
                : batches === null
                  ? "Loading batches…"
                  : batches.length === 0
                    ? "No batches yet. Group teams into a batch to manage them together."
                    : `${batches.length} batch${batches.length === 1 ? "" : "es"} · ${batches.reduce(
                        (n, b) => n + b.teamCount,
                        0,
                      )} teams grouped`}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={BATCHES_HREF}
            className="rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-xs font-bold text-brand-deep transition-colors hover:bg-neutral-50"
          >
            View batches
          </Link>
          <Link
            href={`${BATCHES_HREF}/new`}
            className="inline-flex items-center gap-1.5 rounded-xl bg-brand-primary px-4 py-2.5 text-xs font-bold text-white shadow-sm transition-colors hover:bg-brand-hover"
          >
            <PlusIcon className="h-4 w-4" />
            Create batch
          </Link>
        </div>
      </div>

      {batches && batches.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2 border-t border-neutral-100 pt-4">
          {batches.slice(0, 6).map((b) => (
            <Link
              key={b.id}
              href={`${BATCHES_HREF}/${b.id}`}
              className="rounded-lg border border-brand-warmBorder bg-brand-lightOrange px-3 py-1.5 text-[11px] font-semibold text-brand-primary transition-colors hover:bg-brand-primary hover:text-white"
            >
              {b.name} · {b.teamCount}
            </Link>
          ))}
          {batches.length > 6 ? (
            <Link href={BATCHES_HREF} className="px-2 py-1.5 text-[11px] font-semibold text-neutral-500 hover:text-brand-primary">
              +{batches.length - 6} more
            </Link>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
