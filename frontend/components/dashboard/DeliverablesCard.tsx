"use client";

import { useState } from "react";
import { apiDelete, apiPost } from "../../lib/api";
import { useTeam } from "./TeamProvider";
import { FileCheckIcon, FileTextIcon, GithubIcon, LockIcon } from "./icons";

export default function DeliverablesCard() {
  const { team, stages, isLead, reload } = useTeam();
  const [githubUrl, setGithubUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const stage = stages.find((s) => s.isActive) ?? stages[0];
  const deliverables = team?.deliverables ?? [];

  const submitGithub = async () => {
    if (!team || !stage || !githubUrl) return;
    setBusy(true);
    setMessage("");
    try {
      await apiPost(`/stages/${stage.id}/deliverables`, { teamId: team.id, githubUrl });
      setGithubUrl("");
      setMessage("Deliverable saved.");
      void reload();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  };

  const uploadFile = async (kind: "ppt" | "report" | "video", file: File) => {
    if (!team || !stage) return;
    setBusy(true);
    setMessage("");
    try {
      const presign = await apiPost<{ url: string; key: string }>(`/stages/${stage.id}/deliverables/presign`, {
        teamId: team.id,
        filename: file.name,
        contentType: file.type || "application/pdf",
        contentLength: file.size,
        kind,
      });
      const put = await fetch(presign.url, { method: "PUT", body: file, headers: { "content-type": file.type || "application/pdf" } });
      if (!put.ok) throw new Error("Storage upload failed");
      const storedUrl = presign.url.split("?")[0];
      await apiPost(`/stages/${stage.id}/deliverables`, {
        teamId: team.id,
        ...(kind === "ppt" ? { pptUrl: storedUrl } : {}),
        ...(kind === "report" ? { reportUrl: storedUrl } : {}),
        ...(kind === "video" ? { videoUrl: storedUrl } : {}),
      });
      setMessage("File submitted.");
      void reload();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Upload failed — check S3 configuration");
    } finally {
      setBusy(false);
    }
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
        Submit GitHub and files against the current stage. Uploads require configured object storage.
      </p>

      <ul className="mt-5 space-y-3 text-sm">
        <li className="flex items-center justify-between rounded-xl border border-brand-softline p-3">
          <span className="flex items-center gap-2 font-semibold text-brand-deep">
            <FileTextIcon className="h-4 w-4" /> Upload PPT / Report / Video
          </span>
          {isLead ? (
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <input type="file" accept=".ppt,.pptx,.pdf" disabled={busy} onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void uploadFile("ppt", file);
              }} />
              <input type="file" accept=".pdf,.doc,.docx" disabled={busy} onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void uploadFile("report", file);
              }} />
            </div>
          ) : null}
        </li>
      </ul>

      {deliverables.length > 0 ? (
        <div className="mt-4 space-y-2">
          <p className="text-xs font-bold uppercase tracking-wider text-brand-muted">Submitted versions</p>
          {deliverables.map((d) => (
            <div key={d.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-brand-softline p-3 text-xs">
              <div className="space-y-1">
                <p className="font-semibold text-brand-deep">v{d.version} · {new Date(d.submittedAt).toLocaleString()}</p>
                {d.githubUrl ? <a href={d.githubUrl} className="text-brand-primary" target="_blank" rel="noreferrer">GitHub</a> : null}
                {d.pptUrl ? <p className="text-brand-muted">PPT uploaded</p> : null}
                {d.reportUrl ? <p className="text-brand-muted">Report uploaded</p> : null}
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
          disabled={!isLead || busy || !githubUrl}
          onClick={() => void submitGithub()}
          className="rounded-xl bg-brand-primary px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
        >
          Save GitHub
        </button>
      </div>
      {message ? <p className="mt-2 text-xs font-medium text-brand-deep">{message}</p> : null}

      <div className="mt-5 rounded-xl border border-brand-warmBorder bg-brand-lightOrange p-4 text-xs text-brand-deep">
        <LockIcon className="mr-1 inline h-4 w-4" />
        Stage lock: {stage ? new Date(stage.deadline).toLocaleString() : "—"}. Submissions after the deadline return HTTP 423.
      </div>
    </section>
  );
}
