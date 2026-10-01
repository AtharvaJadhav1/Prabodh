"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import AdminShell from "../../../../../../components/admin/AdminShell";
import AddTeamsModal from "../../../../../../components/admin/batches/AddTeamsModal";
import BulkLeadersModal from "../../../../../../components/admin/batches/BulkLeadersModal";
import StatusPill from "../../../../../../components/admin/StatusPill";
import { ApiError, apiPost } from "../../../../../../lib/api";
import { PlusIcon, XIcon } from "../../../../../../components/dashboard/icons";
import { BATCHES_HREF, type BatchDetail, type BatchTeam } from "../../../../../../components/admin/batches/types";

export default function CreateBatchPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [teams, setTeams] = useState<BatchTeam[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const removeTeam = (id: string) => setTeams((prev) => prev.filter((t) => t.id !== id));

  const submit = async () => {
    setError("");
    if (name.trim().length < 2) {
      setError("Give the batch a name (at least 2 characters).");
      return;
    }
    setSaving(true);
    try {
      const created = await apiPost<BatchDetail>("/admin/batches", {
        name: name.trim(),
        description: description.trim() || undefined,
        teamIds: teams.map((t) => t.id),
      });
      router.push(`${BATCHES_HREF}/${created.id}`);
    } catch (err) {
      setError(err instanceof ApiError || err instanceof Error ? err.message : "Could not create the batch.");
      setSaving(false);
    }
  };

  return (
    <AdminShell title="Create Batch">
      <div className="mx-auto max-w-3xl">
        <Link href={BATCHES_HREF} className="text-sm font-medium text-brand-muted hover:text-brand-primary">
          ← Back to Batches
        </Link>

        <form
          className="mt-4 space-y-6 rounded-2xl border border-neutral-200/80 bg-white p-6 shadow-sm"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <div className="space-y-1.5">
            <label htmlFor="batch-name" className="block text-xs font-bold uppercase tracking-wider text-brand-deep">
              Batch name
            </label>
            <input
              id="batch-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={80}
              placeholder="e.g. Batch 1 — Morning cohort"
              className="w-full rounded-xl border border-brand-sand bg-white px-4 py-3 text-sm font-medium text-brand-charcoal shadow-sm outline-none transition focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="batch-desc" className="block text-xs font-bold uppercase tracking-wider text-brand-deep">
              Description <span className="font-medium normal-case text-neutral-400">(optional)</span>
            </label>
            <textarea
              id="batch-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={500}
              rows={2}
              className="w-full resize-none rounded-xl border border-brand-sand bg-white px-4 py-3 text-sm font-medium text-brand-charcoal shadow-sm outline-none transition focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
            />
          </div>

          <div>
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-brand-deep">
                Teams in this batch ({teams.length})
              </h2>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setBulkOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-200 bg-white px-3.5 py-2 text-xs font-bold text-brand-deep transition-colors hover:bg-neutral-50"
                >
                  Bulk add by leader email
                </button>
                <button
                  type="button"
                  onClick={() => setPickerOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-brand-primary/30 bg-brand-lightOrange px-3.5 py-2 text-xs font-bold text-brand-primary transition-colors hover:bg-brand-primary hover:text-white"
                >
                  <PlusIcon className="h-4 w-4" />
                  Add teams
                </button>
              </div>
            </div>

            {teams.length === 0 ? (
              <p className="mt-3 rounded-xl border border-dashed border-neutral-300 p-6 text-center text-xs text-neutral-500">
                No teams added yet. Use <strong>Add teams</strong> to pick from teams that aren&apos;t in any batch.
              </p>
            ) : (
              <ul className="mt-3 divide-y divide-neutral-100 rounded-xl border border-neutral-200">
                {teams.map((t) => (
                  <li key={t.id} className="flex items-center justify-between gap-3 px-4 py-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-bold text-neutral-900">{t.name}</div>
                      <div className="truncate font-mono text-[11px] text-neutral-500">
                        {t.teamCode} · {t.institute}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <StatusPill status={t.status} />
                      <button
                        type="button"
                        onClick={() => removeTeam(t.id)}
                        aria-label={`Remove ${t.name}`}
                        className="rounded-lg p-1.5 text-neutral-400 transition-colors hover:bg-red-50 hover:text-red-600"
                      >
                        <XIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {error ? <p className="text-sm font-medium text-red-700">{error}</p> : null}

          <div className="flex justify-end gap-2 border-t border-neutral-100 pt-5">
            <Link
              href={BATCHES_HREF}
              className="rounded-xl border border-neutral-200 bg-white px-5 py-2.5 text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-brand-primary px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-hover disabled:opacity-60"
            >
              {saving ? "Creating…" : "Create batch"}
            </button>
          </div>
        </form>
      </div>

      <BulkLeadersModal
        open={bulkOpen}
        batchName={name.trim() || "the new batch"}
        onClose={() => setBulkOpen(false)}
        onResolved={(found) =>
          setTeams((prev) => [...prev, ...found.filter((t) => !prev.some((p) => p.id === t.id))])
        }
      />
      <AddTeamsModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        selectedIds={teams.map((t) => t.id)}
        onConfirm={setTeams}
      />
    </AdminShell>
  );
}
