"use client";

import { useEffect, useState } from "react";
import { apiPost } from "../../lib/api";
import type { PortalComment } from "../../lib/types";
import { useAuth } from "../auth/AuthProvider";
import { useTeam } from "./TeamProvider";
import { MessageIcon } from "./icons";

function normalizeComment(
  raw: Partial<PortalComment> & { id?: string; message?: string },
  fallback: { message: string; author: PortalComment["author"] },
): PortalComment {
  return {
    id: raw.id ?? `local-${Date.now()}`,
    message: raw.message ?? fallback.message,
    createdAt:
      typeof raw.createdAt === "string"
        ? raw.createdAt
        : raw.createdAt
          ? new Date(raw.createdAt as unknown as string).toISOString()
          : new Date().toISOString(),
    author: raw.author ?? fallback.author,
  };
}

export default function TeamCommentsCard() {
  const { team } = useTeam();
  const { session } = useAuth();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [comments, setComments] = useState<PortalComment[]>(team?.comments ?? []);

  // Sync from team, but never drop comments we already showed locally
  // (reload/cache updates used to wipe the optimistic post when busy flipped false).
  useEffect(() => {
    const server = team?.comments ?? [];
    setComments((prev) => {
      if (prev.length === 0) return server;
      const byId = new Map<string, PortalComment>();
      for (const c of server) byId.set(c.id, c);
      for (const c of prev) {
        if (!byId.has(c.id)) byId.set(c.id, c);
      }
      return Array.from(byId.values());
    });
  }, [team?.id, team?.comments]);

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
          const author = {
            id: session?.userId ?? "",
            fullName: session?.fullName ?? "You",
            email: session?.email ?? "",
          };
          const optimisticId = `optimistic-${Date.now()}`;
          setBusy(true);
          setError("");
          setMessage("");
          setComments((prev) => [
            ...prev,
            { id: optimisticId, message: text, createdAt: new Date().toISOString(), author },
          ]);
          try {
            const created = await apiPost<PortalComment>(`/teams/${team.id}/comments`, { message: text });
            const normalized = normalizeComment(created, { message: text, author });
            setComments((prev) =>
              prev.map((c) => (c.id === optimisticId ? normalized : c)).filter((c, i, arr) => {
                // Deduplicate if server id already present somehow
                return arr.findIndex((x) => x.id === c.id) === i;
              }),
            );
          } catch (err) {
            setComments((prev) => prev.filter((c) => c.id !== optimisticId));
            setMessage(text);
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
          disabled={busy}
          className="flex-1 rounded-xl border border-brand-sand px-3 py-2 text-sm disabled:opacity-60"
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
