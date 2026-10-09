"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api, apiDelete, apiPatch, apiPost } from "../../lib/api";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "../ui/table";
import { Button } from "../ui/button";
import {
  SearchIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  XIcon,
  UploadCloudIcon,
  FileSpreadsheetIcon,
  AlertTriangleIcon,
  FileTextIcon,
} from "../dashboard/icons";

export type PsItem = {
  id: string;
  code: string;
  title: string;
  theme: string;
  category: string;
  organisation: string;
  description: string;
  teamCap?: number | null;
};

export type PsFormValues = {
  code: string;
  title: string;
  theme: string;
  category: "software" | "hardware";
  organisation: string;
  description: string;
  teamCap: string;
};

const EMPTY_FORM: PsFormValues = {
  code: "",
  title: "",
  theme: "",
  category: "software",
  organisation: "",
  description: "",
  teamCap: "",
};

const INPUT_CLS =
  "w-full rounded-xl border border-neutral-200 bg-white px-3.5 py-2.5 text-sm text-neutral-800 placeholder:text-neutral-400 focus:border-[#d95c26] focus:ring-2 focus:ring-[#d95c26]/20 transition-all outline-none";
const LABEL_CLS = "mb-1.5 block text-xs font-medium text-neutral-600";
const ERROR_CLS = "mt-1 text-xs font-medium text-red-600";

const CSV_HEADERS = ["code", "title", "theme", "category", "organisation", "description", "teamCap"] as const;

/**
 * Field validation mirrors backend `createPsSchema`
 * (backend/src/modules/problem-statements/schema.ts) exactly:
 * code>=3, title>=5, theme>=2, category enum, organisation>=2,
 * description>=10, teamCap positive int optional.
 */
export function validatePsForm(values: PsFormValues): Record<string, string> {
  const errors: Record<string, string> = {};
  if (values.code.trim().length < 3) errors.code = "Code must be at least 3 characters.";
  if (values.title.trim().length < 5) errors.title = "Title must be at least 5 characters.";
  if (values.theme.trim().length < 2) errors.theme = "Theme must be at least 2 characters.";
  if (values.category !== "software" && values.category !== "hardware")
    errors.category = 'Category must be "software" or "hardware".';
  if (values.organisation.trim().length < 2) errors.organisation = "Organisation must be at least 2 characters.";
  if (values.description.trim().length < 10) errors.description = "Description must be at least 10 characters.";
  if (values.teamCap.trim() !== "") {
    const n = Number(values.teamCap);
    if (!Number.isInteger(n) || n <= 0) errors.teamCap = "Team cap must be a positive whole number.";
  }
  return errors;
}

export function toPsPayload(values: PsFormValues): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    code: values.code.trim(),
    title: values.title.trim(),
    theme: values.theme.trim(),
    category: values.category,
    organisation: values.organisation.trim(),
    description: values.description.trim(),
  };
  if (values.teamCap.trim() !== "") payload.teamCap = Number(values.teamCap);
  return payload;
}

/** Minimal RFC-4180 CSV parser (quotes, escaped quotes, commas/newlines in fields). No dependency. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (c === "\r") {
      // skip; \n handles the break
    } else {
      field += c;
    }
  }
  row.push(field);
  rows.push(row);
  // Drop trailing empty row from final newline
  while (rows.length > 0 && rows[rows.length - 1].every((c) => c.trim() === "")) rows.pop();
  return rows;
}

export type BulkRow = {
  index: number;
  values: PsFormValues;
  errors: Record<string, string>;
  status: "pending" | "ok" | "error";
  message?: string;
};

export function rowsFromCsv(text: string): BulkRow[] {
  const grid = parseCsv(text);
  if (grid.length === 0) return [];
  const header = grid[0].map((h) => h.trim());
  const idx: Record<string, number> = {};
  header.forEach((h, i) => {
    if (!(h in idx)) idx[h] = i;
  });
  return grid.slice(1).map((cells, r) => {
    const get = (name: string) => (idx[name] === undefined ? "" : (cells[idx[name]] ?? "").trim());
    const categoryRaw = get("category").toLowerCase();
    const values: PsFormValues = {
      code: get("code"),
      title: get("title"),
      theme: get("theme"),
      category: categoryRaw === "hardware" ? "hardware" : "software",
      organisation: get("organisation"),
      description: get("description"),
      teamCap: get("teamCap"),
    };
    const errors = validatePsForm(values);
    // Preserve the raw category error distinctly: anything not exactly software/hardware is invalid.
    if (categoryRaw !== "software" && categoryRaw !== "hardware") {
      errors.category = 'Category must be "software" or "hardware".';
    }
    if (idx["code"] === undefined) errors.code = "Missing 'code' column in CSV header.";
    return { index: r + 2, values, errors, status: Object.keys(errors).length > 0 ? "error" : "pending" };
  });
}

async function fetchAllProblemStatements(): Promise<PsItem[]> {
  const collected: PsItem[] = [];
  let page = 1;
  let pages = 1;
  do {
    const params = new URLSearchParams();
    params.set("limit", "200");
    params.set("page", String(page));
    const res = await api<{ items: PsItem[]; pages: number }>(`/problem-statements?${params.toString()}`);
    collected.push(...(res.items ?? []));
    pages = Math.max(1, res.pages ?? 1);
    page += 1;
  } while (page <= pages && page <= 10);
  return collected;
}

export default function ProblemStatementsAdmin() {
  const [items, setItems] = useState<PsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [search, setSearch] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<PsItem | null>(null);
  const [form, setForm] = useState<PsFormValues>(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [formMsg, setFormMsg] = useState("");
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<PsItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteMsg, setDeleteMsg] = useState("");

  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkRows, setBulkRows] = useState<BulkRow[]>([]);
  const [bulkFileName, setBulkFileName] = useState("");
  const [bulkMsg, setBulkMsg] = useState("");
  const [bulkBusy, setBulkBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      setItems(await fetchAllProblemStatements());
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Could not load problem statements");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (ps) =>
        ps.code.toLowerCase().includes(q) ||
        ps.title.toLowerCase().includes(q) ||
        ps.theme.toLowerCase().includes(q) ||
        ps.organisation.toLowerCase().includes(q),
    );
  }, [items, search]);

  const openAdd = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormErrors({});
    setFormMsg("");
    setFormOpen(true);
  };

  const openEdit = (ps: PsItem) => {
    setEditing(ps);
    setForm({
      code: ps.code,
      title: ps.title,
      theme: ps.theme,
      category: ps.category.toLowerCase() === "hardware" ? "hardware" : "software",
      organisation: ps.organisation,
      description: ps.description,
      teamCap: ps.teamCap != null ? String(ps.teamCap) : "",
    });
    setFormErrors({});
    setFormMsg("");
    setFormOpen(true);
  };

  const submitForm = async () => {
    const errors = validatePsForm(form);
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) return;
    setSaving(true);
    setFormMsg("");
    try {
      if (editing) {
        const updated = await apiPatch<PsItem>(`/problem-statements/${editing.id}`, toPsPayload(form));
        setItems((prev) => prev.map((ps) => (ps.id === editing.id ? updated : ps)));
      } else {
        const created = await apiPost<PsItem>("/problem-statements", toPsPayload(form));
        setItems((prev) => [created, ...prev]);
      }
      setFormOpen(false);
      void reload();
    } catch (err) {
      setFormMsg(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteMsg("");
    try {
      await apiDelete(`/problem-statements/${deleteTarget.id}`);
      setItems((prev) => prev.filter((ps) => ps.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) {
      setDeleteMsg(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setDeleting(false);
    }
  };

  const downloadTemplate = () => {
    const content = [
      CSV_HEADERS.join(","),
      "SIH001,Smart Traffic Optimizer,Smart Transportation,software,Ministry of Transport,\"AI system that optimizes traffic signals in real time.\",6",
      "SIH002,Low-cost Water Purifier,Clean Water,hardware,Ministry of Jal Shakti,\"Solar-powered purifier for rural households.\",4",
    ].join("\n");
    const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "problem_statements_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const readBulkFile = (file: File | undefined | null) => {
    if (!file) return;
    setBulkFileName(file.name);
    setBulkMsg("");
    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === "string" ? reader.result : "";
      setBulkRows(rowsFromCsv(text));
    };
    reader.readAsText(file);
  };

  const uploadBulk = async () => {
    const valid = bulkRows.filter((r) => Object.keys(r.errors).length === 0 && r.status === "pending");
    if (valid.length === 0) {
      setBulkMsg("No valid rows to upload. Fix the highlighted errors first.");
      return;
    }
    setBulkBusy(true);
    setBulkMsg("");
    let ok = 0;
    let failed = 0;
    // Sequential to stay inside per-minute rate limits and keep error mapping exact.
    for (const row of valid) {
      try {
        await apiPost("/problem-statements", toPsPayload(row.values));
        ok++;
        setBulkRows((prev) => prev.map((r) => (r.index === row.index ? { ...r, status: "ok" as const } : r)));
      } catch (err) {
        failed++;
        setBulkRows((prev) =>
          prev.map((r) =>
            r.index === row.index
              ? { ...r, status: "error" as const, message: err instanceof Error ? err.message : "Upload failed" }
              : r,
          ),
        );
      }
    }
    setBulkMsg(`Uploaded ${ok} statement(s)${failed > 0 ? `, ${failed} failed` : ""}.`);
    setBulkBusy(false);
    void reload();
  };

  const validCount = bulkRows.filter((r) => Object.keys(r.errors).length === 0 && r.status !== "ok").length;
  const errorCount = bulkRows.filter((r) => Object.keys(r.errors).length > 0 || r.status === "error").length;

  const setField = (key: keyof PsFormValues, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="mx-auto max-w-7xl">
      {/* Header */}
      <section className="mb-6 rounded-2xl border border-neutral-200/80 bg-white p-6 shadow-sm max-sm:p-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#d95c26]/10">
              <FileTextIcon className="h-5 w-5 text-[#d95c26]" />
            </span>
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-neutral-900">Problem Statements</h2>
              <p className="mt-1 text-xs text-neutral-500">
                Create, edit, and remove catalog entries. Changes refresh the student repository immediately.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" onClick={() => setBulkOpen(true)}>
              <UploadCloudIcon className="h-4 w-4" />
              Bulk Upload
            </Button>
            <Button type="button" onClick={openAdd}>
              <PlusIcon className="h-4 w-4" />
              Add Single
            </Button>
          </div>
        </div>
      </section>

      {/* Table */}
      <section className="rounded-2xl border border-stone-200 bg-white shadow-xs">
        <div className="flex flex-nowrap items-center justify-between gap-3 overflow-x-auto border-b border-stone-200 p-4 max-sm:flex-wrap max-sm:overflow-visible max-sm:p-3">
          <span className="shrink-0 whitespace-nowrap rounded-lg border border-stone-200/60 bg-stone-100 px-3 py-1.5 text-xs font-medium text-stone-500">
            {filtered.length} of {items.length}
          </span>
          <div className="relative w-64 shrink-0 max-sm:w-full">
            <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              placeholder="Search by title or code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 w-full rounded-xl border border-stone-200 bg-white py-2 pl-9 pr-3 text-sm outline-none transition focus:border-stone-400"
            />
          </div>
        </div>

        {loading ? (
          <p className="px-6 py-12 text-center text-xs text-neutral-500">Loading problem statements…</p>
        ) : loadError ? (
          <div className="px-6 py-12 text-center">
            <p className="text-sm font-medium text-red-600">{loadError}</p>
            <Button type="button" variant="outline" size="sm" className="mt-3" onClick={() => void reload()}>
              Retry
            </Button>
          </div>
        ) : (
          <Table className="table-fixed text-left min-w-[960px]">
            <TableHeader className="bg-stone-50/80 text-xs font-semibold uppercase tracking-wider text-stone-500">
              <TableRow className="hover:bg-transparent">
                <TableHead className="h-auto truncate whitespace-nowrap px-6 py-3.5 font-semibold uppercase tracking-wider text-stone-500" style={{ width: "110px" }}>Code</TableHead>
                <TableHead className="h-auto truncate whitespace-nowrap px-6 py-3.5 font-semibold uppercase tracking-wider text-stone-500" style={{ width: "260px" }}>Title</TableHead>
                <TableHead className="h-auto truncate whitespace-nowrap px-6 py-3.5 font-semibold uppercase tracking-wider text-stone-500" style={{ width: "120px" }}>Category</TableHead>
                <TableHead className="h-auto truncate whitespace-nowrap px-6 py-3.5 font-semibold uppercase tracking-wider text-stone-500" style={{ width: "160px" }}>Theme</TableHead>
                <TableHead className="h-auto truncate whitespace-nowrap px-6 py-3.5 font-semibold uppercase tracking-wider text-stone-500" style={{ width: "180px" }}>Organisation</TableHead>
                <TableHead className="h-auto whitespace-nowrap py-3.5 pl-6 pr-4 text-right font-semibold uppercase tracking-wider text-stone-500" style={{ width: "130px" }}>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="text-sm text-stone-700">
              {filtered.map((ps) => (
                <TableRow key={ps.id} className="hover:bg-stone-50/60">
                  <TableCell className="overflow-hidden whitespace-nowrap px-6 py-4 align-middle">
                    <span className="rounded border border-stone-200 bg-stone-50 px-2 py-0.5 font-mono text-xs font-bold text-stone-800">{ps.code}</span>
                  </TableCell>
                  <TableCell className="overflow-hidden px-6 py-4 align-middle">
                    <span className="block truncate font-semibold text-stone-900" title={ps.title}>{ps.title}</span>
                  </TableCell>
                  <TableCell className="overflow-hidden whitespace-nowrap px-6 py-4 align-middle">
                    <span
                      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${
                        ps.category.toLowerCase() === "hardware"
                          ? "border-amber-200 bg-amber-50 text-amber-800"
                          : "border-sky-200 bg-sky-50 text-sky-800"
                      }`}
                    >
                      {ps.category.toLowerCase() === "hardware" ? "Hardware" : "Software"}
                    </span>
                  </TableCell>
                  <TableCell className="overflow-hidden px-6 py-4 align-middle">
                    <span className="block truncate text-xs text-stone-600" title={ps.theme}>{ps.theme}</span>
                  </TableCell>
                  <TableCell className="overflow-hidden px-6 py-4 align-middle">
                    <span className="block truncate text-xs text-stone-600" title={ps.organisation}>{ps.organisation}</span>
                  </TableCell>
                  <TableCell className="whitespace-nowrap py-4 pl-6 pr-4 text-right align-middle">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => openEdit(ps)}
                        title={`Edit ${ps.code}`}
                        className="rounded-lg border border-stone-200 bg-white p-2 text-stone-500 transition hover:bg-stone-100 hover:text-stone-800"
                      >
                        <PencilIcon className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setDeleteTarget(ps);
                          setDeleteMsg("");
                        }}
                        title={`Delete ${ps.code}`}
                        className="rounded-lg border border-stone-200 bg-white p-2 text-stone-400 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                      >
                        <TrashIcon className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={6} className="px-6 py-12 text-center text-xs font-medium text-stone-500">
                    No problem statements match your search.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </section>

      {/* Add / Edit dialog */}
      {formOpen ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
          <div className="max-h-[90dvh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-neutral-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-3 border-b border-neutral-100 px-6 py-4 max-sm:px-4">
              <div>
                <h3 className="text-sm font-bold text-neutral-900">{editing ? `Edit ${editing.code}` : "Add problem statement"}</h3>
                <p className="mt-0.5 text-xs text-neutral-500">Fields match the problem-statements API schema exactly.</p>
              </div>
              <button
                type="button"
                onClick={() => (!saving ? setFormOpen(false) : undefined)}
                aria-label="Close"
                className="shrink-0 rounded-lg p-1 text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-700"
              >
                <XIcon className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 px-6 py-5 max-sm:px-4 sm:grid-cols-2">
              <div>
                <label className={LABEL_CLS} htmlFor="ps-code">Code</label>
                <input id="ps-code" type="text" value={form.code} onChange={(e) => setField("code", e.target.value)} placeholder="e.g. SIH001" className={INPUT_CLS} />
                {formErrors.code ? <p className={ERROR_CLS}>{formErrors.code}</p> : null}
              </div>
              <div>
                <label className={LABEL_CLS} htmlFor="ps-category">Category</label>
                <select
                  id="ps-category"
                  value={form.category}
                  onChange={(e) => setField("category", e.target.value)}
                  className={INPUT_CLS}
                >
                  <option value="software">software</option>
                  <option value="hardware">hardware</option>
                </select>
                {formErrors.category ? <p className={ERROR_CLS}>{formErrors.category}</p> : null}
              </div>
              <div className="sm:col-span-2">
                <label className={LABEL_CLS} htmlFor="ps-title">Title</label>
                <input id="ps-title" type="text" value={form.title} onChange={(e) => setField("title", e.target.value)} placeholder="Short descriptive title" className={INPUT_CLS} />
                {formErrors.title ? <p className={ERROR_CLS}>{formErrors.title}</p> : null}
              </div>
              <div>
                <label className={LABEL_CLS} htmlFor="ps-theme">Theme</label>
                <input id="ps-theme" type="text" value={form.theme} onChange={(e) => setField("theme", e.target.value)} placeholder="e.g. Smart Transportation" className={INPUT_CLS} />
                {formErrors.theme ? <p className={ERROR_CLS}>{formErrors.theme}</p> : null}
              </div>
              <div>
                <label className={LABEL_CLS} htmlFor="ps-organisation">Organisation</label>
                <input id="ps-organisation" type="text" value={form.organisation} onChange={(e) => setField("organisation", e.target.value)} placeholder="e.g. Ministry of Transport" className={INPUT_CLS} />
                {formErrors.organisation ? <p className={ERROR_CLS}>{formErrors.organisation}</p> : null}
              </div>
              <div className="sm:col-span-2">
                <label className={LABEL_CLS} htmlFor="ps-description">Description</label>
                <textarea id="ps-description" value={form.description} onChange={(e) => setField("description", e.target.value)} rows={5} placeholder="Full problem background, constraints, expected outcomes…" className={`${INPUT_CLS} resize-y`} />
                {formErrors.description ? <p className={ERROR_CLS}>{formErrors.description}</p> : null}
              </div>
              <div>
                <label className={LABEL_CLS} htmlFor="ps-teamCap">Team cap (optional)</label>
                <input id="ps-teamCap" type="number" min={1} step={1} value={form.teamCap} onChange={(e) => setField("teamCap", e.target.value)} placeholder="e.g. 6" className={INPUT_CLS} />
                {formErrors.teamCap ? <p className={ERROR_CLS}>{formErrors.teamCap}</p> : null}
              </div>
            </div>

            {formMsg ? <p className="px-6 pb-2 text-xs font-medium text-red-600 max-sm:px-4">{formMsg}</p> : null}

            <div className="flex flex-wrap items-center justify-end gap-3 border-t border-neutral-100 bg-neutral-50/60 px-6 py-4 max-sm:px-4">
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                disabled={saving}
                className="rounded-xl px-4 py-2.5 text-sm font-semibold text-neutral-600 transition hover:bg-neutral-100 disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void submitForm()}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-[#3c2415] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[#2a190e] active:scale-[0.98] disabled:opacity-60"
              >
                {saving ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/60 border-t-white" />
                    Saving…
                  </>
                ) : editing ? (
                  "Save changes"
                ) : (
                  "Create statement"
                )}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Delete confirmation */}
      {deleteTarget ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-2xl">
            <div className="flex items-start gap-3 border-b border-neutral-100 bg-red-50/60 px-6 py-4 max-sm:px-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-100">
                <AlertTriangleIcon className="h-5 w-5 text-red-600" />
              </span>
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-neutral-900">Delete problem statement</h3>
                <p className="mt-0.5 break-words text-xs text-neutral-500">
                  {deleteTarget.code} · {deleteTarget.title}
                </p>
              </div>
            </div>
            <div className="px-6 py-5 max-sm:px-4">
              <p className="text-xs leading-relaxed text-neutral-600">
                This permanently removes the statement from the catalog. Teams that already referenced it keep their
                stored snapshot, but no new team can select it.
              </p>
              {deleteMsg ? <p className="mt-3 text-xs font-medium text-red-600">{deleteMsg}</p> : null}
            </div>
            <div className="flex flex-wrap items-center justify-end gap-3 border-t border-neutral-100 bg-neutral-50/60 px-6 py-4 max-sm:px-4">
              <button
                type="button"
                onClick={() => (!deleting ? setDeleteTarget(null) : undefined)}
                disabled={deleting}
                className="rounded-xl px-4 py-2.5 text-sm font-semibold text-neutral-600 transition hover:bg-neutral-100 disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void confirmDelete()}
                disabled={deleting}
                className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-all hover:bg-red-700 active:scale-[0.98] disabled:opacity-50"
              >
                {deleting ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/60 border-t-white" />
                    Deleting…
                  </>
                ) : (
                  <>
                    <TrashIcon className="h-4 w-4" />
                    Delete permanently
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Bulk upload */}
      {bulkOpen ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
          <div className="flex max-h-[90dvh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-3 border-b border-neutral-100 px-6 py-4 max-sm:px-4">
              <div className="flex min-w-0 items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#d95c26]/10">
                  <FileSpreadsheetIcon className="h-5 w-5 text-[#d95c26]" />
                </span>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-neutral-900">Bulk upload problem statements</h3>
                  <p className="mt-0.5 font-mono text-[11px] text-neutral-500">{CSV_HEADERS.join(",")}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => (!bulkBusy ? setBulkOpen(false) : undefined)}
                aria-label="Close"
                className="shrink-0 rounded-lg p-1 text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-700"
              >
                <XIcon className="h-4 w-4" />
              </button>
            </div>

            <div className="overflow-y-auto px-6 py-5 max-sm:px-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-neutral-500">
                  Upload a .csv file — rows are validated in your browser before anything is sent.
                </p>
                <button
                  type="button"
                  onClick={downloadTemplate}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#d95c26] transition hover:text-[#c04d1c]"
                >
                  <FileSpreadsheetIcon className="h-4 w-4" />
                  Download CSV Template
                </button>
              </div>

              <div
                role="button"
                tabIndex={0}
                onClick={() => fileInputRef.current?.click()}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") fileInputRef.current?.click();
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  readBulkFile(e.dataTransfer.files?.[0]);
                }}
                className={`mt-3 cursor-pointer rounded-xl border-2 border-dashed p-6 text-center transition-all ${
                  dragOver ? "border-[#d95c26]/60 bg-[#d95c26]/5" : "border-neutral-200 bg-neutral-50/50 hover:border-[#d95c26]/60 hover:bg-neutral-50"
                }`}
              >
                <UploadCloudIcon className="mx-auto h-8 w-8 text-neutral-300" />
                <p className="mt-2 text-sm font-medium text-neutral-700">
                  {bulkFileName ? bulkFileName : "Drag & drop CSV file here, or click to browse"}
                </p>
                <p className="mt-1 text-xs text-neutral-400">.csv files · headers: {CSV_HEADERS.join(", ")}</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={(e) => {
                    readBulkFile(e.target.files?.[0]);
                    e.target.value = "";
                  }}
                />
              </div>

              {bulkRows.length > 0 ? (
                <div className="mt-4">
                  <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
                    <span className="font-semibold text-neutral-700">{bulkRows.length} row(s) parsed</span>
                    <span className="rounded-full border border-green-200 bg-green-50 px-2 py-0.5 font-semibold text-green-700">{validCount} valid</span>
                    {errorCount > 0 ? (
                      <span className="rounded-full border border-red-200 bg-red-50 px-2 py-0.5 font-semibold text-red-700">{errorCount} with errors</span>
                    ) : null}
                  </div>
                  <div className="overflow-x-auto rounded-xl border border-neutral-200">
                    <table className="w-full min-w-[760px] text-left text-xs">
                      <thead>
                        <tr className="border-b bg-stone-50/80 text-[11px] font-semibold uppercase tracking-wider text-stone-500">
                          <th className="px-3 py-2.5">Row</th>
                          <th className="px-3 py-2.5">Code</th>
                          <th className="px-3 py-2.5">Title</th>
                          <th className="px-3 py-2.5">Category</th>
                          <th className="px-3 py-2.5">Theme</th>
                          <th className="px-3 py-2.5">Organisation</th>
                          <th className="px-3 py-2.5">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bulkRows.map((r) => {
                          const hasError = Object.keys(r.errors).length > 0 || r.status === "error";
                          return (
                            <tr key={r.index} className={`border-b last:border-0 ${hasError ? "bg-red-50/60" : r.status === "ok" ? "bg-green-50/60" : ""}`}>
                              <td className="px-3 py-2 font-mono text-stone-500">{r.index}</td>
                              <td className="px-3 py-2 font-mono font-semibold" title={r.errors.code}>{r.values.code || <span className="text-stone-300">—</span>}</td>
                              <td className="max-w-[220px] truncate px-3 py-2" title={`${r.values.title}${r.errors.title ? ` — ${r.errors.title}` : ""}`}>{r.values.title || <span className="text-stone-300">—</span>}</td>
                              <td className="px-3 py-2" title={r.errors.category}>
                                <span className={`inline-flex rounded px-1.5 py-0.5 font-semibold ${r.errors.category ? "bg-red-100 text-red-700" : "bg-stone-100 text-stone-600"}`}>
                                  {r.values.category}
                                </span>
                              </td>
                              <td className="max-w-[160px] truncate px-3 py-2" title={r.values.theme}>{r.values.theme || <span className="text-stone-300">—</span>}</td>
                              <td className="max-w-[160px] truncate px-3 py-2" title={r.values.organisation}>{r.values.organisation || <span className="text-stone-300">—</span>}</td>
                              <td className="px-3 py-2">
                                {r.status === "ok" ? (
                                  <span className="font-semibold text-green-700">Uploaded</span>
                                ) : hasError ? (
                                  <span className="font-semibold text-red-600" title={Object.values(r.errors).join("; ") + (r.message ? ` — ${r.message}` : "")}>
                                    {r.message ?? Object.values(r.errors)[0]}
                                  </span>
                                ) : (
                                  <span className="text-stone-500">Ready</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}

              {bulkMsg ? (
                <p className={`mt-3 break-words text-sm font-medium ${bulkMsg.includes("fail") ? "text-red-700" : "text-green-700"}`}>{bulkMsg}</p>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center justify-end gap-3 border-t border-neutral-100 bg-neutral-50/60 px-6 py-4 max-sm:px-4">
              <button
                type="button"
                onClick={() => setBulkOpen(false)}
                disabled={bulkBusy}
                className="rounded-xl px-4 py-2.5 text-sm font-semibold text-neutral-600 transition hover:bg-neutral-100 disabled:opacity-40"
              >
                {bulkMsg ? "Done" : "Cancel"}
              </button>
              <button
                type="button"
                onClick={() => void uploadBulk()}
                disabled={bulkBusy || validCount === 0}
                className="inline-flex items-center gap-2 rounded-xl bg-[#d95c26] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[#c04d1c] active:scale-[0.98] disabled:opacity-60"
              >
                {bulkBusy ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/60 border-t-white" />
                    Uploading…
                  </>
                ) : (
                  <>
                    <UploadCloudIcon className="h-4 w-4" />
                    Upload {validCount} valid row{validCount === 1 ? "" : "s"}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
