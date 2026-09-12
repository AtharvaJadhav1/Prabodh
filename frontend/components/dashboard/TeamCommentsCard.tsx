"use client";

import { useEffect, useState } from "react";
import { apiPost } from "../../lib/api";
import type { PortalComment } from "../../lib/types";
import { useAuth } from "../auth/AuthProvider";
import { useTeam } from "./TeamProvider";
import { MessageIcon } from "./icons";

export default function TeamCommentsCard() {
  const { team } = useTeam();
  const { session } = useAuth();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [comments, setComments] = useState<PortalComment[]>(team?.comments ?? []);

  useEffect(() => {
    if (!busy) setComments(team?.comments ?? []);
  }, [team?.id, team?.comments, busy]);

  return (
    <section className="rounded-2xl border border-brand-softline bg-white p-5 sm:p-6">
      <h2 className="flex items-center gap-2 text-base font-bold text-brand-deep">
        <MessageIcon className="h-5 w-5 text-brand-primary" />
        Team comments
      </h2>
      <ul className="mt-3 max-h-56 space-y-2 overflow-y-auto">
        {comments.length === 0 ? <li className="text-xs text-brand-muted">No comments yet.</li> : null}
        {comments.map((c) => (
          <li key={c.id} className="rounded-xl bg-brand-cream px-3 py-2">
            <p className="text-[11px] font-bold text-brand-deep">{c.author?.fullName ?? "Member"}</p>
            <p className="text-sm text-brand-charcoal">{c.message}</p>
          </li>
        ))}
      </ul>
      <form
        className="mt-3 flex gap-2"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!team || !message.trim() || busy) return;
          const text = message.trim();
          setBusy(true);
          setError("");
          try {
            // Local-only update. Do NOT call team.reload() — it sets loading=true and
            // blanks the whole dashboard for several seconds.
            const created = await apiPost<PortalComment>(`/teams/${team.id}/comments`, { message: text });
            setComments((prev) => [
              ...prev,
              {
                id: created.id,
                message: created.message ?? text,
                createdAt: created.createdAt ?? new Date().toISOString(),
                author: created.author ?? {
                  id: session?.userId ?? "",
                  fullName: session?.fullName ?? "You",
                  email: session?.email ?? "",
                },
              },
            ]);
            setMessage("");
          } catch (err) {
            setError(err instanceof Error ? err.message : "Could not post comment");
          } finally {
            setBusy(false);
          }
        }}
      >
        <input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Write a comment"
          className="flex-1 rounded-xl border border-brand-sand px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={busy}
          className="rounded-xl bg-brand-primary px-3 py-2 text-xs font-bold text-white disabled:opacity-60"
        >
          {busy ? "…" : "Post"}
        </button>
      </form>
      {error ? <p className="mt-2 text-xs font-semibold text-red-700">{error}</p> : null}
    </section>
  );
}
