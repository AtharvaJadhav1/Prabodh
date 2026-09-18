"use client";

import { getUserAvatarUrl } from "../../lib/avatar";
import type { PortalComment, PortalCommentAuthor } from "../../lib/types";
import { initialsFrom } from "../auth/AuthProvider";

export function isMentorMessage(author?: PortalCommentAuthor | null): boolean {
  const role = author?.platformRole;
  return role === "institute_mentor" || role === "industry_mentor";
}

export function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const seconds = Math.max(0, (Date.now() - then) / 1000);
  const minutes = Math.floor(seconds / 60);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "yesterday";
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

type Props = {
  comment: PortalComment;
  leaderUserId?: string | null;
  isReply?: boolean;
};

export default function CommentBubble({ comment, leaderUserId, isReply }: Props) {
  const mentor = isMentorMessage(comment.author);
  const name = comment.author?.fullName ?? "Member";
  const time = relativeTime(comment.createdAt);
  const isLead = !mentor && comment.author?.id != null && comment.author.id === leaderUserId;

  const avatar = mentor ? (
    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-deep text-[10px] font-bold text-white">
      {initialsFrom(name)}
    </div>
  ) : (
    <img
      src={getUserAvatarUrl({
        id: comment.author?.id,
        email: comment.author?.email,
        fullName: comment.author?.fullName,
        avatarUrl: comment.author?.avatarUrl,
        profileJson: comment.author?.profileJson,
      })}
      alt={name}
      className="h-7 w-7 shrink-0 rounded-full border-2 border-white bg-brand-cream object-cover select-none shadow-sm"
    />
  );

  const pill = mentor ? (
    <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
      Faculty Mentor
    </span>
  ) : (
    <span
      className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ${
        isLead ? "bg-brand-primary/15 text-brand-primary" : "bg-brand-muted/10 text-brand-muted"
      }`}
    >
      {isLead ? "Team Lead" : "Team Member"}
    </span>
  );

  const bubbleClass = mentor
    ? "rounded-tr-sm border-[#C25E26]/20 bg-[#FAF7F2]"
    : "rounded-tl-sm border-brand-softline bg-white";

  return (
    <div className={`flex gap-2.5 ${mentor ? "flex-row-reverse" : ""} ${isReply ? "ml-7" : ""}`}>
      {avatar}
      <div className={`max-w-[78%] ${mentor ? "text-right" : ""}`}>
        <div className={`flex items-center gap-2 ${mentor ? "justify-end" : ""}`}>
          <span className="truncate text-xs font-bold text-brand-deep">{name}</span>
          {pill}
          <span className="shrink-0 text-[10px] font-medium text-brand-muted">{time}</span>
        </div>
        <div
          className={`mt-1 rounded-2xl border px-3.5 py-2 text-left text-sm text-brand-charcoal shadow-xs ${bubbleClass}`}
        >
          {comment.message}
        </div>
      </div>
    </div>
  );
}