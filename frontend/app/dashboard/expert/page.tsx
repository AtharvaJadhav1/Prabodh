"use client";

import EmptyState from "../../../components/mentor/EmptyState";
import { DashboardIcon } from "../../../components/dashboard/icons";
import { useAuth } from "../../../components/auth/AuthProvider";

export default function ExpertOverviewPage() {
  const { session, ready } = useAuth();
  const name = session?.fullName?.trim() || "Student Expert";

  if (!ready) {
    return <p className="text-sm text-brand-muted">Loading workspace…</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-bold tracking-tight text-brand-deep sm:text-3xl">
          Welcome, {name}
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-brand-muted">
          This is your Student Expert workspace. Use Teams to review assigned groups and Profile to
          keep your contact details up to date.
        </p>
      </div>
      <EmptyState
        icon={<DashboardIcon className="h-10 w-10" />}
        heading="Overview"
        description="Assigned teams and evaluation tools will appear here once an administrator allocates work to your account."
      />
    </div>
  );
}
