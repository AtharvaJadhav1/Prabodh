"use client";

import MentorShell from "../../../../components/mentor/MentorShell";
import { useMentorRequests } from "../../../../components/mentor/MentorRequestProvider";
import { useMentorTeams } from "../../../../components/mentor/MentorTeamsProvider";
import GroupRequestMetricCards from "../../../../components/mentor/GroupRequestMetricCards";
import GroupRequestCard from "../../../../components/mentor/GroupRequestCard";
import GroupRequestEmptyState from "../../../../components/mentor/GroupRequestEmptyState";
import GroupRequestHistoryTable from "../../../../components/mentor/GroupRequestHistoryTable";

export default function GroupRequestsPage() {
  const {
    pendingRequests,
    requestHistory,
    pendingCount,
    acceptRequest,
    declineRequest,
    processingId,
    requestError,
    clearRequestError,
  } = useMentorRequests();
  const { psApprovalsCount } = useMentorTeams();

  return (
    <MentorShell title="Group Assignment Requests">
      <div className="mx-auto max-w-7xl space-y-6">
        <GroupRequestMetricCards pendingCount={pendingCount} psApprovalsCount={psApprovalsCount} />

        {/* Pending Requests */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-brand-deep">
              Pending Allocation Requests
              {pendingCount > 0 && (
                <span className="ml-2 inline-flex items-center justify-center rounded-full bg-brand-amber/10 px-2 py-0.5 text-xs font-bold text-brand-primary">
                  {pendingCount}
                </span>
              )}
            </h2>
          </div>

          {requestError ? (
            <div
              role="alert"
              className="flex items-start justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-700"
            >
              <span>{requestError}</span>
              <button type="button" onClick={clearRequestError} className="shrink-0 font-bold hover:underline">
                Dismiss
              </button>
            </div>
          ) : null}

          {pendingRequests.length === 0 ? (
            <GroupRequestEmptyState />
          ) : (
            <div className="space-y-4">
              {[...pendingRequests].map((req) => (
                  <GroupRequestCard
                    key={req.id}
                    request={req}
                    busy={processingId === req.id}
                    onAccept={acceptRequest}
                    onDecline={declineRequest}
                  />
                ))}
            </div>
          )}
        </div>

        {/* History */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-brand-deep">Response History</h2>
          <GroupRequestHistoryTable history={requestHistory} />
        </div>
      </div>
    </MentorShell>
  );
}
