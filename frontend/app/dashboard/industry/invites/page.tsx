"use client";

import IndustryShell from "../../../../components/industry/IndustryShell";
import InviteCard from "../../../../components/industry/InviteCard";
import InviteHistoryList from "../../../../components/industry/InviteHistoryList";
import { ErrorBanner, SkeletonRows } from "../../../../components/industry/LoadState";
import { useIndustryMentor } from "../../../../components/industry/IndustryMentorProvider";

export default function IndustryInvitesPage() {
  const { pendingInvites, inviteHistory, acceptInvite, declineInvite, isLoading, error, historyError, reload } =
    useIndustryMentor();

  return (
    <IndustryShell
      title="Mentorship Invites"
    >
      <div className="mx-auto max-w-7xl space-y-8">
        {error ? <ErrorBanner message={error} onRetry={() => void reload()} /> : null}

        <div className="space-y-4">
          <h2 className="text-lg font-bold text-brand-deep">
            Pending Invites
            {!isLoading && pendingInvites.length > 0 && (
              <span className="ml-2 inline-flex items-center justify-center rounded-full bg-brand-amber/10 px-2 py-0.5 text-xs font-bold text-brand-primary">
                {pendingInvites.length}
              </span>
            )}
          </h2>

          {isLoading ? (
            <SkeletonRows rows={2} label="Loading invites…" />
          ) : pendingInvites.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-brand-sand bg-brand-cream p-8 text-center">
              <p className="text-xs font-medium text-brand-muted">
                {error ? "Pending invites could not be loaded." : "No pending invites — you’re all caught up."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              {pendingInvites.map((inv) => (
                <InviteCard key={inv.id} invite={inv} onAccept={acceptInvite} onDecline={declineInvite} />
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <h2 className="text-lg font-bold text-brand-deep">Response History</h2>
          {historyError ? <ErrorBanner message={historyError} onRetry={() => void reload()} /> : null}
          {isLoading ? <SkeletonRows rows={2} label="Loading history…" /> : <InviteHistoryList history={inviteHistory} />}
        </div>
      </div>
    </IndustryShell>
  );
}
