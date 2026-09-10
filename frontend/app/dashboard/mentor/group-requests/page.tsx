"use client";

import MentorShell from "../../../../components/mentor/MentorShell";
import { useMentorRequests } from "../../../../components/mentor/MentorRequestProvider";
import GroupRequestMetricCards from "../../../../components/mentor/GroupRequestMetricCards";
import GroupRequestCard from "../../../../components/mentor/GroupRequestCard";
import GroupRequestEmptyState from "../../../../components/mentor/GroupRequestEmptyState";
import GroupRequestHistoryTable from "../../../../components/mentor/GroupRequestHistoryTable";
import { mentorMaxCap } from "../../../../data/mentorDashboard";

export default function GroupRequestsPage() {
  const {
    pendingRequests,
    requestHistory,
    pendingCount,
    acceptedCount,
    atCapacity,
    domainMatchPercent,
    acceptRequest,
    declineRequest,
  } = useMentorRequests();

  return (
    <MentorShell
      breadcrumb={[
        { label: "SIH 2026 Portal" },
        { label: "Group Requests" },
      ]}
      title="Group Assignment Requests"
      subtitle="Review and accept or decline group allocation requests from the Nodal Admin."
      showActions={false}
    >
      <div className="mx-auto max-w-7xl space-y-6">
        <GroupRequestMetricCards
          pendingCount={pendingCount}
          acceptedCount={acceptedCount}
          domainMatchPercent={domainMatchPercent}
        />

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
            {atCapacity && (
              <span className="rounded-full border border-brand-overdue/30 bg-brand-overdue/10 px-3 py-1 text-xs font-bold text-brand-overdue">
                Capacity Full ({mentorMaxCap}/{mentorMaxCap})
              </span>
            )}
          </div>

          {pendingRequests.length === 0 ? (
            <GroupRequestEmptyState />
          ) : (
            <div className="space-y-4">
              {[...pendingRequests]
                .sort((a, b) => {
                  if (a.track === "Priority Track" && b.track !== "Priority Track") return -1;
                  if (a.track !== "Priority Track" && b.track === "Priority Track") return 1;
                  return 0;
                })
                .map((req) => (
                  <GroupRequestCard
                    key={req.id}
                    request={req}
                    atCap={atCapacity}
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
