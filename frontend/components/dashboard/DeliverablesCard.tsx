"use client";

import { useEffect, useRef, useState } from "react";
import { API_BASE } from "../../lib/config";
import { getAccessToken } from "../../lib/auth-token";
import { readSession } from "../../lib/session";
import { apiDelete, apiPost, ApiError } from "../../lib/api";
import { invalidateApiCache } from "../../lib/api-cache";
import type { PortalDeliverable } from "../../lib/types";
import { downloadDataUrl } from "../../lib/download-data-url";
import { useTeam } from "./TeamProvider";
import { FileCheckIcon, GithubIcon, TrashIcon, UploadCloudIcon, XIcon } from "./icons";

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const MAX_TOTAL_BYTES = 10 * 1024 * 1024;

type Kind = "ppt" | "report";

const SLOTS: Record<Kind, { label: string; exts: string[]; hint: string }> = {
  ppt: { label: "Presentation", exts: [".ppt", ".pptx"], hint: "PPT or PPTX" },
  report: { label: "Report", exts: [".pdf", ".docx"], hint: "PDF or DOCX" },
};

const MIME_BY_EXT: Record<string, string> = {
  ".pdf": "application/pdf",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".ppt": "application/vnd.ms-powerpoint",
  ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
};

function getExt(name: string) {
  const i = name.lastIndexOf(".");
  return i >= 0 ? name.slice(i).toLowerCase() : "";
}

function getMime(file: File) {
  return MIME_BY_EXT[getExt(file.name)] || file.type || "application/octet-stream";
}

function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result ?? "");
      const base64 = result.includes(",") ? result.split(",")[1] : result;
      resolve(base64 || "");
    };
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.readAsDataURL(file);
  });
}

function uploadViaApi<T>(path: string, body: unknown, onProgress: (pct: number) => void): Promise<T> {
  return new Promise((resolve, reject) => {
    const session = readSession();
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${API_BASE}${path}`);
    xhr.timeout = 120000;
    xhr.setRequestHeader("content-type", "application/json");
    const bearer = getAccessToken() || session?.accessToken;
    if (bearer) xhr.setRequestHeader("authorization", `Bearer ${bearer}`);
    else if (session?.userId) xhr.setRequestHeader("x-dev-user-id", session.userId);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.min(90, Math.round((e.loaded / e.total) * 90)));
    };
    xhr.onload = () => {
      onProgress(100);
      let data: unknown = null;
      try {
        data = xhr.responseText ? JSON.parse(xhr.responseText) : null;
      } catch {
        data = xhr.responseText;
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(data as T);
        return;
      }
      const raw =
        typeof data === "object" && data && "message" in data
          ? (data as { message: unknown }).message
          : xhr.statusText || "Upload failed";
      const message = Array.isArray(raw) ? raw.join(", ") : String(raw);
      reject(new ApiError(xhr.status, message, data));
    };
    xhr.onerror = () => reject(new Error("Network error while uploading"));
    xhr.ontimeout = () => reject(new Error("Upload timed out — please try again"));
    xhr.send(JSON.stringify(body));
  });
}

export default function DeliverablesCard() {
  const { team, stages, isLead, refreshDeliverables, mergeUploadedDeliverable } = useTeam();
  const inputRefs = useRef<Record<Kind, HTMLInputElement | null>>({ ppt: null, report: null });
  const [githubUrl, setGithubUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [files, setFiles] = useState<Record<Kind, File | null>>({ ppt: null, report: null });
  const [fileSizes, setFileSizes] = useState<Record<Kind, number>>({ ppt: 0, report: 0 });
  const [uploadingKind, setUploadingKind] = useState<Kind | null>(null);
  const [progress, setProgress] = useState(0);
  const [dragOver, setDragOver] = useState<Kind | null>(null);
  const uploading = uploadingKind !== null;
  const stage = stages.find((s) => s.isActive) ?? stages[0];
  const deliverables = team?.deliverables ?? [];
  const deliverablesLoading = Boolean(team?.id) && team?.deliverables === undefined;

  useEffect(() => {
    if (!team?.id || team.deliverables !== undefined) return;
    void refreshDeliverables();
  }, [team?.id, team?.deliverables, refreshDeliverables]);

  const current = deliverables.find((d) => d.pptUrl || d.reportUrl) ?? deliverables[0];

  const pickFile = (kind: Kind, next?: File | null) => {
    if (!next) return;
    const slot = SLOTS[kind];
    if (!slot.exts.includes(getExt(next.name))) {
      setMessage(`${slot.label} must be ${slot.hint}.`);
      return;
    }
    if (next.size > MAX_FILE_BYTES) {
      setMessage(`${slot.label} exceeds the 5MB limit.`);
      return;
    }
    // Check combined total
    const otherKind: Kind = kind === "ppt" ? "report" : "ppt";
    const totalSize = next.size + fileSizes[otherKind];
    if (totalSize > MAX_TOTAL_BYTES) {
      setMessage(`Combined upload size would exceed 10MB limit (current: ${formatBytes(totalSize)}).`);
      return;
    }
    setMessage("");
    setFiles((f) => ({ ...f, [kind]: next }));
    setFileSizes((s) => ({ ...s, [kind]: next.size }));
  };

  const uploadFile = async (kind: Kind) => {
    const file = files[kind];
    if (!team) {
      setMessage("Create or join a team before uploading.");
      return;
    }
    if (!stage) {
      setMessage("No active stage yet. Ask an admin to create stages.");
      return;
    }
    if (!file) return;

    setUploadingKind(kind);
    setBusy(true);
    setProgress(0);
    setMessage("");
    try {
      setProgress(5);
      const dataBase64 = await fileToBase64(file);
      setProgress(15);
      const uploaded = await uploadViaApi<PortalDeliverable>(
        `/stages/${stage.id}/deliverables/upload`,
        {
          teamId: team.id,
          filename: file.name,
          contentType: getMime(file),
          dataBase64,
          kind,
        },
        setProgress,
      );
      invalidateApiCache(/\/deliverables/);
      mergeUploadedDeliverable(uploaded);
      setMessage(`${SLOTS[kind].label} uploaded successfully.`);
      setFiles((f) => ({ ...f, [kind]: null }));
      setFileSizes((s) => ({ ...s, [kind]: 0 }));
      await refreshDeliverables();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploadingKind(null);
      setBusy(false);
      setProgress(0);
    }
  };

  const saveGithub = async () => {
    if (!team || !stage || !githubUrl.trim()) return;
    setBusy(true);
    setMessage("");
    try {
      await apiPost(`/stages/${stage.id}/deliverables`, {
        teamId: team.id,
        githubUrl: githubUrl.trim(),
      });
      setGithubUrl("");
      setMessage("GitHub link saved.");
      await refreshDeliverables();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not save GitHub link");
    } finally {
      setBusy(false);
    }
  };

  const deleteDeliverable = async (id: string) => {
    if (!stage) return;
    setBusy(true);
    setMessage("");
    try {
      await apiDelete(`/stages/${stage.id}/deliverables/${id}`);
      setMessage("Deliverable deleted.");
      await refreshDeliverables();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not delete file");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-2xl border border-brand-softline bg-white p-5 shadow-[0_2px_8px_rgba(91,46,16,0.04)] sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-base font-bold text-brand-deep">
          <FileCheckIcon className="h-5 w-5 text-brand-primary" />
          Submission Required
        </h2>
        <span className="rounded-full border border-brand-warmBorder bg-brand-lightOrange px-3 py-1 text-xs font-bold text-brand-primary">
          {stage?.name ?? "No active stage"}
        </span>
      </div>
      {isLead ? (
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {(["ppt", "report"] as Kind[]).map((kind) => {
            const slot = SLOTS[kind];
            const file = files[kind];
            const uploaded = Boolean(kind === "ppt" ? current?.pptUrl : current?.reportUrl);
            const isUploading = uploadingKind === kind;
            return (
              <div key={kind}>
                <p className="mb-1.5 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-brand-muted">
                  {slot.label}
                  {uploaded ? (
                    <span className="rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-semibold normal-case tracking-normal text-green-700">
                      Uploaded
                    </span>
                  ) : null}
                </p>
                {file ? (
                  <div className="rounded-xl border border-brand-softline p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-brand-deep">{file.name}</p>
                        <p className="text-xs text-brand-muted">
                          {formatBytes(file.size)} · {getExt(file.name).replace(".", "").toUpperCase()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={uploading}
                          onClick={() => {
                            setFiles((f) => ({ ...f, [kind]: null }));
                            setFileSizes((s) => ({ ...s, [kind]: 0 }));
                          }}
                          className="rounded-lg p-1.5 text-red-600 hover:bg-red-50 disabled:opacity-50"
                          aria-label="Remove selected file"
                          title="Remove"
                        >
                          <XIcon className="h-5 w-5" />
                        </button>
                        <button
                          type="button"
                          disabled={uploading}
                          onClick={() => void uploadFile(kind)}
                          className="rounded-xl bg-[#C25E26] px-4 py-2 text-sm font-semibold text-white hover:bg-[#A04A1B] disabled:opacity-60"
                        >
                          {isUploading ? "Uploading…" : "Upload"}
                        </button>
                      </div>
                    </div>
                    {isUploading ? (
                      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-brand-softline">
                        <div className="h-full bg-[#C25E26] transition-all" style={{ width: `${progress}%` }} />
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => inputRefs.current[kind]?.click()}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") inputRefs.current[kind]?.click();
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragOver(kind);
                    }}
                    onDragLeave={() => setDragOver(null)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDragOver(null);
                      pickFile(kind, e.dataTransfer.files?.[0]);
                    }}
                    className={`cursor-pointer rounded-xl border-2 border-dashed px-5 py-4 text-center transition-all ${
                      dragOver === kind
                        ? "border-brand-primary/60 bg-brand-primary/[0.05]"
                        : "border-brand-primary/30 bg-brand-primary/[0.02] hover:border-brand-primary/60"
                    }`}
                  >
                    <UploadCloudIcon className="mx-auto h-8 w-8 text-brand-primary/70" />
                    <p className="mt-2 text-sm font-medium text-brand-deep">
                      {uploaded ? `Replace ${slot.label.toLowerCase()}` : `Upload ${slot.hint}`}
                    </p>
                    <p className="mt-1 text-xs text-brand-muted">Max 5MB</p>
                    <input
                      ref={(el) => {
                        inputRefs.current[kind] = el;
                      }}
                      type="file"
                      accept={slot.exts.join(",")}
                      className="hidden"
                      onChange={(e) => {
                        pickFile(kind, e.target.files?.[0]);
                        e.target.value = "";
                      }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <p className="mt-4 text-xs text-brand-muted">Only the team lead can upload deliverables.</p>
      )}

      {deliverables.length > 0 ? (
        <div className="mt-4 space-y-3">
          <p className="text-xs font-bold uppercase tracking-wider text-brand-muted">Uploaded files</p>
          {current && (current.pptUrl || current.reportUrl) ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {(
                [
                  ["ppt", current.pptUrl, current.pptFileName],
                  ["report", current.reportUrl, current.reportFileName],
                ] as const
              ).map(([kind, url, name]) => {
                const label = SLOTS[kind].label;
                const fileName = name || label;
                return (
                  <div key={kind} className="rounded-xl border border-brand-softline p-3 text-xs">
                    <p className="font-bold uppercase tracking-wider text-brand-muted">{label}</p>
                    {url ? (
                      <>
                        <p className="mt-1.5 break-all text-sm font-semibold text-brand-deep" title={fileName}>
                          {fileName}
                        </p>
                        <p className="mt-0.5 text-brand-muted">
                          v{current.version} · {new Date(current.submittedAt).toLocaleString()}
                        </p>
                        {url.startsWith("data:") ? (
                          <button
                            type="button"
                            onClick={() => downloadDataUrl(url, fileName)}
                            className="mt-2 font-semibold text-brand-primary hover:underline"
                          >
                            Download
                          </button>
                        ) : (
                          <a
                            href={url}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-2 inline-block font-semibold text-brand-primary hover:underline"
                          >
                            Open file
                          </a>
                        )}
                      </>
                    ) : (
                      <p className="mt-1.5 text-brand-muted">Not uploaded yet</p>
                    )}
                  </div>
                );
              })}
            </div>
          ) : null}
          {deliverables
            .filter((d) => d.githubUrl || d.id === current?.id)
            .map((d) => (
              <div
                key={d.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-brand-softline p-3 text-xs"
              >
                <div className="min-w-0">
                  {d.githubUrl ? (
                    <a
                      href={d.githubUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="break-all font-semibold text-brand-primary hover:underline"
                    >
                      GitHub: {d.githubUrl}
                    </a>
                  ) : (
                    <span className="text-brand-muted">Submission v{d.version}</span>
                  )}
                </div>
                {isLead && !d.locked ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void deleteDeliverable(d.id)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50"
                  >
                    <TrashIcon className="h-3.5 w-3.5" />
                    {d.githubUrl && !(d.pptUrl || d.reportUrl) ? "Delete" : "Delete submission"}
                  </button>
                ) : null}
              </div>
            ))}
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <div className="relative flex min-w-[220px] flex-1 items-center">
          <GithubIcon className="absolute left-3 h-4 w-4 text-brand-muted" />
          <input
            value={githubUrl}
            onChange={(e) => setGithubUrl(e.target.value)}
            placeholder="https://github.com/org/repo"
            className="w-full rounded-xl border border-brand-sand py-2.5 pl-9 pr-3 text-sm"
            disabled={!isLead || busy}
          />
        </div>
        <button
          type="button"
          disabled={!isLead || busy || !githubUrl.trim()}
          onClick={() => void saveGithub()}
          className="rounded-xl bg-brand-primary px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
        >
          Save Repo
        </button>
      </div>
      {message ? <p className="mt-2 text-xs font-medium text-brand-deep">{message}</p> : null}
    </section>
  );
}
