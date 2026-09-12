"use client";

import { useRef, useState } from "react";
import { apiDelete, apiPost } from "../../lib/api";
import { useTeam } from "./TeamProvider";
import { FileCheckIcon, GithubIcon, UploadCloudIcon, XIcon } from "./icons";

const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

const MIME_BY_EXT: Record<string, string> = {
  ".pdf": "application/pdf",
  ".ppt": "application/vnd.ms-powerpoint",
  ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ".doc": "application/msword",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".mp4": "video/mp4",
};

type UploadKind = "ppt" | "report" | "video";

function fileExt(name: string) {
  const i = name.lastIndexOf(".");
  return i >= 0 ? name.slice(i).toLowerCase() : "";
}

function mimeForFile(file: File): string {
  return MIME_BY_EXT[fileExt(file.name)] || (file.type && file.type !== "application/octet-stream" ? file.type : "application/pdf");
}

function validateFile(file: File): string | null {
  if (file.size > MAX_UPLOAD_BYTES) return "File exceeds the 50MB limit.";
  if (!MIME_BY_EXT[fileExt(file.name)]) return "Only PPTX, PDF, DOCX, or MP4 files are supported.";
  return null;
}

function detectKind(file: File): UploadKind {
  const ext = fileExt(file.name);
  if (ext === ".ppt" || ext === ".pptx") return "ppt";
  if (ext === ".mp4") return "video";
  return "report";
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DeliverablesCard() {
  const { team, stages, isLead, reload } = useTeam();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [githubUrl, setGithubUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const stage = stages.find((s) => s.isActive) ?? stages[0];
  const deliverables = team?.deliverables ?? [];

  const submitGithub = async () => {
    if (!team || !stage || !githubUrl.trim()) return;
    setBusy(true);
    setMessage("");
    try {
      await apiPost(`/stages/${stage.id}/deliverables`, { teamId: team.id, githubUrl: githubUrl.trim() });
      setGithubUrl("");
      setMessage("GitHub link saved.");
      void reload();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not save GitHub link");
    } finally {
      setBusy(false);
    }
  };

  const putWithProgress = (url: string, fileToPut: File, contentType: string): Promise<void> =>
    new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("PUT", url);
      xhr.setRequestHeader("Content-Type", contentType);
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) setUploadProgress(Math.round((e.loaded / e.total) * 100));
      };
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) resolve();
        else reject(new Error(`Storage upload failed (${xhr.status}). Check S3 CORS settings.`));
      };
      xhr.onerror = () => reject(new Error("Storage upload failed. Check network/S3 CORS."));
      xhr.send(fileToPut);
    });

  const uploadFile = async () => {
    if (!team) {
      setMessage("Create or join a team before uploading.");
      return;
    }
    if (!stage) {
      setMessage("No active stage is configured yet. Ask an admin to create stages.");
      return;
    }
    if (!file) return;
    const invalid = validateFile(file);
    if (invalid) {
      setMessage(invalid);
      return;
    }

    const kind = detectKind(file);
    const contentType = mimeForFile(file);
    setIsUploading(true);
    setBusy(true);
    setUploadProgress(0);
    setMessage("");

    try {
      const presign = await apiPost<{ url: string; key: string; publicUrl?: string }>(
        `/stages/${stage.id}/deliverables/presign`,
        {
          teamId: team.id,
          filename: file.name,
          contentType,
          contentLength: file.size,
          kind,
        },
      );
      await putWithProgress(presign.url, file, contentType);
      const storedUrl = presign.publicUrl || presign.url.split("?")[0];
      await apiPost(`/stages/${stage.id}/deliverables`, {
        teamId: team.id,
        ...(kind === "ppt"
          ? { pptUrl: storedUrl }
          : kind === "report"
            ? { reportUrl: storedUrl }
            : { videoUrl: storedUrl }),
      });
      setMessage(`${kind === "ppt" ? "PPT" : kind === "video" ? "Video" : "Report"} uploaded successfully.`);
      setFile(null);
      void reload();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setIsUploading(false);
      setBusy(false);
      setUploadProgress(0);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const dropped = e.dataTransfer.files?.[0];
    if (!dropped) return;
    const invalid = validateFile(dropped);
    if (invalid) {
      setMessage(invalid);
      return;
    }
    setMessage("");
    setFile(dropped);
  };

  const removeDeliverable = async (deliverableId: string) => {
    if (!stage) return;
    setBusy(true);
    try {
      await apiDelete(`/stages/${stage.id}/deliverables/${deliverableId}`);
      setMessage("Deliverable removed.");
      void reload();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not delete");
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
        Upload your presentation (PPT/PPTX), reports, and supplementary deliverables for the current stage.
      </p>

      {isLead ? (
        <div className="mt-5">
          {file ? (
            <div className="rounded-xl border border-brand-softline bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="rounded-lg bg-brand-lightOrange p-2 text-brand-primary">
                    <FileCheckIcon className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-brand-deep">{file.name}</p>
                    <p className="text-xs text-brand-muted">
                      {formatBytes(file.size)} · {detectKind(file).toUpperCase()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setFile(null)}
                    disabled={isUploading}
                    className="rounded-lg p-1.5 text-red-600 transition-colors hover:bg-red-50"
                    title="Remove file"
                    aria-label="Remove file"
                  >
                    <XIcon className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => void uploadFile()}
                    disabled={isUploading}
                    className="rounded-xl bg-[#C25E26] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#A04A1B] disabled:opacity-60"
                  >
                    {isUploading ? "Uploading…" : "Upload File"}
                  </button>
                </div>
              </div>
              {isUploading ? (
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-brand-softline">
                  <div className="h-full bg-[#C25E26] transition-all" style={{ width: `${uploadProgress}%` }} />
                </div>
              ) : null}
            </div>
          ) : (
            <div
              onClick={() => {
                setMessage("");
                fileInputRef.current?.click();
              }}
              onDragOver={(e) => {
                e.preventDefault();
                setDragActive(true);
              }}
              onDragLeave={() => setDragActive(false)}
              onDrop={onDrop}
              className={`cursor-pointer rounded-xl border-2 border-dashed p-5 text-center transition-all ${
                dragActive
                  ? "border-brand-primary/60 bg-brand-primary/[0.05]"
                  : "border-brand-primary/30 bg-brand-primary/[0.02] hover:border-brand-primary/60 hover:bg-brand-primary/[0.05]"
              }`}
            >
              <UploadCloudIcon className="mx-auto h-8 w-8 text-brand-primary/70" />
              <p className="mt-2 text-sm font-medium text-brand-deep">
                Click to browse or drag and drop files from your computer
              </p>
              <p className="mt-1 text-xs text-brand-muted">Supports PPTX, PDF, DOCX, or MP4 (up to 50MB)</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.ppt,.pptx,.doc,.docx,.mp4,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation"
                className="hidden"
                onChange={(e) => {
                  const selected = e.target.files?.[0];
                  if (selected) {
                    const invalid = validateFile(selected);
                    if (invalid) setMessage(invalid);
                    else {
                      setMessage("");
                      setFile(selected);
                    }
                  }
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
          <p className="text-xs font-bold uppercase tracking-wider text-brand-muted">Submitted versions</p>
          {deliverables.map((d) => (
            <div
              key={d.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-brand-softline p-3 text-xs"
            >
              <div className="space-y-1">
                <p className="font-semibold text-brand-deep">
                  v{d.version} · {new Date(d.submittedAt).toLocaleString()}
                </p>
                {d.githubUrl ? (
                  <a href={d.githubUrl} className="text-brand-primary" target="_blank" rel="noreferrer">
                    GitHub
                  </a>
                ) : null}
                {d.pptUrl ? <p className="text-brand-muted">PPT uploaded</p> : null}
                {d.reportUrl ? <p className="text-brand-muted">Report uploaded</p> : null}
                {d.videoUrl ? <p className="text-brand-muted">Video uploaded</p> : null}
              </div>
              {isLead && !d.locked ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void removeDeliverable(d.id)}
                  className="rounded-lg border border-red-200 px-3 py-1.5 font-semibold text-red-700 hover:bg-red-50"
                >
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
          onClick={() => void submitGithub()}
          className="rounded-xl bg-brand-primary px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
        >
          Save GitHub
        </button>
      </div>
      {message ? <p className="mt-2 text-xs font-medium text-brand-deep">{message}</p> : null}
    </section>
  );
}
