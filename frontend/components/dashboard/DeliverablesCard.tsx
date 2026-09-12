"use client";

import { useRef, useState } from "react";
import { API_BASE } from "../../lib/config";
import { getAccessToken } from "../../lib/auth-token";
import { readSession } from "../../lib/session";
import { apiDelete, apiPost, ApiError } from "../../lib/api";
import { useTeam } from "./TeamProvider";
import { FileCheckIcon, GithubIcon, TrashIcon, UploadCloudIcon, XIcon } from "./icons";

const MAX_BYTES = 20 * 1024 * 1024;
const ALLOWED_EXT = new Set([".pdf", ".ppt", ".pptx"]);

const MIME_BY_EXT: Record<string, string> = {
  ".pdf": "application/pdf",
  ".ppt": "application/vnd.ms-powerpoint",
  ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
};

function getExt(name: string) {
  const i = name.lastIndexOf(".");
  return i >= 0 ? name.slice(i).toLowerCase() : "";
}

function getMime(file: File) {
  return MIME_BY_EXT[getExt(file.name)] || file.type || "application/pdf";
}

function validatePresentation(file: File): string | null {
  if (file.size > MAX_BYTES) return "File exceeds the 20MB limit.";
  if (!ALLOWED_EXT.has(getExt(file.name))) return "Only PDF or PPTX files are supported.";
  return null;
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
    const bearer = getAccessToken() || session?.accessToken || session?.clerkToken;
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
    xhr.ontimeout = () => reject(new Error("Upload timed out — try a smaller PDF/PPTX"));
    xhr.send(JSON.stringify(body));
  });
}

export default function DeliverablesCard() {
  const { team, stages, isLead, reload } = useTeam();
  const inputRef = useRef<HTMLInputElement>(null);
  const [githubUrl, setGithubUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const stage = stages.find((s) => s.isActive) ?? stages[0];
  const deliverables = team?.deliverables ?? [];

  const pickFile = (next?: File | null) => {
    if (!next) return;
    const invalid = validatePresentation(next);
    if (invalid) {
      setMessage(invalid);
      setFile(null);
      return;
    }
    setMessage("");
    setFile(next);
  };

  const uploadFile = async () => {
    if (!team) {
      setMessage("Create or join a team before uploading.");
      return;
    }
    if (!stage) {
      setMessage("No active stage yet. Ask an admin to create stages.");
      return;
    }
    if (!file) return;
    const invalid = validatePresentation(file);
    if (invalid) {
      setMessage(invalid);
      return;
    }

    setUploading(true);
    setBusy(true);
    setProgress(0);
    setMessage("");
    try {
      setProgress(5);
      const dataBase64 = await fileToBase64(file);
      setProgress(15);
      await uploadViaApi(
        `/stages/${stage.id}/deliverables/upload`,
        {
          teamId: team.id,
          filename: file.name,
          contentType: getMime(file),
          dataBase64,
        },
        setProgress,
      );
      setMessage("File uploaded successfully.");
      setFile(null);
      await reload();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
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
      await reload();
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
      await reload();
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
          Active Deliverable Submission
        </h2>
        <span className="rounded-full border border-brand-warmBorder bg-brand-lightOrange px-3 py-1 text-xs font-bold text-brand-primary">
          {stage?.name ?? "No active stage"}
        </span>
      </div>
      <p className="mt-1.5 text-sm text-brand-muted">
        Upload your presentation as <span className="font-semibold text-brand-deep">PDF or PPTX</span> (max 20MB).
      </p>

      {isLead ? (
        <div className="mt-5">
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
                    onClick={() => setFile(null)}
                    className="rounded-lg p-1.5 text-red-600 hover:bg-red-50 disabled:opacity-50"
                    aria-label="Remove selected file"
                    title="Remove"
                  >
                    <XIcon className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    disabled={uploading}
                    onClick={() => void uploadFile()}
                    className="rounded-xl bg-[#C25E26] px-4 py-2 text-sm font-semibold text-white hover:bg-[#A04A1B] disabled:opacity-60"
                  >
                    {uploading ? "Uploading…" : "Upload File"}
                  </button>
                </div>
              </div>
              {uploading ? (
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-brand-softline">
                  <div className="h-full bg-[#C25E26] transition-all" style={{ width: `${progress}%` }} />
                </div>
              ) : null}
            </div>
          ) : (
            <div
              role="button"
              tabIndex={0}
              onClick={() => inputRef.current?.click()}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
              }}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                pickFile(e.dataTransfer.files?.[0]);
              }}
              className={`cursor-pointer rounded-xl border-2 border-dashed p-5 text-center transition-all ${
                dragOver
                  ? "border-brand-primary/60 bg-brand-primary/[0.05]"
                  : "border-brand-primary/30 bg-brand-primary/[0.02] hover:border-brand-primary/60"
              }`}
            >
              <UploadCloudIcon className="mx-auto h-8 w-8 text-brand-primary/70" />
              <p className="mt-2 text-sm font-medium text-brand-deep">Click or drag PDF / PPTX here</p>
              <p className="mt-1 text-xs text-brand-muted">PDF or PPTX only · up to 20MB</p>
              <input
                ref={inputRef}
                type="file"
                accept=".pdf,.ppt,.pptx,application/pdf,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation"
                className="hidden"
                onChange={(e) => {
                  pickFile(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
            </div>
          )}
        </div>
      ) : (
        <p className="mt-4 text-xs text-brand-muted">Only the team lead can upload deliverables.</p>
      )}

      {deliverables.length > 0 ? (
        <div className="mt-4 space-y-2">
          <p className="text-xs font-bold uppercase tracking-wider text-brand-muted">Uploaded files</p>
          {deliverables.map((d) => (
            <div
              key={d.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-brand-softline p-3 text-xs"
            >
              <div className="min-w-0 space-y-1">
                <p className="font-semibold text-brand-deep">
                  v{d.version} · {new Date(d.submittedAt).toLocaleString()}
                </p>
                {d.pptUrl ? (
                  d.pptUrl.startsWith("data:") ? (
                    <p className="text-brand-muted">Presentation file uploaded</p>
                  ) : (
                    <a
                      href={d.pptUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="font-semibold text-brand-primary hover:underline"
                    >
                      Open uploaded file
                    </a>
                  )
                ) : null}
                {d.reportUrl ? <p className="text-brand-muted">Report uploaded</p> : null}
                {d.githubUrl ? (
                  <a href={d.githubUrl} target="_blank" rel="noreferrer" className="text-brand-primary hover:underline">
                    GitHub repo
                  </a>
                ) : null}
              </div>
              {isLead && !d.locked ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void deleteDeliverable(d.id)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50"
                >
                  <TrashIcon className="h-3.5 w-3.5" />
                  Delete
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
          Save GitHub
        </button>
      </div>
      {message ? <p className="mt-2 text-xs font-medium text-brand-deep">{message}</p> : null}
    </section>
  );
}
