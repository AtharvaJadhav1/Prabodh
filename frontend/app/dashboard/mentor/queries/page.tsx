"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import MentorShell from "../../../../components/mentor/MentorShell";
import EmptyState from "../../../../components/mentor/EmptyState";
import { useMentorTeams } from "../../../../components/mentor/MentorTeamsProvider";
import { useAuth } from "../../../../components/auth/AuthProvider";
import { api, apiDelete, apiPost } from "../../../../lib/api";
import type { PortalComment } from "../../../../lib/types";
import CommentBubble, { isMentorMessage } from "../../../../components/dashboard/CommentBubble";
import {
  InboxIcon,
  LockIcon,
  MessageIcon,
  SendIcon,
  TrashIcon,
  UsersIcon,
} from "../../../../components/dashboard/icons";

type FlatComment = PortalComment & { isReply?: boolean };

function flattenComments(comments: PortalComment[]): FlatComment[] {
  const out: FlatComment[] = [];
  for (const c of comments) {
    out.push({ ...c, isReply: false });
    for (const r of c.replies ?? []) out.push({ ...r, isReply: true });
  }
  return out;
}

export default function MentorQueriesPage() {
  const { teams, loading, error: loadError } = useMentorTeams();
  const { session } = useAuth();
  const [activeTeamId, setActiveTeamId] = useState<string | null>(null);
  const [comments, setComments] = useState<PortalComment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const assignedTeams = useMemo(() => teams.filter((t) => !t.pendingInvite), [teams]);
  const activeRow = useMemo(
    () => assignedTeams.find((t) => t.team.id === activeTeamId) ?? null,
    [assignedTeams, activeTeamId],
  );

  useEffect(() => {
    if (!activeTeamId && assignedTeams.length > 0) {
      setActiveTeamId(assignedTeams[0].team.id);
    }
  }, [assignedTeams, activeTeamId]);

  useEffect(() => {
    if (!activeTeamId) {
      setComments([]);
      return;
    }
    let cancelled = false;
    setLoadingComments(true);
    setError(null);
    api<PortalComment[]>(`/teams/${activeTeamId}/comments`)
      .then((rows) => {
        if (!cancelled) setComments(rows ?? []);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load query thread");
      })
      .finally(() => {
        if (!cancelled) setLoadingComments(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeTeamId]);

  const flatComments = useMemo(() => flattenComments(comments), [comments]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [flatComments.length]);

  const handleSend = async () => {
    const text = message.trim();
    if (!activeTeamId || !text || busy) return;
    const author: PortalComment["author"] = {
      id: session?.userId ?? "",
      fullName: session?.fullName ?? "You",
      email: session?.email ?? "",
      platformRole: session?.platformRole ?? "institute_mentor",
    };
    const optimisticId = `optimistic-${Date.now()}`;
    const optimistic: PortalComment = {
      id: optimisticId,
      message: text,
      createdAt: new Date().toISOString(),
      author,
    };
    setBusy(true);
    setError(null);
    setMessage("");
    setComments((prev) => [...prev, optimistic]);
    try {
      const created = await apiPost<PortalComment>(`/teams/${activeTeamId}/comments`, { message: text });
      setComments((prev) => prev.map((c) => (c.id === optimisticId ? { ...created, replies: c.replies } : c)));
    } catch (err) {
      setComments((prev) => prev.filter((c) => c.id !== optimisticId));
      setMessage(text);
      setError(err instanceof Error ? err.message : "Could not send reply");
    } finally {
      setBusy(false);
    }
  };

  const removeCommentId = (commentId: string) => {
    setComments((prev) =>
      prev.flatMap<PortalComment>((c) => {
        if (c.id === commentId) return [];
        if ((c.replies ?? []).some((r) => r.id === commentId)) {
          return [{ ...c, replies: c.replies?.filter((r) => r.id !== commentId) }];
        }
        return [c];
      }),
    );
  };

  const handleDelete = async (commentId: string) => {
    if (!activeTeamId || deletingId) return;
    setDeletingId(commentId);
    setError(null);
    try {
      await apiDelete(`/teams/${activeTeamId}/comments/${commentId}`);
      removeCommentId(commentId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete message");
    } finally {
      setDeletingId(null);
    }
  };

  const displayError = error ?? loadError;

  return (
    <MentorShell title="Team Queries">
      <div className="grid gap-5 lg:grid-cols-[minmax(260px,320px)_1fr]">
        <aside className="flex flex-col rounded-2xl border border-brand-softline bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-sm font-bold text-brand-deep">
              <UsersIcon className="h-4 w-4 text-brand-primary" /> Your Teams
            </h2>
            <span className="rounded-full bg-brand-lightOrange px-2 py-0.5 text-[10px] font-bold text-brand-deep">
              {assignedTeams.length}
            </span>
          </div>

          {loading ? (
            <p className="mt-4 text-sm text-brand-muted">Loading teams…</p>
          ) : assignedTeams.length === 0 ? (
            <p className="mt-4 text-sm text-brand-muted">No teams assigned to you yet.</p>
          ) : (
            <nav className="mt-3 flex flex-col gap-1.5">
              {assignedTeams.map((row) => {
                const team = row.team;
                const selected = team.id === activeTeamId;
                const memberCount = row.team.members?.length ?? 0;
                return (
                  <button
                    key={team.id}
                    type="button"
                    onClick={() => setActiveTeamId(team.id)}
                    className={`flex flex-col gap-1 rounded-xl border px-3 py-2.5 text-left transition-all duration-150 ${
                      selected
                        ? "border-brand-primary bg-brand-lightOrange shadow-sm"
                        : "border-transparent bg-brand-cream hover:border-brand-sand hover:bg-brand-frost"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span className="truncate text-sm font-bold text-brand-deep">{team.name}</span>
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="rounded-lg border border-brand-warmBorder bg-white px-2 py-0.5 font-mono text-[10px] font-bold text-brand-deep">
                        {team.teamCode}
                      </span>
                      <span className="flex items-center gap-1 text-[11px] font-medium text-brand-muted">
                        <UsersIcon className="h-3 w-3" /> {memberCount}
                      </span>
                    </span>
                  </button>
                );
              })}
            </nav>
          )}
        </aside>

        <section className="flex h-[calc(100vh-8rem)] min-h-[480px] flex-col overflow-hidden rounded-2xl border border-brand-softline bg-white shadow-xs">
          {activeRow ? (
            <>
              <header className="flex shrink-0 flex-col gap-2 border-b border-brand-softline bg-[#FAF7F2]/40 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="truncate text-base font-bold text-brand-deep">{activeRow.team.name}</h2>
                    <span className="rounded-lg border border-brand-warmBorder bg-brand-lightOrange px-2 py-0.5 font-mono text-[11px] font-bold text-brand-deep">
                      {activeRow.team.teamCode}
                    </span>
                  </div>
                  {activeRow.team.problemStatement ? (
                    <p className="mt-1 flex items-center gap-1.5 truncate text-xs font-medium text-brand-muted">
                      <LockIcon className="h-3.5 w-3.5 shrink-0 text-brand-approved" />
                      <span className="truncate">{activeRow.team.problemStatement.title}</span>
                    </p>
                  ) : (
                    <span className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-brand-pending/10 px-2.5 py-0.5 text-[11px] font-bold text-brand-pending">
                      <LockIcon className="h-3 w-3" /> No locked problem statement yet
                    </span>
                  )}
                </div>
              </header>

              <div className="min-h-0 flex-1 space-y-4 overflow-y-scroll overscroll-contain px-5 py-4 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                {displayError ? <p className="text-sm font-semibold text-red-700">{displayError}</p> : null}

                {loadingComments ? (
                  <p className="text-sm text-brand-muted">Loading thread…</p>
                ) : flatComments.length === 0 ? (
                  <EmptyState
                    icon={<MessageIcon className="h-10 w-10" />}
                    heading="No queries yet"
                    description="Drop a note to this team — it appears in their dashboard comment thread instantly."
                  />
                ) : (
                  flatComments.map((c) => (
                    <div key={c.id} className="group relative">
                      <CommentBubble
                        comment={c}
                        leaderUserId={activeRow.team.leader?.id}
                        isReply={c.isReply}
                      />
                      {c.author?.id && c.author.id === session?.userId ? (
                        <button
                          type="button"
                          disabled={deletingId === c.id}
                          aria-label="Delete message"
                          title="Delete message"
                          onClick={() => handleDelete(c.id)}
                          className={`absolute top-0.5 rounded p-1 text-brand-muted opacity-70 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-40 sm:opacity-0 sm:group-hover:opacity-100 ${
                            isMentorMessage(c.author) ? "left-1" : "right-1"
                          }`}
                        >
                          <TrashIcon className="h-3.5 w-3.5" />
                        </button>
                      ) : null}
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} className="h-0" />
              </div>

              <form
                className="flex shrink-0 gap-2 border-t border-brand-softline bg-white px-4 py-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  void handleSend();
                }}
              >
                <input
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={`Reply to ${activeRow.team.name}…`}
                  disabled={busy}
                  className="flex-1 rounded-xl border border-brand-sand bg-white px-3 py-2.5 text-sm outline-none transition-colors focus:border-brand-primary disabled:opacity-60"
                />
                <button
                  type="submit"
                  disabled={busy || !message.trim()}
                  className="flex shrink-0 items-center gap-2 rounded-xl bg-brand-primary px-4 py-2.5 text-xs font-bold text-white transition-colors hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <SendIcon className="h-4 w-4" />
                  {busy ? "Sending…" : "Send Reply"}
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 p-6">
              <EmptyState
                icon={<InboxIcon className="h-10 w-10" />}
                heading="No team selected"
                description="Choose a team from the left to open its query thread."
              />
            </div>
          )}
        </section>
      </div>
    </MentorShell>
  );
}