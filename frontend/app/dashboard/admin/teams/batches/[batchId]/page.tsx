"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import AdminShell from "../../../../../../components/admin/AdminShell";
import AddTeamsModal from "../../../../../../components/admin/batches/AddTeamsModal";
import BulkLeadersModal from "../../../../../../components/admin/batches/BulkLeadersModal";
import StatusPill from "../../../../../../components/admin/StatusPill";
import LoadingState from "../../../../../../components/LoadingState";
import { ApiError, api, apiDelete, apiPatch, apiPost } from "../../../../../../lib/api";
import { PlusIcon, UsersIcon, XIcon } from "../../../../../../components/dashboard/icons";
import { BATCHES_HREF, type BatchDetail, type BatchTeam } from "../../../../../../components/admin/batches/types";

const errText = (err: unknown, fallback: string) =>
  err instanceof ApiError || err instanceof Error ? err.message : fallback;

export default function BatchDetailPage() {
  const { batchId } = useParams<{ batchId: string }>();
  const router = useRouter();
  const [batch, setBatch] = useState<BatchDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api<BatchDetail>(`/admin/batches/${batchId}`);
      setBatch(res);
      setError("");
    } catch (err) {
      setError(err instanceof ApiError && err.status === 404 ? "This batch no longer exists." : "Failed to load the batch.");
    } finally {
      setLoading(false);
    }
  }, [batchId]);

  useEffect(() => {
    void load();
  }, [load]);

  const run = async (fn: () => Promise<unknown>, fallback: string) => {
    setBusy(true);
    setActionError("");
    try {
      await fn();
      return true;
    } catch (err) {
      setActionError(errText(err, fallback));
      return false;
    } finally {
      setBusy(false);
    }
  };

  const addTeams = async (picked: BatchTeam[]) => {
    if (!picked.length) return;
    const ok = await run(
      () => apiPost(`/admin/batches/${batchId}/teams`, { teamIds: picked.map((t) => t.id) }),
      "Could not add the teams.",
    );
    if (ok) await load();
  };

  const removeTeam = async (teamId: string) => {
    const ok = await run(() => apiDelete(`/admin/batches/${batchId}/teams/${teamId}`), "Could not remove the team.");
    if (ok) await load();
  };

  const saveEdit = async () => {
    if (name.trim().length < 2) {
      setActionError("The batch name must be at least 2 characters.");
      return;
    }
    const ok = await run(
      () => apiPatch(`/admin/batches/${batchId}`, { name: name.trim(), description: description.trim() || null }),
      "Could not save changes.",
    );
    if (ok) {
      setEditing(false);
      await load();
    }
  };

  const deleteBatch = async () => {
    const ok = await run(() => apiDelete(`/admin/batches/${batchId}`), "Could not delete the batch.");
    if (ok) router.push(BATCHES_HREF);
  };

  return (
    <AdminShell title="Batch Details">
      <div className="mx-auto max-w-4xl">
        <Link href={BATCHES_HREF} className="text-sm font-medium text-brand-muted hover:text-brand-primary">
          ← Back to Batches
        </Link>

        {loading ? (
          <div className="mt-4 flex h-48 items-center justify-center rounded-2xl border border-brand-sand bg-white">
            <LoadingState compact label="Loading batch" steps={["Fetching batch"]} />
          </div>
        ) : error || !batch ? (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-6 max-sm:p-4 text-sm font-medium text-red-600">
            {error || "Batch not found."}
          </div>
        ) : (
          <div className="mt-4 space-y-5">
            <section className="rounded-2xl border border-neutral-200/80 bg-white p-6 max-sm:p-4 shadow-sm">
              {editing ? (
                <div className="space-y-3">
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    maxLength={80}
                    aria-label="Batch name"
                    className="w-full rounded-xl border border-brand-sand px-4 py-2.5 text-sm font-semibold outline-none focus:border-brand-primary"
                  />
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    maxLength={500}
                    rows={2}
                    aria-label="Description"
                    placeholder="Description (optional)"
                    className="w-full resize-none rounded-xl border border-brand-sand px-4 py-2.5 text-sm outline-none focus:border-brand-primary"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void saveEdit()}
                      className="rounded-xl bg-brand-primary px-4 py-2 text-xs font-bold text-white hover:bg-brand-hover disabled:opacity-60"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditing(false)}
                      className="rounded-xl border border-neutral-200 px-4 py-2 text-xs font-bold text-neutral-700 hover:bg-neutral-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <h1 className="break-words text-2xl font-bold text-brand-deep max-sm:text-xl">{batch.name}</h1>
                    {batch.description ? <p className="mt-1 break-words text-sm text-neutral-600">{batch.description}</p> : null}
                    <p className="mt-2 text-[11px] font-medium text-neutral-400">
                      Created {new Date(batch.createdAt).toLocaleDateString()}
                      {batch.createdBy ? ` by ${batch.createdBy.fullName}` : ""} · {batch.teams.length} team
                      {batch.teams.length === 1 ? "" : "s"}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setName(batch.name);
                        setDescription(batch.description ?? "");
                        setActionError("");
                        setEditing(true);
                      }}
                      className="rounded-xl border border-neutral-200 bg-white px-4 py-2 text-xs font-bold text-neutral-700 hover:bg-neutral-50"
                    >
                      Edit
                    </button>
                    {!confirmDelete ? (
                      <button
                        type="button"
                        onClick={() => setConfirmDelete(true)}
                        className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-100"
                      >
                        Delete
                      </button>
                    ) : null}
                  </div>
                </div>
              )}

              {confirmDelete ? (
                <div className="mt-4 flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className="min-w-0 break-words text-xs font-semibold text-red-700">
                    Delete this batch? Its teams are not deleted — they just leave the batch and become available again.
                  </p>
                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(false)}
                      className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-bold text-neutral-700"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void deleteBatch()}
                      className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-60"
                    >
                      {busy ? "Deleting…" : "Confirm delete"}
                    </button>
                  </div>
                </div>
              ) : null}
            </section>

            {actionError ? (
              <p className="break-words rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-600">{actionError}</p>
            ) : null}

            <section className="rounded-2xl border border-neutral-200/80 bg-white p-6 max-sm:p-4 shadow-sm">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-sm font-bold uppercase tracking-wide text-neutral-500">Teams</h2>
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

              {batch.teams.length === 0 ? (
                <p className="rounded-xl border border-dashed border-neutral-300 p-6 max-sm:p-4 text-center text-xs text-neutral-500">
                  This batch has no teams yet.
                </p>
              ) : (
                <ul className="divide-y divide-neutral-100 rounded-xl border border-neutral-200">
                  {batch.teams.map((t) => (
                    <li key={t.id} className="flex items-center justify-between gap-3 px-4 py-3">
                      <Link href={`/dashboard/admin/teams/${t.id}`} className="min-w-0 hover:underline">
                        <div className="truncate text-sm font-bold text-neutral-900">{t.name}</div>
                        <div className="truncate font-mono text-[11px] text-neutral-500">
                          {t.teamCode} · {t.institute}
                        </div>
                      </Link>
                      <div className="flex shrink-0 items-center gap-3">
                        <span className="hidden items-center gap-1 text-xs font-bold text-neutral-900 sm:inline-flex">
                          <UsersIcon className="h-3.5 w-3.5 text-neutral-400" />
                          {t._count?.members ?? 0}
                        </span>
                        <StatusPill status={t.status} />
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void removeTeam(t.id)}
                          aria-label={`Remove ${t.name} from batch`}
                          title="Remove from batch"
                          className="rounded-lg p-1.5 text-neutral-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                        >
                          <XIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        )}
      </div>

      <BulkLeadersModal
        open={bulkOpen}
        batchId={batchId}
        batchName={batch?.name ?? "this batch"}
        onClose={() => setBulkOpen(false)}
        onDone={() => void load()}
      />
      <AddTeamsModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        selectedIds={[]}
        onConfirm={(picked) => void addTeams(picked)}
      />
    </AdminShell>
  );
}
