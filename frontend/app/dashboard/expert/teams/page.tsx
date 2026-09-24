"use client";

import EmptyState from "../../../../components/mentor/EmptyState";
import { UsersIcon } from "../../../../components/dashboard/icons";
import { useAuth } from "../../../../components/auth/AuthProvider";

export default function ExpertTeamsPage() {
  const { ready } = useAuth();

  if (!ready) {
    return <p className="text-sm text-brand-muted">Loading teams…</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-bold tracking-tight text-brand-deep sm:text-3xl">Teams</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-brand-muted">
          Teams appear here when an administrator assigns them to your Student Expert account.
        </p>
      </div>
      <EmptyState
        icon={<UsersIcon className="h-10 w-10" />}
        heading="No teams assigned yet"
        description="Ask your nodal admin to allocate teams for review. Once assigned, they will show up in this list."
      />
    </div>
  );
}
