"use client";

import { useState } from "react";
import type { GroupRequest } from "../../data/mentorDashboard";
import { mentorMaxCap } from "../../data/mentorDashboard";
import { UsersIcon, BriefcaseIcon, ExternalLinkIcon, FileTextIcon } from "../dashboard/icons";
import Avatar from "../Avatar";
import ConfirmDialog from "./ConfirmDialog";

type Props = {
  request: GroupRequest;
  atCap: boolean;
  busy?: boolean;
  onAccept: (id: string) => void;
  onDecline: (id: string) => void;
};

export default function GroupRequestCard({ request, atCap, busy = false, onAccept, onDecline }: Props) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmMode, setConfirmMode] = useState<"accept" | "decline">("accept");

  const handleAccept = () => {
    if (atCap || busy) return;
    setConfirmMode("accept");
    setConfirmOpen(true);
  };

  const handleDecline = () => {
    if (busy) return;
    setConfirmMode("decline");
    setConfirmOpen(true);
  };

  const handleConfirm = () => {
    if (confirmMode === "accept") onAccept(request.id);
    else onDecline(request.id);
    setConfirmOpen(false);
  };

  const trackBadge = (
      <span className="inline-flex items-center rounded-full border border-brand-sand bg-brand-cream px-2.5 py-0.5 text-[11px] font-bold text-brand-deep">
        {request.domains[0] ?? "Unassigned track"}
      </span>
    );

  return (
    <>
      <div className="rounded-xl border border-brand-sand bg-white p-5 shadow-sm transition-all hover:border-brand-primary/30 hover:shadow-md">
        {/* Header */}
        <div className="mb-3 flex flex-wrap items-center gap-2.5">
          <h3 className="text-base font-bold text-brand-deep">{request.teamName}</h3>
          <span className="rounded border border-brand-sand bg-brand-cream px-2 py-0.5 font-mono text-[11px] text-brand-muted">
            {request.groupId}
          </span>
          {trackBadge}
        </div>

        {/* Role + Leader + Allocated */}
        <div className="mb-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-brand-muted">
          <div className="flex items-center gap-1.5">
            <BriefcaseIcon className="h-3.5 w-3.5 text-brand-primary" />
            <span className="font-medium text-brand-deep">{request.allocatedRole}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Avatar src={request.leaderAvatarUrl || null} seed={request.leaderName || "leader"} className="h-5 w-5" />
            <span className="font-bold text-brand-deep">{request.leaderName}</span>
          </div>
          <span className="text-brand-muted">Allocated: {request.allocatedAt}</span>
        </div>

        {/* Meta Tags */}
        <div className="mb-3 flex flex-wrap items-center gap-2 text-[11px]">
          <span className="inline-flex items-center gap-1 rounded border border-brand-sand bg-brand-cream px-2 py-0.5 font-medium text-brand-deep">
            <UsersIcon className="h-3 w-3 text-brand-muted" />
            {request.memberCount} members
          </span>
          <span className="inline-flex items-center gap-1 rounded border border-brand-sand bg-brand-cream px-2 py-0.5 font-medium text-brand-deep">
            <BriefcaseIcon className="h-3 w-3 text-brand-muted" />
            {request.allocatedRole}
          </span>
          <span className="inline-flex items-center rounded border border-brand-sand bg-brand-cream px-2 py-0.5 font-medium text-brand-deep">
            {request.allocatedRole}
          </span>
        </div>

        {/* Problem Statement */}
        <p className="mb-1.5 text-xs font-bold text-brand-charcoal">
          {request.teamName}
        </p>

        {/* Domains */}
        <div className="mb-3 flex flex-wrap gap-1.5">
          {request.domains.map((d) => (
            <span key={d} className="rounded-full bg-brand-cream px-2.5 py-0.5 text-[11px] font-bold text-brand-deep">
              {d}
            </span>
          ))}
        </div>

        {/* Placeholder Links */}
        <div className="mb-3 flex items-center gap-4">
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-muted/60 cursor-not-allowed">
            <ExternalLinkIcon className="h-3.5 w-3.5" />
            View Team Profile
            <span className="ml-1 rounded bg-brand-sand px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-brand-muted/70">Coming soon</span>
          </span>
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-muted/60 cursor-not-allowed">
            <FileTextIcon className="h-3.5 w-3.5" />
            Download Synopsis
            <span className="ml-1 rounded bg-brand-sand px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-brand-muted/70">Coming soon</span>
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 border-t border-brand-sand pt-3">
          {atCap && (
            <p className="flex-1 text-xs font-medium text-brand-overdue">
              You&apos;ve reached your mentorship cap ({mentorMaxCap}/{mentorMaxCap}). Decline this request or ask the Nodal Admin to raise your limit.
            </p>
          )}
          <div className="flex shrink-0 items-center gap-2.5">
            <button
              type="button"
              onClick={handleDecline}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-xl border border-brand-overdue/30 bg-brand-overdue/10 px-4 py-2 text-xs font-bold text-brand-overdue transition-colors hover:bg-brand-overdue/20 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Decline
            </button>
            <button
              type="button"
              onClick={handleAccept}
              disabled={atCap || busy}
              className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold text-white transition-colors ${
                atCap || busy
                  ? "cursor-not-allowed bg-brand-muted/40"
                  : "bg-brand-deep shadow-xs hover:bg-brand-primary"
              }`}
            >
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Accept Mentorship
            </button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title={confirmMode === "accept" ? "Accept Group?" : "Decline Group?"}
        message={
          confirmMode === "accept"
            ? `Accept mentorship for ${request.teamName}? You'll be assigned as their ${request.allocatedRole}.`
            : `Decline request for ${request.teamName}? The Nodal Admin will reassign this group to another mentor.`
        }
        confirmLabel={confirmMode === "accept" ? "Accept" : "Decline"}
        confirmColor={confirmMode === "accept" ? "primary" : "danger"}
        onConfirm={handleConfirm}
        onCancel={() => setConfirmOpen(false)}
      />
    </>
  );
}
