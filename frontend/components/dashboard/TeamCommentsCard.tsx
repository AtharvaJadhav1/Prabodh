"use client";

import { useEffect, useRef, useState } from "react";
import { apiDelete, apiPost } from "../../lib/api";
import type { PortalComment } from "../../lib/types";
import { useAuth } from "../auth/AuthProvider";
import { useTeam } from "./TeamProvider";
import { MessageIcon, TrashIcon } from "./icons";

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
  const { team, isLead, removeCommentLocally, addCommentLocally, refreshComments } = useTeam();
  const { session } = useAuth();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState("");
  const [comments, setComments] = useState<PortalComment[]>(team?.comments ?? []);
  const removedIds = useRef(new Set<string>());

  useEffect(() => {
    if (team?.id && team.comments === undefined) {
      void refreshComments();
    }
  }, [team?.id, team?.comments, refreshComments]);

  useEffect(() => {
    const server = (team?.comments ?? []).filter((c) => !removedIds.current.has(c.id));
    setComments((prev) => {
      const byId = new Map<string, PortalComment>();
      for (const c of server) byId.set(c.id, c);
      for (const c of prev) {
        if (removedIds.current.has(c.id)) continue;
        if (!byId.has(c.id)) byId.set(c.id, c);
      }
      return Array.from(byId.values()).filter((c) => !removedIds.current.has(c.id));
    });
  }, [team?.id, team?.comments]);

  const canDelete = (c: PortalComment) => {
    if (!session?.userId) return false;
    if (isLead) return true;
    return c.author?.id === session.userId;
  };

  const deleteComment = (c: PortalComment) => {
    if (!team || deletingIds.has(c.id)) return;
    setError("");
    removedIds.current.add(c.id);
    setComments((prev) => prev.filter((x) => x.id !== c.id));
    removeCommentLocally?.(c.id);
    // Allow deleting other comments immediately — don't block the whole list.
    setDeletingIds((prev) => new Set(prev).add(c.id));

    if (c.id.startsWith("optimistic-") || c.id.startsWith("local-")) {
      setDeletingIds((prev) => {
        const next = new Set(prev);
        next.delete(c.id);
        return next;
      });
      return;
    }

    void apiDelete(`/teams/${team.id}/comments/${c.id}`)
      .catch((err) => {
        removedIds.current.delete(c.id);
        setComments((prev) => [...prev, c]);
        addCommentLocally?.(c);
        setError(err instanceof Error ? err.message : "Could not delete comment");
      })
      .finally(() => {
        setDeletingIds((prev) => {
          const next = new Set(prev);
          next.delete(c.id);
          return next;
        });
      });
  };

  return (
    <section className="rounded-2xl border border-brand-softline bg-white p-5 sm:p-6">
      <h2 className="flex items-center gap-2 text-base font-bold text-brand-deep">
        <MessageIcon className="h-5 w-5 text-brand-primary" />
        Team comments
      </h2>
      <ul className="mt-3 max-h-56 space-y-2 overflow-y-auto">
        {comments.length === 0 ? <li className="text-xs text-brand-muted">No comments yet.</li> : null}
        {comments.map((c) => (
          <li key={c.id} className="group rounded-xl bg-brand-cream px-3 py-2">
            <div className="flex items-start justify-between gap-2">
              <p className="text-[11px] font-bold text-brand-deep">{c.author?.fullName ?? "Member"}</p>
              {canDelete(c) ? (
                <button
                  type="button"
                  disabled={deletingIds.has(c.id)}
                  aria-label="Delete comment"
                  title="Delete comment"
                  onClick={() => deleteComment(c)}
                  className="shrink-0 rounded p-1 text-brand-muted opacity-70 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-40 sm:opacity-0 sm:group-hover:opacity-100"
                >
                  <TrashIcon className="h-3.5 w-3.5" />
                </button>
              ) : null}
            </div>
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
          const optimistic = {
            id: optimisticId,
            message: text,
            createdAt: new Date().toISOString(),
            author,
          };
          setComments((prev) => [...prev, optimistic]);
          try {
            const created = await apiPost<PortalComment>(`/teams/${team.id}/comments`, { message: text });
            const normalized = normalizeComment(created, { message: text, author });
            setComments((prev) =>
              prev
                .map((c) => (c.id === optimisticId ? normalized : c))
                .filter((c, i, arr) => arr.findIndex((x) => x.id === c.id) === i),
            );
            addCommentLocally?.(normalized);
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
