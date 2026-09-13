"use client";

import { useEffect, useState } from "react";
import MentorShell from "../../../../components/mentor/MentorShell";
import { useMentorRequests } from "../../../../components/mentor/MentorRequestProvider";
import GroupRequestMetricCards from "../../../../components/mentor/GroupRequestMetricCards";
import GroupRequestCard from "../../../../components/mentor/GroupRequestCard";
import GroupRequestEmptyState from "../../../../components/mentor/GroupRequestEmptyState";
import GroupRequestHistoryTable from "../../../../components/mentor/GroupRequestHistoryTable";
import { mentorMaxCap } from "../../../../data/mentorDashboard";
import { api } from "../../../../lib/api";
import { useAuth } from "../../../../components/auth/AuthProvider";

type MentorTeamRow = {
  pendingInvite?: boolean;
  team: {
    problemStatement?: unknown;
    psPreferences?: Array<{ status: string }>;
  };
};

export default function GroupRequestsPage() {
  const { session } = useAuth();
  const {
    pendingRequests,
    requestHistory,
    pendingCount,
    atCapacity,
    acceptRequest,
    declineRequest,
  } = useMentorRequests();
  const [psApprovalsCount, setPsApprovalsCount] = useState(0);

  useEffect(() => {
    if (!session) return;
    api<MentorTeamRow[]>("/mentors/me/teams")
      .then((rows) => {
        const count = rows.filter(
          (row) =>
            !row.pendingInvite &&
            !row.team.problemStatement &&
            (row.team.psPreferences ?? []).some((p) => p.status === "submitted"),
        ).length;
        setPsApprovalsCount(count);
      })
      .catch(() => setPsApprovalsCount(0));
  }, [session]);

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
              {[...pendingRequests].map((req) => (
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
