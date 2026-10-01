"use client";

import { useMemo, useRef, useState } from "react";
import { ApiError, apiPost } from "../../../lib/api";
import { XIcon } from "../../dashboard/icons";
import type { BatchDetail } from "./types";

type Status = "added" | "already_in_batch" | "in_other_batch" | "no_account" | "not_a_leader";

type Result = {
  email: string;
  status: Status;
  teams: Array<{ id: string; name: string; teamCode: string }>;
  otherBatch?: string;
};

type Response = {
  batch: BatchDetail;
  results: Result[];
  summary: {
    requested: number;
    added: number;
    teamsAdded: number;
    alreadyInBatch: number;
    inOtherBatch: number;
    noAccount: number;
    notALeader: number;
  };
};

type Props = {
  open: boolean;
  batchId: string;
  batchName: string;
  onClose: () => void;
  /** Called after teams were added so the page can refresh. */
  onDone: () => void;
};

const EMAIL_RE = /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/;
const MAX_EMAILS = 500;

const STATUS_UI: Record<Status, { label: string; cls: string }> = {
  added: { label: "Added", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  already_in_batch: { label: "Already in this batch", cls: "bg-sky-50 text-sky-700 border-sky-200" },
  in_other_batch: { label: "In another batch", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  no_account: { label: "No account found", cls: "bg-red-50 text-red-700 border-red-200" },
  not_a_leader: { label: "Not a team leader", cls: "bg-red-50 text-red-700 border-red-200" },
};

/** Split pasted text / CSV into unique valid emails plus the tokens we could not use. */
export function parseEmails(raw: string): { valid: string[]; invalid: string[] } {
  const seen = new Set<string>();
  const valid: string[] = [];
  const invalid: string[] = [];
  for (const token of raw.split(/[\s,;]+/)) {
    const t = token.trim().replace(/^["'<(]+|["'>)]+$/g, "").toLowerCase();
    if (!t) continue;
    if (!EMAIL_RE.test(t)) {
      // CSV headers like "email" or "leader" are not worth warning about.
      if (!/^(e-?mail|leader|team|name)s?$/i.test(t)) invalid.push(token.trim());
      continue;
    }
    if (!seen.has(t)) {
      seen.add(t);
      valid.push(t);
    }
  }
  return { valid, invalid };
}

export default function BulkLeadersModal({ open, batchId, batchName, onClose, onDone }: Props) {
  const [text, setText] = useState("");
  const [notify, setNotify] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [response, setResponse] = useState<Response | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const parsed = useMemo(() => parseEmails(text), [text]);
  const tooMany = parsed.valid.length > MAX_EMAILS;

  const close = () => {
    if (busy) return;
    if (response && response.summary.teamsAdded > 0) onDone();
    setText("");
    setResponse(null);
    setError("");
    onClose();
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > 1_000_000) {
      setError("That file is too large. Use a plain list of emails (under 1 MB).");
      return;
    }
    const content = await file.text();
    setText((prev) => (prev.trim() ? `${prev.trim()}\n${content}` : content));
    setError("");
    if (fileRef.current) fileRef.current.value = "";
  };

  const send = async () => {
    setError("");
    setBusy(true);
    try {
      const res = await apiPost<Response>(`/admin/batches/${batchId}/leaders`, {
        emails: parsed.valid,
        notify,
      });
      setResponse(res);
      if (res.summary.teamsAdded > 0) onDone();
    } catch (err) {
      setError(err instanceof ApiError || err instanceof Error ? err.message : "Bulk add failed. Try again.");
    } finally {
      setBusy(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-brand-deep/50 p-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Bulk add teams by leader email"
        className="my-8 flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-brand-sand bg-white shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-brand-sand bg-brand-cream p-5">
          <div>
            <h3 className="text-lg font-bold text-brand-deep">Bulk add by leader email</h3>
            <p className="mt-0.5 text-xs text-brand-muted">
              Each leader&apos;s team is added straight into <span className="font-semibold">{batchName}</span>.
            </p>
          </div>
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="rounded-lg p-1.5 text-brand-muted transition-colors hover:bg-white hover:text-brand-deep"
          >
            <XIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          {!response ? (
            <>
              <div>
                <div className="mb-1.5 flex items-center justify-between gap-3">
                  <label htmlFor="bulk-emails" className="text-xs font-bold uppercase tracking-wider text-brand-deep">
                    Team leader emails
                  </label>
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="text-xs font-semibold text-brand-primary hover:text-brand-hover"
                  >
                    Upload .csv / .txt
                  </button>
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".csv,.txt,text/csv,text/plain"
                    className="hidden"
                    onChange={(e) => void onFile(e.target.files?.[0])}
                  />
                </div>
                <textarea
                  id="bulk-emails"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  rows={7}
                  placeholder={"leader1@college.edu\nleader2@college.edu, leader3@college.edu"}
                  className="w-full resize-y rounded-xl border border-brand-sand bg-white px-4 py-3 font-mono text-xs text-brand-charcoal shadow-sm outline-none transition focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
                />
                <p className="mt-1.5 text-[11px] text-neutral-500">
                  Separate emails with new lines, commas or spaces. Duplicates are ignored.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-semibold">
                <span className="text-emerald-700">{parsed.valid.length} valid email{parsed.valid.length === 1 ? "" : "s"}</span>
                {parsed.invalid.length > 0 ? (
                  <span className="text-red-600" title={parsed.invalid.join(", ")}>
                    {parsed.invalid.length} not recognised and will be skipped
                  </span>
                ) : null}
                {tooMany ? <span className="text-red-600">Maximum {MAX_EMAILS} emails at a time</span> : null}
              </div>

              <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-neutral-200 p-3 text-xs">
                <input
                  type="checkbox"
                  checked={notify}
                  onChange={(e) => setNotify(e.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-[#d95c26]"
                />
                <span>
                  <span className="font-bold text-brand-deep">Email the team leaders</span>
                  <span className="block text-neutral-500">
                    Leaders whose team is added get a short notification that it joined this batch.
                  </span>
                </span>
              </label>
            </>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {[
                  { label: "Teams added", value: response.summary.teamsAdded, cls: "text-emerald-700" },
                  { label: "Already in batch", value: response.summary.alreadyInBatch, cls: "text-sky-700" },
                  { label: "In another batch", value: response.summary.inOtherBatch, cls: "text-amber-700" },
                  {
                    label: "Not found",
                    value: response.summary.noAccount + response.summary.notALeader,
                    cls: "text-red-700",
                  },
                ].map((c) => (
                  <div key={c.label} className="rounded-xl border border-neutral-200 p-3 text-center">
                    <div className={`text-xl font-extrabold ${c.cls}`}>{c.value}</div>
                    <div className="text-[11px] font-semibold text-neutral-500">{c.label}</div>
                  </div>
                ))}
              </div>
              <ul className="divide-y divide-neutral-100 rounded-xl border border-neutral-200">
                {response.results.map((r) => (
                  <li key={r.email} className="flex flex-col gap-1 px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <div className="truncate font-mono text-xs font-semibold text-neutral-900">{r.email}</div>
                      {r.teams.length > 0 ? (
                        <div className="truncate text-[11px] text-neutral-500">
                          {r.teams.map((t) => `${t.name} (${t.teamCode})`).join(", ")}
                          {r.status === "in_other_batch" && r.otherBatch ? ` — in “${r.otherBatch}”` : ""}
                        </div>
                      ) : null}
                    </div>
                    <span
                      className={`inline-block shrink-0 rounded-lg border px-2.5 py-1 text-[11px] font-semibold ${STATUS_UI[r.status].cls}`}
                    >
                      {STATUS_UI[r.status].label}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}

          {error ? <p className="text-sm font-medium text-red-700">{error}</p> : null}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-brand-sand bg-brand-cream p-4">
          {!response ? (
            <>
              <button
                type="button"
                onClick={close}
                className="rounded-xl border border-brand-sand bg-white px-4 py-2 text-xs font-bold text-brand-deep hover:bg-brand-cream"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busy || parsed.valid.length === 0 || tooMany}
                onClick={() => void send()}
                className="rounded-xl bg-brand-primary px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busy ? "Adding…" : `Add teams for ${parsed.valid.length} leader${parsed.valid.length === 1 ? "" : "s"}`}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={close}
              className="rounded-xl bg-brand-primary px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-brand-hover"
            >
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
