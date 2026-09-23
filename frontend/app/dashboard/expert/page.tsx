import type { Metadata } from "next";
import EmptyState from "../../../components/mentor/EmptyState";
import { DashboardIcon } from "../../../components/dashboard/icons";

export const metadata: Metadata = {
  title: "Overview",
};

export default function ExpertOverviewPage() {
  return (
    <div className="space-y-6">
      <EmptyState
        icon={<DashboardIcon className="h-10 w-10" />}
        heading="Student Expert Portal"
        description="Welcome to your workspace. More tools and content will appear here as they are rolled out."
      />
    </div>
  );
}