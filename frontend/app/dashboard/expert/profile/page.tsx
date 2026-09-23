import type { Metadata } from "next";
import EmptyState from "../../../../components/mentor/EmptyState";
import { PersonIcon } from "../../../../components/dashboard/icons";

export const metadata: Metadata = {
  title: "Profile",
};

export default function ExpertProfilePage() {
  return (
    <div className="space-y-6">
      <EmptyState
        icon={<PersonIcon className="h-10 w-10" />}
        heading="Profile"
        description="Your profile details and preferences will appear here soon."
      />
    </div>
  );
}