import type { Metadata } from "next";
import EmptyState from "../../../../components/mentor/EmptyState";
import { UsersIcon } from "../../../../components/dashboard/icons";

export const metadata: Metadata = {
  title: "Teams",
};

export default function ExpertTeamsPage() {
  return (
    <div className="space-y-6">
      <EmptyState
        icon={<UsersIcon className="h-10 w-10" />}
        heading="Teams"
        description="Teams you are evaluating will appear here soon."
      />
    </div>
  );
}